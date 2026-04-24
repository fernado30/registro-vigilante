import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/auth-context";
import "./App.css";

import Login from "./pages/Login/Login";
import Ingresos from "./pages/Ingresos/Ingresos";
import Dashboard from "./pages/Dashboard/Dashboard";
import Historial from "./pages/Historial/Historial";
import Admin from "./pages/Admin/Admin";
import PagoAdministracion from "./pages/PagoAdministracion/PagoAdministracion";
import Reportes from "./pages/Reportes/Reportes";

function PrivateRoute({ children, adminOnly = false }) {
  const { user, authReady, isAdmin } = useContext(AuthContext);

  if (!authReady) {
    return <div className="route-loading">Cargando sesion...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const { user, authReady, isAdmin } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            !authReady ? (
              <div className="route-loading">Cargando sesion...</div>
            ) : !user ? (
              <Login />
            ) : (
              <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/ingresos"
          element={
            <PrivateRoute>
              <Ingresos />
            </PrivateRoute>
          }
        />
        <Route
          path="/historial"
          element={
            <PrivateRoute>
              <Historial />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute adminOnly>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route
          path="/pagos-administracion"
          element={
            <PrivateRoute adminOnly>
              <PagoAdministracion />
            </PrivateRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <PrivateRoute adminOnly>
              <Reportes />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
