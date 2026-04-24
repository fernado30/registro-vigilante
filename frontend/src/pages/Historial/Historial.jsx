import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/auth-context";
import AppShell from "../../components/AppShell";
import { api } from "../../services/api";
import {
  getPagoAdministracionClass,
  getPagoAdministracionLabel,
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

export default function Historial() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayValue());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
        getPagoAdministracionLabel(item?.pago_administracion),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || haystack.includes(query);

      return matchesDate && matchesType && matchesSearch;
    });
  }, [data, searchTerm, selectedDate, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (effectiveCurrentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(pageStartIndex, pageStartIndex + pageSize);
  const pageStart = filteredRows.length > 0 ? pageStartIndex + 1 : 0;
  const pageEnd = Math.min(pageStartIndex + pageSize, filteredRows.length);
  const pageItems = buildPageItems(effectiveCurrentPage, totalPages);

  const activeTypes = useMemo(() => {
    const types = new Set();

    data.forEach((item) => {
      if (item?.tipo_visita) types.add(item.tipo_visita.toLowerCase());
    });

    return ["todos", ...Array.from(types)];
  }, [data]);

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
              <h1 className="brand__title">Historial</h1>
              <p className="brand__subtitle">{getVigilanteName(user)}</p>
            </div>
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
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <select
              className="select"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
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
              <div className="history-table__meta">
                <span>{filteredRows.length} registros</span>
                <span className="history-table__meta-detail">
                  Mostrando {pageStart}-{pageEnd} de {filteredRows.length}
                </span>
              </div>

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
                    <th>Pago admin</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item, index) => (
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
                      <td>
                        <span className={getPagoAdministracionClass(item?.pago_administracion)}>
                          {getPagoAdministracionLabel(item?.pago_administracion)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="history-pagination">
                <div className="history-pagination__info">
                  Pagina <strong>{effectiveCurrentPage}</strong> de <strong>{totalPages}</strong>
                </div>

                <div className="history-pagination__controls" aria-label="Paginacion del historial">
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
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: 20 }}>
              No hay registros para los filtros seleccionados.
            </div>
          )}
        </section>
      </div>
      </main>
    </AppShell>
  );
}
