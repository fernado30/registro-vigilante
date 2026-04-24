/* global process */
import { createClient } from "@supabase/supabase-js";

let adminClient = null;

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan variables de entorno del backend: SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey);
  }

  return adminClient;
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
    pago_administracion: false,
    fecha_pago_administracion: null,
    fecha_ingreso: new Date().toISOString(),
  };

  if (includeVigilante) {
    payload.vigilante = vigilante?.trim() || "Sin asignar";
  }

  return payload;
};

export default async function handler(req, res) {
  try {
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("ingresos")
        .select("*")
        .order("fecha_ingreso", { ascending: false });

      if (error) {
        if (isSchemaError(error)) throw new Error(missingTableMessage);
        throw error;
      }

      return res.status(200).json({
        success: true,
        data,
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

      let { data, error } = await supabase.from("ingresos").insert([primaryPayload]);

      if (isMissingColumnError(error, "vigilante")) {
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

        ({ data, error } = await supabase.from("ingresos").insert([fallbackPayload]));
      }

      if (error) {
        if (isSchemaError(error)) throw new Error(missingSchemaMessage);
        throw error;
      }

      return res.status(201).json({
        success: true,
        data,
      });
    }

    if (req.method === "PATCH") {
      const { id } = req.body;
      const ingresoId = Number(id);
      const hasPagoAdministracion = Object.prototype.hasOwnProperty.call(
        req.body,
        "pago_administracion"
      );

      if (!ingresoId) {
        return res.status(400).json({
          success: false,
          error: "Debes enviar el id del ingreso.",
        });
      }

      const { data: current, error: findError } = await supabase
        .from("ingresos")
        .select("id, estado, hora_salida, pago_administracion, fecha_pago_administracion")
        .eq("id", ingresoId)
        .maybeSingle();

      if (findError) throw findError;

      if (!current) {
        return res.status(404).json({
          success: false,
          error: "No se encontro el ingreso solicitado.",
        });
      }

      if (hasPagoAdministracion) {
        const pagoAdministracion =
          req.body.pago_administracion === true ||
          req.body.pago_administracion === "true" ||
          req.body.pago_administracion === 1 ||
          req.body.pago_administracion === "1";

        if (current.pago_administracion === pagoAdministracion) {
          return res.status(200).json({
            success: true,
            data: current,
          });
        }

        const { data, error } = await supabase
          .from("ingresos")
          .update({
            pago_administracion: pagoAdministracion,
            fecha_pago_administracion: pagoAdministracion ? new Date().toISOString() : null,
          })
          .eq("id", ingresoId)
          .select("*")
          .single();

        if (error) {
          if (isSchemaError(error)) throw new Error(missingSchemaMessage);
          throw error;
        }

        return res.status(200).json({
          success: true,
          data,
        });
      }

      if (current.estado === "salio") {
        return res.status(200).json({
          success: true,
          data: current,
        });
      }

      const { data, error } = await supabase
        .from("ingresos")
        .update({
          estado: "salio",
          hora_salida: new Date().toISOString(),
        })
        .eq("id", ingresoId)
        .select("*")
        .single();

      if (error) {
        if (isSchemaError(error)) throw new Error(missingSchemaMessage);
        throw error;
      }

      return res.status(200).json({
        success: true,
        data,
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
