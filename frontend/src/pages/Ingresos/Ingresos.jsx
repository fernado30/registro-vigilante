import { useEffect, useMemo, useState, useContext } from "react";
import { api } from "../../services/api";
import { AuthContext } from "../../context/auth-context";
import { getVigilanteName } from "../../utils/ingresos";
import AppShell from "../../components/AppShell";

function normalizeDocument(value) {
  return `${value || ""}`.replace(/\D/g, "");
}

function formatIngresoDateTime(value) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function Ingresos() {
  const {
    user,
    vigilanteName: sessionVigilanteName,
    authReady,
  } = useContext(AuthContext);
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
  const [ingresosHistoricos, setIngresosHistoricos] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadIngresosHistoricos = async () => {
      try {
        const res = await api("/ingresos", "GET");

        if (!isMounted) return;

        if (res.success) {
          setIngresosHistoricos(Array.isArray(res.data) ? res.data : []);
        } else {
          setIngresosHistoricos([]);
        }
      } catch {
        if (!isMounted) return;

        setIngresosHistoricos([]);
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    loadIngresosHistoricos();

    return () => {
      isMounted = false;
    };
  }, []);

  const documentoNormalizado = normalizeDocument(form.documento);

  const historialDocumento = useMemo(() => {
    if (!documentoNormalizado) return [];

    return ingresosHistoricos.filter(
      (item) => normalizeDocument(item.documento) === documentoNormalizado
    );
  }, [documentoNormalizado, ingresosHistoricos]);

  const ultimoIngresoPrevio = historialDocumento[0] || null;
  const mostrarTarjetaHistorial = !historyLoading && Boolean(ultimoIngresoPrevio);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        vigilante: vigilanteName,
        tiene_vehiculo: form.tiene_vehiculo === "si",
        placa_vehiculo: form.tiene_vehiculo === "si" ? form.placa_vehiculo : "",
        tipo_vehiculo: form.tiene_vehiculo === "si" ? form.tipo_vehiculo : "",
      };

      const res = await api("/ingresos", "POST", payload);

      if (res.success) {
        alert("Ingreso registrado con exito.");
        const nuevoIngreso = Array.isArray(res.data) ? res.data[0] : res.data;

        setForm({
          nombre: "",
          documento: "",
          apartamento_destino: "",
          tipo_visita: "visitante",
          tiene_vehiculo: "no",
          placa_vehiculo: "",
          tipo_vehiculo: "carro",
        });

        if (nuevoIngreso) {
          setIngresosHistoricos((current) => [
            nuevoIngreso,
            ...current.filter((item) => item.id !== nuevoIngreso.id),
          ]);
        }
      } else {
        alert(res.error);
      }
    } catch (error) {
      alert(error.message || "No se pudo registrar el ingreso.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
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
          </header>

          <section className={`form-layout ${mostrarTarjetaHistorial ? "form-layout--with-side" : "form-layout--solo"}`}>
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

              <form id="ingreso-form" className="form" onSubmit={handleSubmit}>
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

            {mostrarTarjetaHistorial ? (
              <aside className="panel form-panel form-history-card fade-up">
                <div className="form-history-card__header">
                  <div>
                    <span className="form-history-card__eyebrow">Historial detectado</span>
                    <h2 className="section-title">Ya estuvo registrado</h2>
                    <p className="section-subtitle">
                      El documento coincide con ingresos anteriores. Puedes revisar el ultimo
                      movimiento y registrar una nueva entrada.
                    </p>
                  </div>

                  <span className="status-tag status-tag--mint">Coincidencia</span>
                </div>

                <div className="form-history-card__person">
                  <strong>{ultimoIngresoPrevio.nombre || "Sin nombre registrado"}</strong>
                  <span>{ultimoIngresoPrevio.documento || "Sin documento"}</span>
                </div>

                <div className="form-history-card__meta">
                  <div>
                    <span>Ultimo ingreso</span>
                    <strong>{formatIngresoDateTime(ultimoIngresoPrevio.fecha_ingreso)}</strong>
                  </div>
                  <div>
                    <span>Vigilante</span>
                    <strong>{ultimoIngresoPrevio.vigilante || "Sin asignar"}</strong>
                  </div>
                  <div>
                    <span>Estado</span>
                    <strong>{ultimoIngresoPrevio.estado === "salio" ? "Salio" : "Adentro"}</strong>
                  </div>
                  <div>
                    <span>Veces registrado</span>
                    <strong>{historialDocumento.length}</strong>
                  </div>
                </div>

                <div className="form-history-card__route">
                  <span className="form-history-card__route-label">Apartamento</span>
                  <strong>{ultimoIngresoPrevio.apartamento_destino || "Sin apartamento"}</strong>
                </div>

                <button
                  type="submit"
                  form="ingreso-form"
                  className="button button--primary form-history-card__action"
                  disabled={saving}
                >
                  {saving ? "Registrando..." : "Registrar entrada"}
                </button>
              </aside>
            ) : null}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
