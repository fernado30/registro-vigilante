import { getSupabaseAdmin } from "../lib/supabaseClient.js";

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

const isMissingColumnError = (error, columnName) => {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return isSchemaError(error) && message.includes(columnName.toLowerCase());
};

export const getIngresos = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ingresos')
    .select('*')
    .order("fecha_ingreso", { ascending: false });
  if(error) throw error;
  return data;
};

export const createIngreso = async (ingresoData) => {
  const supabase = getSupabaseAdmin();
  const hasVehicle =
    ingresoData.tiene_vehiculo === true ||
    ingresoData.tiene_vehiculo === "si" ||
    ingresoData.tiene_vehiculo === "true";

  const buildPayload = (includeVigilante = true) => {
    const payload = {
      ...ingresoData,
      tiene_vehiculo: hasVehicle,
      placa_vehiculo: hasVehicle ? ingresoData.placa_vehiculo ?? null : null,
      tipo_vehiculo: hasVehicle ? ingresoData.tipo_vehiculo ?? null : null,
      estado: "adentro",
      hora_salida: null,
      fecha_ingreso: new Date().toISOString(),
    };

    if (!includeVigilante) {
      delete payload.vigilante;
    }

    return payload;
  };

  let { data, error } = await supabase
    .from('ingresos')
    .insert([buildPayload(true)]);

  if (isMissingColumnError(error, "vigilante")) {
    ({ data, error } = await supabase
      .from("ingresos")
      .insert([buildPayload(false)]));
  }

  if(error) throw error;
  return data;
};

export const registrarSalida = async (id) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ingresos")
    .update({
      estado: "salio",
      hora_salida: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
};
