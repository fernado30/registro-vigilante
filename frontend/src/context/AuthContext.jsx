import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { AuthContext } from "./auth-context";
import { getVigilanteName } from "../utils/ingresos";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [vigilanteName, setVigilanteName] = useState("Sin asignar");

  const syncUserState = useCallback((nextUser) => {
    setUser(nextUser || null);

    const resolvedName = getVigilanteName(nextUser);

    if (resolvedName && resolvedName !== "Sin asignar") {
      localStorage.setItem("vigilante_name", resolvedName);
      setVigilanteName(resolvedName);
      return;
    }

    const savedName = localStorage.getItem("vigilante_name");
    setVigilanteName(savedName || "Sin asignar");
  }, []);

  const hydrateUser = useCallback(async (sessionUser = null) => {
    try {
      if (sessionUser?.id) {
        syncUserState(sessionUser);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        syncUserState(null);
        return;
      }

      const {
        data: { user: freshUser },
      } = await supabase.auth.getUser(session.access_token);

      syncUserState(freshUser || session.user || null);
    } finally {
      setAuthReady(true);
    }
  }, [syncUserState]);

  useEffect(() => {
    hydrateUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session?.access_token) {
        syncUserState(null);
        setAuthReady(true);
        return;
      }

      await hydrateUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [hydrateUser, syncUserState]);

  const login = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.data?.user) {
      syncUserState(result.data.user);
    }

    return result;
  };

  const register = async ({ email, password, fullName }) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "vigilante",
        },
      },
    });

    if (fullName?.trim()) {
      localStorage.setItem("vigilante_name", fullName.trim());
      setVigilanteName(fullName.trim());
    }

    if (result.data?.user) {
      syncUserState(result.data.user);
    }

    return result;
  };

  const logout = async () => {
    localStorage.removeItem("vigilante_name");
    syncUserState(null);
    setAuthReady(true);

    try {
      await supabase.auth.signOut();
    } catch {
      // Si Supabase tarda o falla, la UI ya salió al login inmediatamente.
    }
  };

  return (
    <AuthContext.Provider value={{ user, vigilanteName, authReady, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
