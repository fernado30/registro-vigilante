import { useState, useContext } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import { getVigilanteName } from "../../utils/ingresos";

export default function Ingresos() {
  const { user, vigilanteName: sessionVigilanteName, authReady, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const vigilanteName = authReady ? sessionVigilanteName || getVigilanteName(user) : "Cargando...";
  const currentTime = new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const [form, setForm] = useState({
    nombre: "",
    documento: "",
    apartamento_destino: "",
    tipo_visita: "visitante",
    tiene_vehiculo: "no",
    placa_vehiculo: "",
    tipo_vehiculo: "carro",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      vigilante: vigilanteName,
      tiene_vehiculo: form.tiene_vehiculo === "si",
      placa_vehiculo: form.tiene_vehiculo === "si" ? form.placa_vehiculo : "",
      tipo_vehiculo: form.tiene_vehiculo === "si" ? form.tipo_vehiculo : "",
    };

    const res = await api("/ingresos", "POST", payload);

    setSaving(false);

    if (res.success) {
      alert("Ingreso registrado con exito.");
      setForm({
        nombre: "",
        documento: "",
        apartamento_destino: "",
        tipo_visita: "visitante",
        tiene_vehiculo: "no",
        placa_vehiculo: "",
        tipo_vehiculo: "carro",
      });
    } else {
      alert(res.error);
    }
  };

  return (
    <main className="app-page">
      <div className="app-page__backdrop" aria-hidden="true">
        <span className="app-page__orb app-page__orb--one" />
        <span className="app-page__orb app-page__orb--two" />
        <span className="app-page__orb app-page__orb--three" />
      </div>

      <div className="page-shell">
        <header className="page-header">
          <div className="brand">
            <div className="brand__mark">V</div>
            <div>
              <h1 className="brand__title">Registrar ingreso</h1>
              <p className="brand__subtitle">Formulario moderno con tonos suaves</p>
            </div>
          </div>

          <div className="top-actions">
            <button className="button button--ghost" onClick={() => navigate("/historial")}>
              Ver historial
            </button>
            <button className="button button--ghost" onClick={() => navigate("/dashboard")}>
              Volver al dashboard
            </button>
            <button
              className="button button--soft"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              Cerrar sesion
            </button>
          </div>
        </header>

        <section className="form-layout">
          <article className="panel form-panel fade-up">
            <div className="form-legend">
              <h2 className="section-title">Nuevo registro</h2>
              <p className="section-subtitle">
                Completa los datos del visitante, domiciliario o proveedor.
              </p>
              <div className="mini-note" style={{ marginTop: 14 }}>
                <strong>Vigilante:</strong> {vigilanteName}
                <span style={{ marginLeft: 12 }}>
                  <strong>Hora:</strong> {currentTime}
                </span>
              </div>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field-group">
                  <label className="field-label" htmlFor="nombre">
                    Nombre completo
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    placeholder="Ej. Juan Perez"
                    value={form.nombre}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="documento">
                    Cedula / Documento
                  </label>
                  <input
                    id="documento"
                    name="documento"
                    placeholder="1.023.456.789"
                    value={form.documento}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="tipo_visita">
                    Tipo de visita
                  </label>
                  <select
                    id="tipo_visita"
                    name="tipo_visita"
                    value={form.tipo_visita}
                    onChange={handleChange}
                    className="select"
                  >
                    <option value="visitante">Visitante</option>
                    <option value="domicilio">Domicilio</option>
                    <option value="proveedor">Proveedor</option>
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="apartamento_destino">
                    Apartamento destino
                  </label>
                  <input
                    id="apartamento_destino"
                    name="apartamento_destino"
                    placeholder="301 - Torre B"
                    value={form.apartamento_destino}
                    onChange={handleChange}
                    className="input"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="tiene_vehiculo">
                    Tiene vehiculo?
                  </label>
                  <select
                    id="tiene_vehiculo"
                    name="tiene_vehiculo"
                    value={form.tiene_vehiculo}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((current) => ({
                        ...current,
                        tiene_vehiculo: value,
                        placa_vehiculo: value === "si" ? current.placa_vehiculo : "",
                        tipo_vehiculo: value === "si" ? current.tipo_vehiculo : "carro",
                      }));
                    }}
                    className="select"
                  >
                    <option value="no">No</option>
                    <option value="si">Si</option>
                  </select>
                </div>

                {form.tiene_vehiculo === "si" ? (
                  <>
                    <div className="field-group">
                      <label className="field-label" htmlFor="placa_vehiculo">
                        Placa del vehiculo
                      </label>
                      <input
                        id="placa_vehiculo"
                        name="placa_vehiculo"
                        placeholder="ABC123"
                        value={form.placa_vehiculo}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="tipo_vehiculo">
                        Tipo de vehiculo
                      </label>
                      <select
                        id="tipo_vehiculo"
                        name="tipo_vehiculo"
                        value={form.tipo_vehiculo}
                        onChange={handleChange}
                        className="select"
                      >
                        <option value="carro">Carro</option>
                        <option value="moto">Moto</option>
                        <option value="bicicleta">Bicicleta</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                  </>
                ) : null}
              </div>

              <button className="button button--primary" type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar ingreso"}
              </button>
            </form>
          </article>
        </section>
      </div>
    </main>
  );
}
