import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import { api } from "../../services/api";
import {
  getTipoVisitaClass,
  getTipoVisitaLabel,
  getVigilanteName,
} from "../../utils/ingresos";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="search-shell__svg">
      <circle
        cx="11"
        cy="11"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16 16l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getTodayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value) {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sameCalendarDate(isoValue, dateValue) {
  if (!isoValue || !dateValue) return true;

  const value = new Date(isoValue);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}` === dateValue;
}

export default function Historial() {
  const { user, logout, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayValue());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("todos");

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await api("/ingresos");

      if (!active) return;

      setData(res.success && Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return data.filter((item) => {
      const type = `${item?.tipo_visita || ""}`.toLowerCase();
      const matchesDate = sameCalendarDate(item?.fecha_ingreso, selectedDate);
      const matchesType = selectedType === "todos" || type === selectedType;
      const haystack = [
        item?.nombre,
        item?.documento,
        item?.apartamento_destino,
        item?.placa_vehiculo,
        item?.vigilante,
        item?.tipo_visita,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || haystack.includes(query);

      return matchesDate && matchesType && matchesSearch;
    });
  }, [data, searchTerm, selectedDate, selectedType]);

  const activeTypes = useMemo(() => {
    const types = new Set();

    data.forEach((item) => {
      if (item?.tipo_visita) types.add(item.tipo_visita.toLowerCase());
    });

    return ["todos", ...Array.from(types)];
  }, [data]);

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
              <h1 className="brand__title">Historial</h1>
              <p className="brand__subtitle">{getVigilanteName(user)}</p>
            </div>
          </div>

          <div className="top-actions">
            {isAdmin ? (
              <button className="button button--ghost" onClick={() => navigate("/admin")}>
                Administrador
              </button>
            ) : null}
            <button className="button button--ghost" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
            <button className="button button--ghost" onClick={() => navigate("/ingresos")}>
              Nuevo ingreso
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

        <section className="panel history-panel fade-up">
          <div className="history-panel__header">
            <div>
              <h2 className="section-title">Historial de ingresos</h2>
              <p className="section-subtitle">
                Consulta entradas, salidas, placas, apartamentos y vigilante responsable.
              </p>
            </div>
            <div className="mini-note history-note">
              <strong>Fecha:</strong> {selectedDate}
              <span style={{ marginLeft: 12 }}>
                <strong>Registros:</strong> {filteredRows.length}
              </span>
            </div>
          </div>

          <div className="history-filters">
            <input
              className="input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <div className="search-shell history-search">
              <span className="search-shell__icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                className="search-shell__input"
                type="search"
                placeholder="Buscar nombre, doc, apto, placa o vigilante"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {activeTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "todos" ? "Todos los tipos" : getTipoVisitaLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="loading-state" style={{ marginTop: 20 }}>
              <span className="skeleton skeleton--lg" />
              <span className="skeleton skeleton--md" />
              <span className="skeleton skeleton--lg" />
              <span className="skeleton skeleton--sm" />
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="history-table-shell">
              <div className="history-table__meta">{filteredRows.length} registros</div>

              <table className="history-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Apto</th>
                    <th>Placa</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Vigilante</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((item, index) => (
                    <tr key={item.id || `${item.nombre}-${index}`}>
                      <td className="history-table__name">{item.nombre || "Sin nombre"}</td>
                      <td>{item.documento || "--"}</td>
                      <td>
                        <span className={getTipoVisitaClass(item.tipo_visita)}>
                          {getTipoVisitaLabel(item.tipo_visita)}
                        </span>
                      </td>
                      <td>{item.apartamento_destino || "--"}</td>
                      <td>{item.placa_vehiculo || "--"}</td>
                      <td>{formatTime(item.fecha_ingreso)}</td>
                      <td>
                        {item.estado === "salio" ? (
                          formatTime(item.hora_salida)
                        ) : (
                          <span className="status-tag status-tag--mint">Adentro</span>
                        )}
                      </td>
                      <td>{item.vigilante || "Sin asignar"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: 20 }}>
              No hay registros para los filtros seleccionados.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
