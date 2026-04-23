import { useEffect, useMemo, useState, useContext } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import { getTipoVisitaClass, getTipoVisitaLabel } from "../../utils/ingresos";

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

function getInitials(name) {
  return (name || "??")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatTime(value) {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Dashboard() {
  const { logout, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadIngresos = async () => {
    setLoading(true);
    const res = await api("/ingresos");

    setData(res.success && Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

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

  const stats = useMemo(() => {
    const today = new Date();
    const todayKey = today.toDateString();
    const uniqueApartments = new Set();

    const todayCount = data.filter((item) => {
      if (!item?.fecha_ingreso) return false;
      return new Date(item.fecha_ingreso).toDateString() === todayKey;
    }).length;

    const vehiclesActive = data.filter((item) => {
      const hasVehicle = item?.tiene_vehiculo === true || item?.tiene_vehiculo === "true";
      return hasVehicle && item?.estado !== "salio";
    }).length;

    const insideCount = data.filter((item) => item?.estado !== "salio").length;

    data.forEach((item) => {
      if (item?.apartamento_destino) uniqueApartments.add(item.apartamento_destino);
    });

    return [
      {
        label: "Ingresos hoy",
        value: todayCount,
        note: "Registros ingresados durante el dia",
      },
      {
        label: "Vehiculos activos",
        value: vehiclesActive,
        note: "Con vehiculo dentro del residencial",
      },
      {
        label: "Apartamentos",
        value: uniqueApartments.size,
        note: "Destinos distintos detectados",
      },
      {
        label: "Adentro",
        value: insideCount,
        note: "Personas sin salida registrada",
      },
    ];
  }, [data]);

  const filteredIngresos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...data]
      .sort((a, b) => new Date(b?.fecha_ingreso || 0) - new Date(a?.fecha_ingreso || 0))
      .filter((item) => {
        if (!query) return true;

        const haystack = [
          item?.nombre,
          item?.documento,
          item?.apartamento_destino,
          item?.tipo_visita,
          item?.estado,
          item?.placa_vehiculo,
          item?.tipo_vehiculo,
          item?.vigilante,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
  }, [data, searchTerm]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleSalida = async (id) => {
    setUpdatingId(id);

    const res = await api("/ingresos", "PATCH", { id });

    setUpdatingId(null);

    if (res.success) {
      await loadIngresos();
      return;
    }

    alert(res.error);
  };

  const getStateClass = (state) => {
    if (state === "salio") return "status-tag status-tag--peach";
    return "status-tag status-tag--mint";
  };

  const getStateLabel = (state) => {
    if (state === "salio") return "Salio";
    return "Adentro";
  };

  const currentTime = new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

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
              <h1 className="brand__title">Panel de vigilancia</h1>
              <p className="brand__subtitle">Residencial Los Pinos</p>
            </div>
          </div>

          <div className="top-actions">
            <span className="pill">
              <span className="pill__dot" />
              Turno activo
            </span>
            {isAdmin ? (
              <button className="button button--ghost" onClick={() => navigate("/admin")}>
                Administrador
              </button>
            ) : null}
            <button className="button button--ghost" onClick={() => navigate("/ingresos")}>
              Nuevo ingreso
            </button>
            <button className="button button--ghost" onClick={() => navigate("/historial")}>
              Historial
            </button>
            <button className="button button--soft" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
        </header>

        <section className="grid-dashboard">
          <article className="panel panel--full fade-up vigilance-board">
            <div className="vigilance-board__header">
              <div>
                <h2 className="vigilance-board__title">Panel de vigilancia</h2>
                <p className="vigilance-board__subtitle">
                  Control en vivo de ingresos, destinos, vigilantes y salidas registradas.
                </p>
              </div>
              <div className="vigilance-board__time">
                {currentTime}
                <span>Turno activo</span>
              </div>
            </div>

            <div className="stats-grid stats-grid--compact">
              {stats.map((stat, index) => (
                <article
                  key={stat.label}
                  className="stat-card fade-up"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <span className="stat-card__label">{stat.label}</span>
                  <p className="stat-card__value">{stat.value}</p>
                  <p className="stat-card__note">{stat.note}</p>
                </article>
              ))}
            </div>

            <div className="vigilance-toolbar">
              <div className="search-shell">
                <span className="search-shell__icon" aria-hidden="true">
                  <SearchIcon />
                </span>
                <input
                  className="search-shell__input"
                  type="search"
                  placeholder="Buscar por nombre, cedula, apartamento, placa o vigilante"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="vigilance-toolbar__meta">
                {filteredIngresos.length} registros visibles
              </div>
            </div>

            {loading ? (
              <div className="loading-state" style={{ marginTop: 20 }}>
                <span className="skeleton skeleton--lg" />
                <span className="skeleton skeleton--md" />
                <span className="skeleton skeleton--lg" />
                <span className="skeleton skeleton--sm" />
              </div>
            ) : filteredIngresos.length > 0 ? (
              <div className="vigilance-table-shell">
                <table className="vigilance-table">
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Tipo</th>
                      <th>Destino</th>
                      <th>Hora</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngresos.map((item, index) => {
                      const initials = getInitials(item.nombre);
                      const entradaHora = formatTime(item.fecha_ingreso);
                      const salidaHora = formatTime(item.hora_salida);
                      const hasVehicle =
                        item.tiene_vehiculo === true || item.tiene_vehiculo === "true";

                      return (
                        <tr key={item.id || `${item.nombre}-${index}`}>
                          <td>
                            <div className="person-cell">
                              <div className="person-cell__avatar">{initials}</div>
                              <div>
                                <p className="person-cell__name">{item.nombre || "Sin nombre"}</p>
                                <p className="person-cell__sub">
                                  {item.documento || "Sin documento"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={getTipoVisitaClass(item.tipo_visita)}>
                              {getTipoVisitaLabel(item.tipo_visita)}
                            </span>
                          </td>
                          <td>
                            <div className="destination-cell">
                              <p className="destination-cell__main">
                                {item.apartamento_destino || "Sin destino"}
                              </p>
                              <p className="destination-cell__sub">
                                {hasVehicle && item.placa_vehiculo
                                  ? `Vehiculo ${item.tipo_vehiculo || "auto"} | ${item.placa_vehiculo}`
                                  : "Sin vehiculo registrado"}
                              </p>
                            </div>
                          </td>
                          <td>
                            <div className="time-cell">
                              <span>{entradaHora}</span>
                              {item.hora_salida ? (
                                <small>Salida {salidaHora}</small>
                              ) : (
                                <small>Entrada</small>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={getStateClass(item.estado)}>
                              {getStateLabel(item.estado)}
                            </span>
                          </td>
                          <td>
                            {item.estado === "salio" ? (
                              <span className="row-action row-action--done">Salida registrada</span>
                            ) : (
                              <button
                                className="row-action"
                                onClick={() => handleSalida(item.id)}
                                disabled={updatingId === item.id}
                              >
                                {updatingId === item.id ? "Registrando..." : "Registrar salida"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: 20 }}>
                No hay registros para esta busqueda.
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
