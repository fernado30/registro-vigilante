import { supabase } from "../lib/supabaseClient";

export const api = async (url, method = "GET", body = null) => {
  let session = null;

  try {
    const result = await supabase.auth.getSession();
    session = result?.data?.session || null;
  } catch (error) {
    return {
      success: false,
      error: error?.message || "No se pudo leer la sesion de autenticacion.",
    };
  }

  try {
    const res = await fetch(`/api${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: body ? JSON.stringify(body) : null,
    });

    const contentType = res.headers.get("content-type") || "";
    let payload = {};

    if (contentType.includes("application/json")) {
      payload = await res.json();
    } else {
      const text = await res.text();
      payload = text ? { error: text } : {};
    }

    if (!res.ok) {
      return {
        success: false,
        error: payload?.error || `Error HTTP ${res.status}`,
        status: res.status,
      };
    }

    return payload;
  } catch (error) {
    return {
      success: false,
      error: error?.message || "No se pudo conectar con la API.",
    };
  }
};
