import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/auth-context";
import AppShell from "../../components/AppShell";
import { api } from "../../services/api";
import { getTipoVisitaClass, getTipoVisitaLabel } from "../../utils/ingresos";
import { downloadStructuredReportPdf } from "../../utils/pdfReport";

function getTodayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateKey(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(minutes) {
  if (!minutes || minutes < 0) return "--";

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) return `${rest} min`;

  return `${hours} h ${rest.toString().padStart(2, "0")} min`;
}

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 1) return [1];

  const pageSet = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const pages = Array.from(pageSet)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items = [];

  pages.forEach((page, index) => {
    const previous = pages[index - 1];

    if (typeof previous === "number" && page - previous > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  });

  return items;
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-badge__icon">
      <path
        d="M3 20h18M7 16V8M12 16v-5M17 16v-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function BarChart({ data, label }) {
  if (!data || data.length === 0) {
    return <p className="chart-empty">No hay datos disponibles</p>;
  }

  const maxValue = Math.max(...data.map((item) => item.value));
  const getPercent = (value) => {
    if (!maxValue) return 8;
    return Math.max(8, Math.round((value / maxValue) * 100));
  };

  return (
    <div className="chart-container">
      <div className="chart-label">{label}</div>
      <div className="chart-bars">
        {data.map((item, idx) => (
          <div key={idx} className="chart-bar-item">
            <div className="chart-bar-label">{item.label}</div>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill"
                style={{ width: `${getPercent(item.value)}%` }}
                title={`${item.label}: ${item.value}`}
              />
            </div>
            <div className="chart-bar-value">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reportes() {
  const { logout, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(getDateOffset(30));
  const [dateTo, setDateTo] = useState(getTodayValue());
  const [selectedType, setSelectedType] = useState("todos");
  const [selectedVigilante, setSelectedVigilante] = useState("todos");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin");
      return;
    }

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
  }, [isAdmin, navigate]);

  const vigilantes = useMemo(() => {
    const names = new Set();

    data.forEach((item) => {
      if (item?.vigilante) {
        names.add(item.vigilante.trim());
      }
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [data]);

  const reportRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...data]
      .sort(
        (a, b) =>
          new Date(b?.fecha_ingreso || 0) - new Date(a?.fecha_ingreso || 0)
      )
      .filter((item) => {
        const itemDate = getDateKey(item?.fecha_ingreso);
        const matchesDate =
          (!dateFrom || itemDate >= dateFrom) && (!dateTo || itemDate <= dateTo);
        const matchesType =
          selectedType === "todos" ||
          `${item?.tipo_visita || ""}`.toLowerCase() ===
            selectedType.toLowerCase();
        const matchesVigilante =
          selectedVigilante === "todos" ||
          `${item?.vigilante || ""}`.toLowerCase() ===
            selectedVigilante.toLowerCase();
        const matchesEstado =
          selectedEstado === "todos" ||
          `${item?.estado || ""}`.toLowerCase() ===
            selectedEstado.toLowerCase();

        const haystack = [
          item?.nombre,
          item?.documento,
          item?.apartamento_destino,
          item?.placa_vehiculo,
          item?.vigilante,
          item?.tipo_visita,
          item?.estado,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || haystack.includes(query);

        return (
          matchesDate &&
          matchesType &&
          matchesVigilante &&
          matchesEstado &&
          matchesSearch
        );
      });
  }, [
    data,
    dateFrom,
    dateTo,
    searchTerm,
    selectedType,
    selectedVigilante,
    selectedEstado,
  ]);

  const totalPages = Math.max(1, Math.ceil(reportRows.length / pageSize));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (effectiveCurrentPage - 1) * pageSize;
  const visibleRows = reportRows.slice(pageStartIndex, pageStartIndex + pageSize);
  const pageStart = reportRows.length > 0 ? pageStartIndex + 1 : 0;
  const pageEnd = Math.min(pageStartIndex + pageSize, reportRows.length);
  const pageItems = buildPageItems(effectiveCurrentPage, totalPages);

  const typeOptions = useMemo(() => {
    const types = new Set();

    data.forEach((item) => {
      if (item?.tipo_visita) {
        types.add(item.tipo_visita.toLowerCase());
      }
    });

    return ["todos", ...Array.from(types)];
  }, [data]);

  // Estadísticas
  const totalIngresos = reportRows.length;
  const personasAdentro = reportRows.filter(
    (item) => item?.estado !== "salio"
  ).length;
  const personasSalio = reportRows.filter(
    (item) => item?.estado === "salio"
  ).length;
  const vehiclesCount = reportRows.filter(
    (item) =>
      item?.tiene_vehiculo === true || item?.tiene_vehiculo === "true"
  ).length;

  const avgStay = useMemo(() => {
    const durations = reportRows
      .filter(
        (item) =>
          item?.estado === "salio" &&
          item?.fecha_ingreso &&
          item?.hora_salida
      )
      .map((item) => {
        const start = new Date(item.fecha_ingreso).getTime();
        const end = new Date(item.hora_salida).getTime();
        return Math.max(0, Math.round((end - start) / 60000));
      })
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (!durations.length) return 0;

    return Math.round(
      durations.reduce((total, value) => total + value, 0) / durations.length
    );
  }, [reportRows]);

  const maxStay = useMemo(() => {
    const durations = reportRows
      .filter(
        (item) =>
          item?.estado === "salio" &&
          item?.fecha_ingreso &&
          item?.hora_salida
      )
      .map((item) => {
        const start = new Date(item.fecha_ingreso).getTime();
        const end = new Date(item.hora_salida).getTime();
        return Math.max(0, Math.round((end - start) / 60000));
      })
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (!durations.length) return 0;
    return Math.max(...durations);
  }, [reportRows]);

  // Gráficos
  const typeBreakdown = useMemo(() => {
    const counts = new Map();

    reportRows.forEach((item) => {
      const key = `${item?.tipo_visita || "otro"}`.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label: getTipoVisitaLabel(label), value }))
      .sort((a, b) => b.value - a.value);
  }, [reportRows]);

  const vigilanteBreakdown = useMemo(() => {
    const counts = new Map();

    reportRows.forEach((item) => {
      const key = item?.vigilante?.trim() || "Sin asignar";
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [reportRows]);

  const estadoBreakdown = useMemo(() => {
    const counts = new Map();

    reportRows.forEach((item) => {
      const key = item?.estado === "salio" ? "Salió" : "Adentro";
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }, [reportRows]);

  const dashboardCards = [
    {
      label: "Total ingresos",
      value: totalIngresos,
      note: "Registros en el período",
    },
    {
      label: "Personas adentro",
      value: personasAdentro,
      note: "Sin salida registrada",
    },
    {
      label: "Personas salieron",
      value: personasSalio,
      note: "Con salida registrada",
    },
    {
      label: "Con vehículos",
      value: vehiclesCount,
      note: "Ingresos con vehículo",
    },
    {
      label: "Permanencia promedio",
      value: formatDuration(avgStay),
      note: "Tiempo medio de estancia",
    },
    {
      label: "Permanencia máxima",
      value: formatDuration(maxStay),
      note: "Mayor tiempo de estancia",
    },
  ];

  const summaryMetrics = [
    {
      label: "Permanencia máxima",
      value: formatDuration(maxStay),
      note: "Mayor tiempo de estancia",
    },
    {
      label: "Permanencia promedio",
      value: formatDuration(avgStay),
      note: "Tiempo medio de estancia",
    },
    {
      label: "Con vehículos",
      value: vehiclesCount,
      note: "Ingresos con vehículo",
    },
    {
      label: "Personas salieron",
      value: personasSalio,
      note: "Con salida registrada",
    },
    {
      label: "Personas adentro",
      value: personasAdentro,
      note: "Sin salida registrada",
    },
    {
      label: "Total ingresos",
      value: totalIngresos,
      note: "Registros en el período",
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleExport = () => {
    downloadStructuredReportPdf({
      filename: `reportes-vigilancia-${getTodayValue()}.pdf`,
      title: "Reporte de ingresos",
      subtitle: "Analisis detallado de ingresos y vigilancia",
      metaLines: [
        `Generado: ${new Intl.DateTimeFormat("es-CO", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date())}`,
        `Registros: ${reportRows.length}`,
      ],
      summaryCards: dashboardCards,
      infoSections: [
        {
          title: "Filtros aplicados",
          items: [
            { label: "Desde", value: dateFrom || "--" },
            { label: "Hasta", value: dateTo || "--" },
            {
              label: "Tipo",
              value: selectedType === "todos" ? "Todos" : getTipoVisitaLabel(selectedType),
            },
            { label: "Vigilante", value: selectedVigilante === "todos" ? "Todos" : selectedVigilante },
            { label: "Estado", value: selectedEstado === "todos" ? "Todos" : selectedEstado },
            { label: "Busqueda", value: searchTerm.trim() || "Sin filtro" },
          ],
        },
      ],
      tableColumns: [
        { header: "Fecha", width: 85, getValue: (item) => formatDateTime(item.fecha_ingreso) },
        { header: "Nombre", width: 95, getValue: (item) => item.nombre || "--" },
        { header: "Documento", width: 80, getValue: (item) => item.documento || "--" },
        {
          header: "Tipo",
          width: 78,
          getValue: (item) => getTipoVisitaLabel(item.tipo_visita),
        },
        { header: "Apartamento", width: 120, getValue: (item) => item.apartamento_destino || "--" },
        {
          header: "Vehiculo",
          width: 110,
          getValue: (item) =>
            item.tiene_vehiculo
              ? `${item.tipo_vehiculo || "--"} (${item.placa_vehiculo || "--"})`
              : "Sin vehiculo",
        },
        { header: "Vigilante", width: 90, getValue: (item) => item.vigilante || "Sin asignar" },
        {
          header: "Estado",
          width: 70,
          getValue: (item) => (item.estado === "salio" ? "Salio" : "Adentro"),
        },
        { header: "Salida", width: 85, getValue: (item) => formatDateTime(item.hora_salida) },
      ],
      rows: reportRows,
      emptyMessage: "No hay ingresos que coincidan con los filtros aplicados.",
    });
  };

  const handleReset = () => {
    setSearchTerm("");
    setDateFrom(getDateOffset(30));
    setDateTo(getTodayValue());
    setSelectedType("todos");
    setSelectedVigilante("todos");
    setSelectedEstado("todos");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <AppShell>
        <main className="app-page admin-page">
          <div className="route-loading">Cargando reportes...</div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="app-page admin-page">
      <div className="app-page__backdrop" aria-hidden="true">
        <span className="app-page__orb app-page__orb--one" />
        <span className="app-page__orb app-page__orb--two" />
        <span className="app-page__orb app-page__orb--three" />
      </div>

      <div className="page-shell">
        <header className="page-header">
          <div className="brand">
            <div className="brand__mark admin-brand__mark">
              <ChartIcon />
            </div>
            <div>
              <h1 className="brand__title">Reportes</h1>
              <p className="brand__subtitle">
                Análisis detallado de ingresos y vigilancia
              </p>
            </div>
          </div>

          <div className="top-actions">
            <button className="button button--ghost" onClick={() => navigate("/admin")}>
              Administrador
            </button>
            <button className="button button--ghost" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
            <button className="button button--soft" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="panel admin-hero fade-up">
          <div>
            <span className="admin-hero__eyebrow">Análisis de datos</span>
            <h2 className="section-title admin-hero__title">
              Reportes de vigilancia y control de acceso
            </h2>
            <p className="section-subtitle admin-hero__subtitle">
              Visualiza estadísticas detalladas, tendencias y distribuciones de
              ingresos. Filtra por período, vigilante, tipo de visita o estado
              de permanencia.
            </p>
          </div>
          <div className="admin-hero__badge">
            <span className="admin-badge">
              <span className="admin-badge__dot" />
              Reportes activos
            </span>
          </div>
        </section>

        <section className="panel report-summary-panel fade-up">
          <div className="section-head report-summary__header">
            <div>
              <h2 className="section-title">Resumen de reporte</h2>
              <p className="section-subtitle">
                Toda la informacion clave del periodo en una sola tarjeta bien organizada.
              </p>
            </div>
            <div className="mini-note admin-mini-note">
              <strong>Total:</strong> {reportRows.length} ingresos filtrados
            </div>
          </div>

          <div className="report-summary-card">
            <div className="report-summary-card__lead">
              <span className="report-summary-card__label">Resumen general</span>
              <p className="report-summary-card__value">{totalIngresos} ingresos filtrados</p>
              <p className="report-summary-card__note">
                Bloque unificado con los indicadores mas importantes para lectura rapida.
              </p>
            </div>

            <div className="report-summary-card__metrics">
              {summaryMetrics.map((stat, index) => (
                <article
                  key={stat.label}
                  className="report-summary-metric fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className="report-summary-metric__label">{stat.label}</span>
                  <strong className="report-summary-metric__value">{stat.value}</strong>
                  <span className="report-summary-metric__note">{stat.note}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className="panel admin-toolbar fade-up">
          <div className="admin-toolbar__filters">
            <div className="field-group">
              <label className="field-label" htmlFor="report-date-from">
                Desde
              </label>
              <input
                id="report-date-from"
                className="input"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="report-date-to">
                Hasta
              </label>
              <input
                id="report-date-to"
                className="input"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="report-type">
                Tipo de visita
              </label>
              <select
                id="report-type"
                className="select"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type === "todos" ? "Todos los tipos" : getTipoVisitaLabel(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="report-vigilante">
                Vigilante
              </label>
              <select
                id="report-vigilante"
                className="select"
                value={selectedVigilante}
                onChange={(e) => {
                  setSelectedVigilante(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="todos">Todos los vigilantes</option>
                {vigilantes.map((vigilante) => (
                  <option key={vigilante} value={vigilante}>
                    {vigilante}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="report-estado">
                Estado
              </label>
              <select
                id="report-estado"
                className="select"
                value={selectedEstado}
                onChange={(e) => {
                  setSelectedEstado(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="todos">Todos los estados</option>
                <option value="adentro">Adentro</option>
                <option value="salio">Salió</option>
              </select>
            </div>
          </div>

          <div className="admin-toolbar__search">
            <div className="search-shell admin-search">
              <span className="search-shell__icon" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                className="search-shell__input"
                type="search"
                placeholder="Buscar por nombre, documento, apto, placa o vigilante"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="admin-toolbar__actions">
              <button
                className="button button--ghost"
                onClick={handleExport}
                disabled={loading || reportRows.length === 0}
              >
                Exportar PDF
              </button>
              <button className="button button--soft" onClick={handleReset}>
                Limpiar filtros
              </button>
            </div>
          </div>
        </section>

        {/* Gráficos */}
        <section className="panels-grid fade-up">
          <div className="panel chart-panel">
            <BarChart data={typeBreakdown} label="Ingresos por tipo de visita" />
          </div>
          <div className="panel chart-panel">
            <BarChart data={estadoBreakdown} label="Distribución de estados" />
          </div>
        </section>

        <section className="panel chart-panel fade-up">
          <BarChart data={vigilanteBreakdown} label="Top 10 vigilantes (más ingresos)" />
        </section>

        {/* Tabla de datos */}
        <section className="panel fade-up">
          <div className="data-table-header">
            <h3 className="data-table-title">
              Registros filtrados ({reportRows.length})
            </h3>
            <p className="data-table-subtitle">
              Mostrando 10 ingresos por pagina con navegacion tipo libro.
            </p>
            <div className="history-table__meta" style={{ padding: "12px 0 0" }}>
              <span>{reportRows.length} registros</span>
              <span className="history-table__meta-detail">
                Mostrando {pageStart}-{pageEnd} de {reportRows.length}
              </span>
            </div>
          </div>

          {reportRows.length === 0 ? (
            <div className="empty-state">
              <p>No hay ingresos que coincidan con los filtros aplicados.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nombre</th>
                    <th>Documento</th>
                    <th>Tipo</th>
                    <th>Apartamento</th>
                    <th>Vehículo</th>
                    <th>Vigilante</th>
                    <th>Estado</th>
                    <th>Salida</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item) => (
                    <tr key={item.id} className="data-row">
                      <td className="table-cell">
                        <span className="table-value">
                          {formatDateTime(item.fecha_ingreso)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="table-value">{item.nombre || "--"}</span>
                      </td>
                      <td className="table-cell">
                        <span className="table-value">
                          {item.documento || "--"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={getTipoVisitaClass(item.tipo_visita)}>
                          {getTipoVisitaLabel(item.tipo_visita)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="table-value">
                          {item.apartamento_destino || "--"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="table-value">
                          {item.tiene_vehiculo
                            ? `${item.tipo_vehiculo || "--"} (${item.placa_vehiculo || "--"})`
                            : "Sin vehículo"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="table-value">
                          {item.vigilante || "Sin asignar"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span
                          className={
                            item.estado === "salio"
                              ? "status-tag status-tag--green"
                              : "status-tag status-tag--blue"
                          }
                        >
                          {item.estado === "salio" ? "Salió" : "Adentro"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="table-value">
                          {formatDateTime(item.hora_salida) || "--"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportRows.length > 0 ? (
            <div className="history-pagination" style={{ paddingInline: 0, paddingBottom: 0 }}>
              <div className="history-pagination__info">
                Pagina <strong>{effectiveCurrentPage}</strong> de <strong>{totalPages}</strong>
              </div>

              <div className="history-pagination__controls" aria-label="Paginacion del reporte">
                <button
                  type="button"
                  className="history-pagination__button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, Math.min(totalPages, page - 1)))
                  }
                  disabled={effectiveCurrentPage === 1}
                >
                  Anterior
                </button>

                {pageItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="history-pagination__ellipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={`history-pagination__button ${
                        item === effectiveCurrentPage ? "history-pagination__button--active" : ""
                      }`}
                      onClick={() => setCurrentPage(item)}
                      aria-current={item === effectiveCurrentPage ? "page" : undefined}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="history-pagination__button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, Math.max(1, page + 1)))
                  }
                  disabled={effectiveCurrentPage === totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
      </main>
    </AppShell>
  );
}
