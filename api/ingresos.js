function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan variables de entorno del backend: SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
  };
}

const missingTableMessage =
  "La tabla public.ingresos no existe o la cache de PostgREST no se ha refrescado. Ejecuta create_ingresos_table.sql en Supabase y luego NOTIFY pgrst, 'reload schema';";

const missingSchemaMessage =
  "Falta aplicar el SQL de ingresos en Supabase. Ejecuta create_ingresos_table.sql para crear la tabla y las columnas nuevas, y luego NOTIFY pgrst, 'reload schema';";

const isSchemaError = (error) => {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return (
    error?.code === "PGRST205" ||
    error?.code === "PGRST204" ||
    message.includes("does not exist") ||
    (message.includes("column") && message.includes("not exist"))
  );
};

const isMissingColumnError = (error, columnName) => {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return isSchemaError(error) && message.includes(columnName.toLowerCase());
};

const buildIngresoPayload = ({
  nombre,
  documento,
  apartamento_destino,
  tipo_visita,
  vigilante,
  hasVehicle,
  safePlaca,
  safeTipoVehiculo,
  includeVigilante = true,
}) => {
  const payload = {
    nombre,
    documento,
    apartamento_destino,
    tipo_visita,
    tiene_vehiculo: hasVehicle,
    placa_vehiculo: safePlaca,
    tipo_vehiculo: safeTipoVehiculo,
    estado: "adentro",
    hora_salida: null,
    fecha_ingreso: new Date().toISOString(),
  };

  if (includeVigilante) {
    payload.vigilante = vigilante?.trim() || "Sin asignar";
  }

  return payload;
};

async function supabaseRequest(path, { method = "GET", body = null } = {}) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      ...(body !== null
        ? {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          }
        : {}),
    },
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { ok, status, payload } = await supabaseRequest(
        "/rest/v1/ingresos?select=*&order=fecha_ingreso.desc"
      );

      if (!ok) {
        const errorText =
          typeof payload === "string"
            ? payload
            : payload?.message || payload?.hint || JSON.stringify(payload);
        if (String(errorText).toLowerCase().includes("does not exist")) {
          throw new Error(missingTableMessage);
        }
        throw new Error(errorText || `Supabase GET failed with status ${status}`);
      }

      return res.status(200).json({
        success: true,
        data: Array.isArray(payload) ? payload : [],
      });
    }

    if (req.method === "POST") {
      const {
        nombre,
        documento,
        apartamento_destino,
        tipo_visita,
        vigilante,
        tiene_vehiculo,
        placa_vehiculo,
        tipo_vehiculo,
      } = req.body;

      const hasVehicle =
        tiene_vehiculo === true || tiene_vehiculo === "si" || tiene_vehiculo === "true";
      const safePlaca = hasVehicle ? placa_vehiculo || null : null;
      const safeTipoVehiculo = hasVehicle ? tipo_vehiculo || null : null;

      const primaryPayload = buildIngresoPayload({
        nombre,
        documento,
        apartamento_destino,
        tipo_visita,
        vigilante,
        hasVehicle,
        safePlaca,
        safeTipoVehiculo,
      });

      let { ok, status, payload } = await supabaseRequest("/rest/v1/ingresos", {
        method: "POST",
        body: primaryPayload,
      });

      if (!ok && isMissingColumnError(payload, "vigilante")) {
        const fallbackPayload = buildIngresoPayload({
          nombre,
          documento,
          apartamento_destino,
          tipo_visita,
          vigilante,
          hasVehicle,
          safePlaca,
          safeTipoVehiculo,
          includeVigilante: false,
        });

        ({ ok, status, payload } = await supabaseRequest("/rest/v1/ingresos", {
          method: "POST",
          body: fallbackPayload,
        }));
      }

      if (!ok) {
        const errorText =
          typeof payload === "string"
            ? payload
            : payload?.message || payload?.hint || JSON.stringify(payload);
        if (isSchemaError(payload)) throw new Error(missingSchemaMessage);
        throw new Error(errorText || `Supabase POST failed with status ${status}`);
      }

      return res.status(201).json({
        success: true,
        data: Array.isArray(payload) ? payload : payload,
      });
    }

    if (req.method === "PATCH") {
      const { id } = req.body;
      const ingresoId = Number(id);

      if (!ingresoId) {
        return res.status(400).json({
          success: false,
          error: "Debes enviar el id del ingreso.",
        });
      }

      const { ok: findOk, status: findStatus, payload: findPayload } = await supabaseRequest(
        `/rest/v1/ingresos?id=eq.${ingresoId}&select=id,estado,hora_salida`
      );

      if (!findOk) {
        const errorText =
          typeof findPayload === "string"
            ? findPayload
            : findPayload?.message || findPayload?.hint || JSON.stringify(findPayload);
        if (isSchemaError(findPayload)) throw new Error(missingSchemaMessage);
        throw new Error(errorText || `Supabase GET failed with status ${findStatus}`);
      }

      const current = Array.isArray(findPayload) ? findPayload[0] : null;

      if (!current) {
        return res.status(404).json({
          success: false,
          error: "No se encontro el ingreso solicitado.",
        });
      }

      if (current.estado === "salio") {
        return res.status(200).json({
          success: true,
          data: current,
        });
      }

      const { ok, status, payload } = await supabaseRequest(
        `/rest/v1/ingresos?id=eq.${ingresoId}`,
        {
          method: "PATCH",
          body: {
            estado: "salio",
            hora_salida: new Date().toISOString(),
          },
        }
      );

      if (!ok) {
        const errorText =
          typeof payload === "string"
            ? payload
            : payload?.message || payload?.hint || JSON.stringify(payload);
        if (isSchemaError(payload)) throw new Error(missingSchemaMessage);
        throw new Error(errorText || `Supabase PATCH failed with status ${status}`);
      }

      return res.status(200).json({
        success: true,
        data: Array.isArray(payload) ? payload[0] || null : payload,
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
