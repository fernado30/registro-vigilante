import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { api } from "../../services/api";
import {
  getPagoAdministracionClass,
  getPagoAdministracionLabel,
  getPagoAdministracionVencimientoEstado,
  isPagoAdministracionPagado,
} from "../../utils/ingresos";
import { downloadStructuredReportPdf } from "../../utils/pdfReport";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="search-shell__svg">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-badge__icon">
      <path
        d="M4.5 7.5h14A2.5 2.5 0 0 1 21 10v5.5A2.5 2.5 0 0 1 18.5 18h-14A2.5 2.5 0 0 1 2 15.5V10a2.5 2.5 0 0 1 2.5-2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 12h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 7.5V6a2 2 0 0 1 2-2h10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

function formatDateTime(value) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isProveedorVisita(tipo) {
  return `${tipo || ""}`.trim().toLowerCase() === "proveedor";
}

function getStatusFilterLabel(statusFilter) {
  if (statusFilter === "pagado") return "Pagados";
  if (statusFilter === "pendiente") return "Pendientes";
  if (statusFilter === "vencido") return "Vencidos";
  return "Todos";
}

export default function PagoAdministracion() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);
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

  const providerRows = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(b?.fecha_ingreso || 0) - new Date(a?.fecha_ingreso || 0))
      .filter((item) => isProveedorVisita(item?.tipo_visita));
  }, [data]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return providerRows.filter((item) => {
      const paid = isPagoAdministracionPagado(item?.pago_administracion);
      const paymentStatus = getPagoAdministracionVencimientoEstado(item);
      const isOverdue = !paid && paymentStatus.daysLeft !== null && paymentStatus.daysLeft < 0;
      const isPending = !paid && !isOverdue;
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "pagado" && paid) ||
        (statusFilter === "pendiente" && isPending) ||
        (statusFilter === "vencido" && isOverdue);

        const haystack = [
          item?.nombre,
          item?.documento,
          item?.apartamento_destino,
          item?.vigilante,
          item?.tipo_visita,
          getPagoAdministracionLabel(item?.pago_administracion),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || haystack.includes(query);

        return matchesStatus && matchesSearch;
      });
  }, [providerRows, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (effectiveCurrentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(pageStartIndex, pageStartIndex + pageSize);
  const pageStart = filteredRows.length > 0 ? pageStartIndex + 1 : 0;
  const pageEnd = Math.min(pageStartIndex + pageSize, filteredRows.length);
  const pageItems = buildPageItems(effectiveCurrentPage, totalPages);

  const pagados = filteredRows.filter((item) => isPagoAdministracionPagado(item?.pago_administracion)).length;
  const pendientes = filteredRows.length - pagados;
  const paymentAlerts = useMemo(() => {
    const now = new Date();

    return filteredRows
      .map((item) => ({
        item,
        status: getPagoAdministracionVencimientoEstado(item, now),
      }))
      .filter(({ status }) => status.warning)
      .sort(
        (a, b) =>
          (a.status.daysLeft ?? Number.POSITIVE_INFINITY) -
          (b.status.daysLeft ?? Number.POSITIVE_INFINITY)
      );
  }, [filteredRows]);

  const summaryCards = [
    { label: "Total proveedores", value: filteredRows.length, note: "Ingresos revisados" },
    { label: "Pagados", value: pagados, note: "Con administracion al dia" },
    { label: "Pendientes", value: pendientes, note: "Aun sin confirmar" },
    { label: "Alertas", value: paymentAlerts.length, note: "Vence pronto o ya vencido" },
  ];

  const handleTogglePago = async (item) => {
    const nextValue = !isPagoAdministracionPagado(item?.pago_administracion);
    setUpdatingId(item.id);

    const res = await api("/ingresos", "PATCH", {
      id: item.id,
      pago_administracion: nextValue,
    });

    if (res.success) {
      setData((current) =>
        current.map((row) => (row.id === item.id ? { ...row, ...res.data } : row))
      );
    } else {
      alert(res.error || "No fue posible actualizar el pago.");
    }

    setUpdatingId(null);
  };

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setCurrentPage(1);
  };

  const handleExportPdf = () => {
    downloadStructuredReportPdf({
      filename: `pago-administracion-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: "Pago de administracion",
      subtitle: "Informe de proveedores con estado de pago y fecha de confirmacion",
      metaLines: [
        `Generado: ${new Intl.DateTimeFormat("es-CO", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date())}`,
        `Registros: ${filteredRows.length}`,
      ],
      summaryCards,
      infoSections: [
        {
          title: "Filtros aplicados",
          items: [
            {
              label: "Estado",
              value: getStatusFilterLabel(statusFilter),
            },
            { label: "Tipo", value: "Proveedor" },
            { label: "Busqueda", value: searchTerm.trim() || "Sin filtro" },
          ],
        },
      ],
      tableColumns: [
        { header: "Nombre", width: 110, getValue: (item) => item.nombre || "--" },
        { header: "Documento", width: 80, getValue: (item) => item.documento || "--" },
        { header: "Apartamento", width: 120, getValue: (item) => item.apartamento_destino || "--" },
        { header: "Vigilante", width: 100, getValue: (item) => item.vigilante || "Sin asignar" },
        {
          header: "Pago admin",
          width: 90,
          getValue: (item) => getPagoAdministracionLabel(item?.pago_administracion),
        },
        {
          header: "Fecha pago",
          width: 95,
          getValue: (item) => formatDateTime(item?.fecha_pago_administracion),
        },
      ],
      rows: filteredRows,
      emptyMessage: "No hay proveedores que coincidan con los filtros aplicados.",
    });
  };

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
                <WalletIcon />
              </div>
              <div>
                <h1 className="brand__title">Pago de administración</h1>
                <p className="brand__subtitle">
                  Controla y busca los ingresos con administracion pagada o pendiente
                </p>
              </div>
            </div>
          </header>

          <section className="panel admin-hero fade-up">
            <div>
              <span className="admin-hero__eyebrow">Modulo exclusivo</span>
              <h2 className="section-title admin-hero__title">
                Gestion de pago de administración
              </h2>
              <p className="section-subtitle admin-hero__subtitle">
                Busca por nombre, documento o apartamento y marca el estado de pago
                directamente desde el panel administrativo.
              </p>
            </div>
            <div className="admin-hero__badge">
              <span className="admin-badge">
                <span className="admin-badge__dot" />
                Solo administracion
              </span>
            </div>
          </section>

          {paymentAlerts.length > 0 ? (
            <section className="payment-alert fade-up" role="status" aria-live="polite">
              <div className="payment-alert__icon">
                <span />
              </div>
              <div className="payment-alert__content">
                <div className="payment-alert__header">
                  <strong>Pago por vencer</strong>
                  <span className="payment-alert__count">
                    {paymentAlerts.length} registro{paymentAlerts.length === 1 ? "" : "s"} requieren
                    revisión
                  </span>
                </div>
                <ul className="payment-alert__list">
                  {paymentAlerts.slice(0, 6).map(({ item, status }) => (
                    <li key={item.id} className="payment-alert__item">
                      <span className="payment-alert__name">{item.nombre || "Sin nombre"}</span>
                      <span className={`payment-alert__state payment-alert__state--${status.tone}`}>
                        {status.label}
                      </span>
                    </li>
                  ))}
                </ul>
                {paymentAlerts.length > 6 ? (
                  <p className="payment-alert__text">
                    Mostrando 6 de {paymentAlerts.length} proveedores con vencimiento próximo.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="stats-grid stats-grid--compact admin-stats">
            {summaryCards.map((stat, index) => (
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
          </section>

          <section className="panel admin-toolbar fade-up">
            <div className="admin-toolbar__filters">
              <div className="field-group">
                <label className="field-label" htmlFor="admin-payment-status">
                  Estado
                </label>
                <select
                  id="admin-payment-status"
                  className="select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="todos">Todos</option>
                  <option value="pagado">Pagados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="vencido">Vencidos</option>
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
                  placeholder="Buscar por nombre, documento, apartamento o vigilante"
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
                onClick={handleExportPdf}
                disabled={loading || filteredRows.length === 0}
              >
                Exportar PDF
              </button>
              <button className="button button--soft" onClick={handleReset}>
                Limpiar filtros
              </button>
            </div>
          </div>
          </section>

          <section className="panel admin-section fade-up">
            <div className="section-head">
              <div>
                <h2 className="section-title">Registros de pago</h2>
                <p className="section-subtitle">
                  Revisa los proveedores con pago al día y actualiza el estado cuando corresponda.
                </p>
              </div>
              <div className="mini-note admin-mini-note">
                <strong>Mostrando:</strong> {pageStart}-{pageEnd} de {filteredRows.length}
              </div>
            </div>

            {loading ? (
              <div className="loading-state" style={{ marginTop: 20 }}>
                <span className="skeleton skeleton--lg" />
                <span className="skeleton skeleton--md" />
                <span className="skeleton skeleton--lg" />
                <span className="skeleton skeleton--sm" />
              </div>
            ) : filteredRows.length > 0 ? (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Documento</th>
                      <th>Apto</th>
                      <th>Vigilante</th>
                      <th>Pago admin</th>
                      <th>Fecha pago</th>
                      <th>Vence</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((item, index) => {
                      const paid = isPagoAdministracionPagado(item?.pago_administracion);
                      const paymentDate = formatDateTime(item?.fecha_pago_administracion);
                      const paymentStatus = getPagoAdministracionVencimientoEstado(item);

                      return (
                        <tr key={item.id || `${item.nombre}-${index}`} className="data-row">
                          <td className="table-cell">
                            <span className="table-value">{item.nombre || "Sin nombre"}</span>
                          </td>
                          <td className="table-cell">
                            <span className="table-value">{item.documento || "--"}</span>
                          </td>
                          <td className="table-cell">
                            <span className="table-value">{item.apartamento_destino || "--"}</span>
                          </td>
                          <td className="table-cell">
                            <span className="table-value">{item.vigilante || "Sin asignar"}</span>
                          </td>
                          <td className="table-cell">
                            <span className={getPagoAdministracionClass(item?.pago_administracion)}>
                              {getPagoAdministracionLabel(item?.pago_administracion)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="table-value">{paid ? paymentDate : "--"}</span>
                          </td>
                          <td className="table-cell">
                            <div className={`payment-status payment-status--${paymentStatus.tone}`}>
                              <span className="payment-status__label">{paymentStatus.label}</span>
                              <small className="payment-status__sub">
                                {paymentStatus.dueDate ? formatDateTime(paymentStatus.dueDate) : "Sin fecha"}
                              </small>
                            </div>
                          </td>
                          <td className="table-cell">
                            <button
                              type="button"
                              className="row-action"
                              onClick={() => handleTogglePago(item)}
                              disabled={updatingId === item.id}
                            >
                              {updatingId === item.id
                                ? "Actualizando..."
                                : paid
                                  ? "Marcar pendiente"
                                  : "Marcar pagado"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="history-pagination">
                  <div className="history-pagination__info">
                    Pagina <strong>{effectiveCurrentPage}</strong> de <strong>{totalPages}</strong>
                  </div>

                  <div className="history-pagination__controls" aria-label="Paginacion de pago administracion">
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
            <div className="empty-state">
              No hay proveedores que coincidan con los filtros aplicados.
            </div>
          )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
