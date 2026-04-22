import { useState, useContext } from "react";
import { AuthContext } from "../../context/auth-context";
import { useNavigate } from "react-router-dom";

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="login-card__icon"
    >
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 13.2v2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Login() {
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "register") {
      const { data, error } = await register({
        email,
        password,
        fullName,
      });

      setLoading(false);

      if (error) {
        alert(error.message);
        return;
      }

      if (data?.session) {
        alert("Vigilante registrado con exito.");
        navigate("/dashboard");
        return;
      }

      alert("Vigilante registrado. Revisa tu correo para confirmar la cuenta si Supabase lo solicita.");
      setMode("login");
      return;
    }

    const { error } = await login(email, password);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <main className="login-page">
      <div className="login-page__bg" aria-hidden="true">
        <span className="login-page__orb login-page__orb--one" />
        <span className="login-page__orb login-page__orb--two" />
        <span className="login-page__orb login-page__orb--three" />
        <span className="login-page__grid" />
      </div>

      <section className="login-shell">
        <article className="login-card">
          <div className="login-card__header">
            <div className="login-card__badge">
              <LockIcon />
            </div>
            <h1 className="login-card__title">PortalSeguro</h1>
            <p className="login-card__subtitle">
              Acceso exclusivo para vigilantes
            </p>
          </div>

          <div className="login-switch" role="tablist" aria-label="Acceso y registro">
            <button
              type="button"
              className={`login-switch__button ${mode === "login" ? "login-switch__button--active" : ""}`}
              onClick={() => setMode("login")}
            >
              Ingresar
            </button>
            <button
              type="button"
              className={`login-switch__button ${mode === "register" ? "login-switch__button--active" : ""}`}
              onClick={() => setMode("register")}
            >
              Registrar vigilante
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <div className="field-group field-group--compact">
                <label className="field-label field-label--light" htmlFor="fullName">
                  Nombre completo
                </label>
                <input
                  id="fullName"
                  className="login-input"
                  type="text"
                  placeholder="Ej. Carlos Gomez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            ) : null}

            <div className="field-group field-group--compact">
              <label className="field-label field-label--light" htmlFor="email">
                Correo
              </label>
              <input
                id="email"
                className="login-input"
                type="email"
                placeholder="vigilante@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-group field-group--compact">
              <label className="field-label field-label--light" htmlFor="password">
                Contrasena
              </label>
              <input
                id="password"
                className="login-input"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="login-info">
              <span className="login-info__label">Conjunto:</span>
              <span className="login-info__value">Residencial Los Pinos</span>
            </div>

            <button className="login-button" type="submit" disabled={loading}>
              {loading
                ? mode === "register"
                  ? "Registrando..."
                  : "Ingresando..."
                : mode === "register"
                  ? "Registrar vigilante"
                  : "Ingresar al sistema"}
            </button>

            <p className="login-help">
              {mode === "register"
                ? "Crea el vigilante con su nombre real para que aparezca correctamente en el historial."
                : "Si tiene problemas para ingresar, contacte administracion."}
            </p>
          </form>
        </article>
      </section>
    </main>
  );
}
