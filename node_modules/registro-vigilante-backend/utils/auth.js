import { createClient } from "@supabase/supabase-js";

export const verifyUser = async (req) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) throw new Error("No autorizado");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Token inválido");
  }

  return data.user;
};