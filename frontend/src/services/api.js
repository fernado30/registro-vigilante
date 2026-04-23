import { supabase } from "../lib/supabaseClient";

export const api = async (url, method = "GET", body = null) => {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`/api${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  return res.json();
};