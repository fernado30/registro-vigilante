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
  "La tabla public.turnos no existe o la cache de PostgREST no se ha refrescado. Ejecuta create_turnos_table.sql en Supabase y luego NOTIFY pgrst, 'reload schema';";

const isSchemaError = (error) => {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return (
    error?.code === "PGRST205" ||
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    message.includes("does not exist") ||
    (message.includes("column") && message.includes("not exist"))
  );
};

const normalizeTurnoPayload = (body) => ({
  vigilante: body.vigilante?.trim() || "Sin asignar",
  fecha: body.fecha_inicio || body.fecha || body.fechaInicio || body.fechaFin,
  fecha_fin: body.fecha_fin || body.fechaFin || body.fechaInicio || body.fecha_inicio || body.fecha,
  hora_inicio: body.hora_inicio,
  hora_fin: body.hora_fin,
  puesto: body.puesto?.trim() || "Porteria principal",
  observaciones: body.observaciones?.trim() || "",
  status: body.status || "programado",
  updated_at: new Date().toISOString(),
});

const isValidIsoDate = (value) => {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const isValidTime = (value) => {
  if (typeof value !== "string") return false;
  return /^\d{2}:\d{2}$/.test(value);
};

const isValidDateRange = (start, end) => {
  if (!isValidIsoDate(start) || !isValidIsoDate(end)) return false;
  return end >= start;
};

export default async function handler(req, res) {
  try {
    const supabase = getSupabaseAdmin();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("turnos")
        .select("*")
        .order("fecha", { ascending: true })
        .order("fecha_fin", { ascending: true })
        .order("hora_inicio", { ascending: true });

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
      const payload = normalizeTurnoPayload(req.body || {});

      if (!payload.vigilante || !payload.fecha || !payload.fecha_fin || !payload.hora_inicio || !payload.hora_fin) {
        return res.status(400).json({
          success: false,
          error: "Debes enviar vigilante, fecha_inicio, fecha_fin, hora_inicio y hora_fin.",
        });
      }

      if (
        !isValidDateRange(payload.fecha, payload.fecha_fin) ||
        !isValidTime(payload.hora_inicio) ||
        !isValidTime(payload.hora_fin)
      ) {
        return res.status(400).json({
          success: false,
          error: "Las fechas deben tener formato YYYY-MM-DD, el rango ser válido y las horas formato HH:MM.",
        });
      }

      const { data, error } = await supabase
        .from("turnos")
        .insert([payload])
        .select("*")
        .single();

      if (error) {
        if (isSchemaError(error)) throw new Error(missingTableMessage);
        throw error;
      }

      return res.status(201).json({
        success: true,
        data,
      });
    }

    if (req.method === "PATCH") {
      const { id, ...rest } = req.body || {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Debes enviar el id del turno.",
        });
      }

      const payload = normalizeTurnoPayload(rest);

      if (!payload.vigilante || !payload.fecha || !payload.fecha_fin || !payload.hora_inicio || !payload.hora_fin) {
        return res.status(400).json({
          success: false,
          error: "Debes enviar vigilante, fecha_inicio, fecha_fin, hora_inicio y hora_fin.",
        });
      }

      if (
        !isValidDateRange(payload.fecha, payload.fecha_fin) ||
        !isValidTime(payload.hora_inicio) ||
        !isValidTime(payload.hora_fin)
      ) {
        return res.status(400).json({
          success: false,
          error: "Las fechas deben tener formato YYYY-MM-DD, el rango ser válido y las horas formato HH:MM.",
        });
      }

      const { data: existing, error: findError } = await supabase
        .from("turnos")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (findError) throw findError;

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: "No se encontro el turno solicitado.",
        });
      }

      const { data, error } = await supabase
        .from("turnos")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        if (isSchemaError(error)) throw new Error(missingTableMessage);
        throw error;
      }

      return res.status(200).json({
        success: true,
        data,
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Debes enviar el id del turno.",
        });
      }

      const { data: existing, error: findError } = await supabase
        .from("turnos")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (findError) throw findError;

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: "No se encontro el turno solicitado.",
        });
      }

      const { data, error } = await supabase
        .from("turnos")
        .delete()
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        if (isSchemaError(error)) throw new Error(missingTableMessage);
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
