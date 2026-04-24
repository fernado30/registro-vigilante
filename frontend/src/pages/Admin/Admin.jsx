import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { api } from "../../services/api";
import {
  getPagoAdministracionClass,
  getPagoAdministracionLabel,
  getTipoVisitaClass,
  getTipoVisitaLabel,
} from "../../utils/ingresos";
import { downloadStructuredReportPdf } from "../../utils/pdfReport";

const SHIFT_STORAGE_KEY = "vigilancia_pro_admin_shifts";

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

function getMonthKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthLabel(monthKey) {
  if (!monthKey) return "--";

  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function shiftMonth(monthKey, delta) {
  if (!monthKey) return getMonthKey();

  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return getMonthKey(date);
}

function buildCalendarDays(monthKey) {
  if (!monthKey) return [];

  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return [];

  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
    cells.push(dayKey);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatDateLabel(value) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value) {
  if (!value) return "--:--";

  return new Intl.DateTimeFormat("es-CO", {
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

function getTimeMinutes(value) {
  if (!value || !value.includes(":")) return 0;

  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

  return hours * 60 + minutes;
}

function getShiftDurationMinutes(shift) {
  const start = getTimeMinutes(shift?.hora_inicio);
  const end = getTimeMinutes(shift?.hora_fin);

  if (!start || !end) return 0;
  return Math.max(0, end - start);
}

function getShiftSortKey(shift) {
  return `${shift?.fecha || ""} ${shift?.hora_inicio || ""}`;
}

function getStringHash(value) {
  return `${value || ""}`
    .split("")
    .reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7);
}

function getShiftAccentStyle(vigilante) {
  const palette = [
    {
      border: "rgba(96, 165, 250, 0.26)",
      surface: "linear-gradient(135deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.82))",
      accent: "rgba(59, 130, 246, 0.92)",
      accentSoft: "rgba(59, 130, 246, 0.12)",
      text: "#1d4ed8",
    },
    {
      border: "rgba(45, 212, 191, 0.28)",
      surface: "linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(204, 251, 241, 0.82))",
      accent: "rgba(13, 148, 136, 0.92)",
      accentSoft: "rgba(13, 148, 136, 0.12)",
      text: "#0f766e",
    },
    {
      border: "rgba(251, 191, 36, 0.28)",
      surface: "linear-gradient(135deg, rgba(255, 251, 235, 0.98), rgba(254, 249, 195, 0.82))",
      accent: "rgba(245, 158, 11, 0.92)",
      accentSoft: "rgba(245, 158, 11, 0.12)",
      text: "#b45309",
    },
    {
      border: "rgba(244, 114, 182, 0.28)",
      surface: "linear-gradient(135deg, rgba(253, 242, 248, 0.98), rgba(252, 231, 243, 0.82))",
      accent: "rgba(219, 39, 119, 0.92)",
      accentSoft: "rgba(219, 39, 119, 0.12)",
      text: "#be185d",
    },
    {
      border: "rgba(167, 139, 250, 0.28)",
      surface: "linear-gradient(135deg, rgba(245, 243, 255, 0.98), rgba(237, 233, 254, 0.82))",
      accent: "rgba(109, 40, 217, 0.92)",
      accentSoft: "rgba(109, 40, 217, 0.12)",
      text: "#6d28d9",
    },
  ];

  const paletteIndex = Math.abs(getStringHash(vigilante)) % palette.length;
  const selected = palette[paletteIndex];

  return {
    "--shift-border": selected.border,
    "--shift-surface": selected.surface,
    "--shift-accent": selected.accent,
    "--shift-accent-soft": selected.accentSoft,
    "--shift-text": selected.text,
  };
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

function safeParseShifts(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadStoredShifts() {
  if (typeof window === "undefined") return [];

  return safeParseShifts(window.localStorage.getItem(SHIFT_STORAGE_KEY) || "[]");
}

function saveStoredShifts(shifts) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(shifts));
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

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-badge__icon">
      <path
        d="M12 3l7 4v5c0 4.5-3 8.5-7 9-4-.5-7-4.5-7-9V7l7-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 13l2.2 2.2L15.8 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getPercent(value, total) {
  if (!total) return 0;
  return Math.max(8, Math.round((value / total) * 100));
}

export default function Admin() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(getDateOffset(7));
  const [dateTo, setDateTo] = useState(getTodayValue());
  const [selectedType, setSelectedType] = useState("todos");
  const [selectedVigilante, setSelectedVigilante] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [shifts, setShifts] = useState(() => loadStoredShifts());
  const [savingShift, setSavingShift] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    vigilante: "",
    fecha: getTodayValue(),
    hora_inicio: "07:00",
    hora_fin: "15:00",
    puesto: "Porteria principal",
    observaciones: "",
  });
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState(() => getMonthKey());

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

  useEffect(() => {
    saveStoredShifts(shifts);
  }, [shifts]);

  const vigilantes = useMemo(() => {
    const names = new Set();

    data.forEach((item) => {
      if (item?.vigilante) {
        names.add(item.vigilante.trim());
      }
    });

    shifts.forEach((item) => {
      if (item?.vigilante) {
        names.add(item.vigilante.trim());
      }
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [data, shifts]);

  const defaultShiftVigilante = vigilantes[0] || "";

  const reportRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...data]
      .sort((a, b) => new Date(b?.fecha_ingreso || 0) - new Date(a?.fecha_ingreso || 0))
      .filter((item) => {
        const itemDate = getDateKey(item?.fecha_ingreso);
        const matchesDate = (!dateFrom || itemDate >= dateFrom) && (!dateTo || itemDate <= dateTo);
        const matchesType =
          selectedType === "todos" ||
          `${item?.tipo_visita || ""}`.toLowerCase() === selectedType.toLowerCase();
        const matchesVigilante =
          selectedVigilante === "todos" ||
          `${item?.vigilante || ""}`.toLowerCase() === selectedVigilante.toLowerCase();

        const haystack = [
          item?.nombre,
          item?.documento,
          item?.apartamento_destino,
          item?.placa_vehiculo,
          item?.vigilante,
          item?.tipo_visita,
          item?.estado,
          getPagoAdministracionLabel(item?.pago_administracion),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || haystack.includes(query);

        return matchesDate && matchesType && matchesVigilante && matchesSearch;
      });
  }, [data, dateFrom, dateTo, searchTerm, selectedType, selectedVigilante]);

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

  const topVigilantes = useMemo(() => {
    const counts = new Map();

    reportRows.forEach((item) => {
      const key = item?.vigilante?.trim() || "Sin asignar";
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [reportRows]);

  const typeBreakdown = useMemo(() => {
    const counts = new Map();

    reportRows.forEach((item) => {
      const key = `${item?.tipo_visita || "otro"}`.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [reportRows]);

  const avgStay = useMemo(() => {
    const durations = reportRows
      .filter((item) => item?.estado === "salio" && item?.fecha_ingreso && item?.hora_salida)
      .map((item) => {
        const start = new Date(item.fecha_ingreso).getTime();
        const end = new Date(item.hora_salida).getTime();
        return Math.max(0, Math.round((end - start) / 60000));
      })
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (!durations.length) return 0;

    return Math.round(durations.reduce((total, value) => total + value, 0) / durations.length);
  }, [reportRows]);

  const activeCount = reportRows.filter((item) => item?.estado !== "salio").length;
  const vehiclesCount = reportRows.filter(
    (item) => item?.tiene_vehiculo === true || item?.tiene_vehiculo === "true"
  ).length;

  const dashboardCards = [
    {
      label: "Ingresos filtrados",
      value: reportRows.length,
      note: "Registros incluidos en el reporte",
    },
    {
      label: "Personas adentro",
      value: activeCount,
      note: "Ingresos sin salida registrada",
    },
    {
      label: "Vehiculos",
      value: vehiclesCount,
      note: "Con placa o tipo de vehiculo",
    },
    {
      label: "Promedio permanencia",
      value: formatDuration(avgStay),
      note: "Tiempo promedio de salida",
    },
  ];

  const shiftStats = useMemo(() => {
    const completed = shifts.filter((item) => item.status === "completado").length;
    const pending = shifts.filter((item) => item.status !== "completado").length;

    return [
      {
        label: "Turnos guardados",
        value: shifts.length,
        note: "Planificacion local del administrador",
      },
      {
        label: "Pendientes",
        value: pending,
        note: "Turnos programados por cubrir",
      },
      {
        label: "Completados",
        value: completed,
        note: "Turnos marcados como finalizados",
      },
    ];
  }, [shifts]);

  const orderedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => {
      const left = getShiftSortKey(a);
      const right = getShiftSortKey(b);

      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
  }, [shifts]);

  const calendarDays = useMemo(() => buildCalendarDays(selectedCalendarMonth), [selectedCalendarMonth]);

  const shiftsByDate = useMemo(() => {
    const map = new Map();

    orderedShifts.forEach((shift) => {
      const key = getDateKey(shift.fecha);
      if (!key) return;

      const items = map.get(key) || [];
      items.push(shift);
      map.set(key, items);
    });

    map.forEach((items, key) => {
      items.sort((a, b) => getTimeMinutes(a.hora_inicio) - getTimeMinutes(b.hora_inicio));
      map.set(key, items);
    });

    return map;
  }, [orderedShifts]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setDateFrom(getDateOffset(7));
    setDateTo(getTodayValue());
    setSelectedType("todos");
    setSelectedVigilante("todos");
    setCurrentPage(1);
  };

  const handleExport = () => {
    downloadStructuredReportPdf({
      filename: `reporte-vigilancia-${getTodayValue()}.pdf`,
      title: "Reporte administrativo",
      subtitle: "Resumen operacional de ingresos filtrados",
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
            {
              label: "Vigilante",
              value: selectedVigilante === "todos" ? "Todos" : selectedVigilante,
            },
            { label: "Busqueda", value: searchTerm.trim() || "Sin filtro" },
          ],
        },
      ],
      tableColumns: [
        { header: "Fecha", width: 85, getValue: (item) => formatTime(item.fecha_ingreso) },
        { header: "Nombre", width: 110, getValue: (item) => item.nombre || "--" },
        {
          header: "Tipo",
          width: 80,
          getValue: (item) => getTipoVisitaLabel(item.tipo_visita),
        },
        { header: "Apto", width: 120, getValue: (item) => item.apartamento_destino || "--" },
        {
          header: "Pago admin",
          width: 85,
          getValue: (item) => getPagoAdministracionLabel(item?.pago_administracion),
        },
        {
          header: "Fecha pago",
          width: 95,
          getValue: (item) => formatTime(item?.fecha_pago_administracion),
        },
        { header: "Salida", width: 80, getValue: (item) => formatTime(item.hora_salida) },
        { header: "Vigilante", width: 110, getValue: (item) => item.vigilante || "Sin asignar" },
        {
          header: "Estado",
          width: 75,
          getValue: (item) => (item.estado === "salio" ? "Salio" : "Adentro"),
        },
      ],
      rows: reportRows,
      emptyMessage: "No hay ingresos que coincidan con los filtros.",
    });
  };

  const handleShiftChange = (event) => {
    const { name, value } = event.target;

    setShiftForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleShiftSubmit = (event) => {
    event.preventDefault();
    setSavingShift(true);

    const nextShift = {
      id: `${Date.now()}`,
      vigilante: (shiftForm.vigilante || defaultShiftVigilante).trim(),
      fecha: shiftForm.fecha,
      hora_inicio: shiftForm.hora_inicio,
      hora_fin: shiftForm.hora_fin,
      puesto: shiftForm.puesto.trim(),
      observaciones: shiftForm.observaciones.trim(),
      status: "programado",
      created_at: new Date().toISOString(),
    };

    setShifts((current) => [nextShift, ...current]);
    setShiftForm((current) => ({
      ...current,
      observaciones: "",
    }));
    setSavingShift(false);
  };

  const toggleShiftStatus = (id) => {
    setShifts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "completado" ? "programado" : "completado",
            }
          : item
      )
    );
  };

  const removeShift = (id) => {
    setShifts((current) => current.filter((item) => item.id !== id));
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
              <AdminIcon />
            </div>
            <div>
              <h1 className="brand__title">Administrador</h1>
              <p className="brand__subtitle">Reportes, analitica y organizacion de turnos</p>
            </div>
          </div>
        </header>

        <section className="panel admin-hero fade-up">
          <div>
            <span className="admin-hero__eyebrow">Acceso administrativo</span>
            <h2 className="section-title admin-hero__title">Controla reportes y turnos desde un solo lugar</h2>
            <p className="section-subtitle admin-hero__subtitle">
              Filtra los ingresos por fecha, vigilante o tipo de visita y mantén una planeacion
              operativa de los vigilantes.
            </p>
          </div>
          <div className="admin-hero__badge">
            <span className="admin-badge">
              <span className="admin-badge__dot" />
              Administracion activa
            </span>
          </div>
        </section>

        <section className="stats-grid stats-grid--compact admin-stats">
          {dashboardCards.map((stat, index) => (
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
              <label className="field-label" htmlFor="admin-date-from">
                Desde
              </label>
              <input
                id="admin-date-from"
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
              <label className="field-label" htmlFor="admin-date-to">
                Hasta
              </label>
              <input
                id="admin-date-to"
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
              <label className="field-label" htmlFor="admin-type">
                Tipo
              </label>
              <select
                id="admin-type"
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
              <label className="field-label" htmlFor="admin-vigilante">
                Vigilante
              </label>
              <select
                id="admin-vigilante"
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
              <button className="button button--ghost" onClick={handleExport} disabled={loading}>
                Exportar PDF
              </button>
              <button className="button button--soft" onClick={handleResetFilters}>
                Limpiar filtros
              </button>
            </div>
          </div>
        </section>

        <section className="admin-grid admin-grid--two">
          <article className="panel admin-section fade-up">
            <div className="section-head">
              <div>
                <h2 className="section-title">Distribucion de ingresos</h2>
                <p className="section-subtitle">
                  Resume el comportamiento de los ingresos dentro del rango seleccionado.
                </p>
              </div>
              <div className="mini-note admin-mini-note">
                <strong>Rango:</strong> {formatDateLabel(dateFrom)} - {formatDateLabel(dateTo)}
              </div>
            </div>

            <div className="admin-bars">
              {typeBreakdown.length > 0 ? (
                typeBreakdown.map((item) => (
                  <div className="report-bar" key={item.label}>
                    <div className="report-bar__meta">
                      <span>{getTipoVisitaLabel(item.label)}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="report-bar__track">
                      <span
                        style={{ width: `${getPercent(item.value, reportRows.length)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No hay datos para mostrar en este rango.</div>
              )}
            </div>
          </article>

          <article className="panel admin-section fade-up">
            <div className="section-head">
              <div>
                <h2 className="section-title">Top vigilantes</h2>
                <p className="section-subtitle">
                  Quien concentra mas ingresos en el periodo filtrado.
                </p>
              </div>
            </div>

            <div className="admin-bars">
              {topVigilantes.length > 0 ? (
                topVigilantes.map((item) => (
                  <div className="report-bar" key={item.label}>
                    <div className="report-bar__meta">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="report-bar__track">
                      <span style={{ width: `${getPercent(item.value, reportRows.length)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No hay vigilantes registrados para este reporte.</div>
              )}
            </div>
          </article>
        </section>

        <section className="panel admin-section fade-up">
          <div className="section-head">
            <div>
              <h2 className="section-title">Ultimos ingresos filtrados</h2>
              <p className="section-subtitle">
                Vista rapida para revisar lo que esta entrando al residencial.
              </p>
            </div>
            <div className="mini-note admin-mini-note">
              <strong>Registros:</strong> {reportRows.length}
            </div>
          </div>

          {loading ? (
            <div className="loading-state" style={{ marginTop: 20 }}>
              <span className="skeleton skeleton--lg" />
              <span className="skeleton skeleton--md" />
              <span className="skeleton skeleton--lg" />
              <span className="skeleton skeleton--sm" />
            </div>
          ) : reportRows.length > 0 ? (
            <div className="history-table-shell admin-table-shell">
              <div className="history-table__meta">
                <span>{reportRows.length} registros</span>
                <span className="history-table__meta-detail">
                  Mostrando {pageStart}-{pageEnd} de {reportRows.length}
                </span>
              </div>

              <table className="history-table admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Apto</th>
                    <th>Pago admin</th>
                    <th>Fecha pago</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Vigilante</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item, index) => (
                    <tr key={item.id || `${item.nombre}-${index}`}>
                      <td className="history-table__name">{item.nombre || "Sin nombre"}</td>
                      <td>
                        <span className={getTipoVisitaClass(item.tipo_visita)}>
                          {getTipoVisitaLabel(item.tipo_visita)}
                        </span>
                      </td>
                      <td>{item.apartamento_destino || "--"}</td>
                      <td>
                        <span className={getPagoAdministracionClass(item?.pago_administracion)}>
                          {getPagoAdministracionLabel(item?.pago_administracion)}
                        </span>
                      </td>
                      <td>{item.pago_administracion ? formatTime(item.fecha_pago_administracion) : "--"}</td>
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

              <div className="history-pagination">
                <div className="history-pagination__info">
                  Pagina <strong>{effectiveCurrentPage}</strong> de <strong>{totalPages}</strong>
                </div>

                <div className="history-pagination__controls" aria-label="Paginacion del admin">
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
              No hay ingresos que coincidan con los filtros.
            </div>
          )}
        </section>

        <section className="admin-grid admin-grid--two">
          <article className="panel admin-section fade-up">
            <div className="section-head">
              <div>
                <h2 className="section-title">Organizar turnos</h2>
                <p className="section-subtitle">
                  Registra y controla los turnos de los vigilantes desde el panel.
                </p>
              </div>
            </div>

            <form className="form admin-form" onSubmit={handleShiftSubmit}>
              <div className="form-grid admin-form-grid">
                <div className="field-group">
                  <label className="field-label" htmlFor="shift-vigilante">
                    Vigilante
                  </label>
                  <select
                    id="shift-vigilante"
                    name="vigilante"
                    className="select"
                    value={shiftForm.vigilante || defaultShiftVigilante}
                    onChange={handleShiftChange}
                    required
                  >
                    {vigilantes.length > 0 ? null : (
                      <option value="">No hay vigilantes registrados</option>
                    )}
                    {vigilantes.map((vigilante) => (
                      <option key={vigilante} value={vigilante}>
                        {vigilante}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="shift-fecha">
                    Fecha
                  </label>
                  <input
                    id="shift-fecha"
                    name="fecha"
                    type="date"
                    className="input"
                    value={shiftForm.fecha}
                    onChange={handleShiftChange}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="shift-start">
                    Hora inicio
                  </label>
                  <input
                    id="shift-start"
                    name="hora_inicio"
                    type="time"
                    className="input"
                    value={shiftForm.hora_inicio}
                    onChange={handleShiftChange}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="shift-end">
                    Hora fin
                  </label>
                  <input
                    id="shift-end"
                    name="hora_fin"
                    type="time"
                    className="input"
                    value={shiftForm.hora_fin}
                    onChange={handleShiftChange}
                    required
                  />
                </div>

                <div className="field-group field-group--full">
                  <label className="field-label" htmlFor="shift-puesto">
                    Puesto
                  </label>
                  <select
                    id="shift-puesto"
                    name="puesto"
                    className="select"
                    value={shiftForm.puesto}
                    onChange={handleShiftChange}
                  >
                    <option value="Porteria principal">Porteria principal</option>
                    <option value="Parqueadero">Parqueadero</option>
                    <option value="Ronda interna">Ronda interna</option>
                    <option value="Apoyo operativo">Apoyo operativo</option>
                  </select>
                </div>

                <div className="field-group field-group--full">
                  <label className="field-label" htmlFor="shift-notes">
                    Observaciones
                  </label>
                  <textarea
                    id="shift-notes"
                    name="observaciones"
                    className="textarea"
                    rows="4"
                    placeholder="Ej. Cubrir descanso, apoyo en ingreso de visitantes, relevos..."
                    value={shiftForm.observaciones}
                    onChange={handleShiftChange}
                  />
                </div>
              </div>

              <button className="button button--primary" type="submit" disabled={savingShift}>
                {savingShift ? "Guardando..." : "Agregar turno"}
              </button>
            </form>
          </article>

          <article className="panel admin-section fade-up">
            <div className="section-head">
              <div>
                <h2 className="section-title">Turnos guardados</h2>
                <p className="section-subtitle">
                  Gestion local en el navegador, ideal para planificacion rapida.
                </p>
              </div>
            </div>

            <div className="stats-grid stats-grid--compact admin-shift-stats">
              {shiftStats.map((stat, index) => (
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

            <div className="shift-calendar">
              <div className="shift-calendar__header">
                <div>
                  <h3 className="shift-calendar__title">Calendario de turnos</h3>
                  <p className="shift-calendar__subtitle">
                    Los días con asignaciones se resaltan con el color del vigilante y muestran su
                    rango horario.
                  </p>
                </div>
                <div className="shift-calendar__nav">
                  <button
                    type="button"
                    className="history-pagination__button"
                    onClick={() => setSelectedCalendarMonth((value) => shiftMonth(value, -1))}
                  >
                    Anterior
                  </button>
                  <span className="shift-calendar__month">{getMonthLabel(selectedCalendarMonth)}</span>
                  <button
                    type="button"
                    className="history-pagination__button"
                    onClick={() => setSelectedCalendarMonth((value) => shiftMonth(value, 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div className="shift-calendar__legend">
                {vigilantes.slice(0, 5).map((vigilante) => {
                  const style = getShiftAccentStyle(vigilante);
                  return (
                    <span key={vigilante} className="shift-calendar__legend-item" style={style}>
                      <span className="shift-calendar__legend-dot" />
                      {vigilante}
                    </span>
                  );
                })}
              </div>

              {calendarDays.length > 0 ? (
                <div className="shift-calendar__grid">
                  {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => (
                    <div key={day} className="shift-calendar__weekday">
                      {day}
                    </div>
                  ))}

                  {calendarDays.map((dayKey, index) => {
                    const dayShifts = dayKey ? shiftsByDate.get(dayKey) || [] : [];
                    const isToday = dayKey === getTodayValue();

                    return (
                      <div
                        key={dayKey || `blank-${index}`}
                        className={`shift-calendar__day ${
                          dayKey ? "shift-calendar__day--active" : "shift-calendar__day--empty"
                        } ${isToday ? "shift-calendar__day--today" : ""}`}
                      >
                        {dayKey ? (
                          <>
                            <div className="shift-calendar__day-head">
                              <strong>{dayKey.slice(8, 10)}</strong>
                              {isToday ? <span>Hoy</span> : null}
                            </div>
                            <div className="shift-calendar__day-list">
                              {dayShifts.length > 0 ? (
                                dayShifts.map((shift) => {
                                  const style = getShiftAccentStyle(shift.vigilante);
                                  const duration = getShiftDurationMinutes(shift);
                                  const left = Math.max(
                                    0,
                                    Math.min(100, (getTimeMinutes(shift.hora_inicio) / 1440) * 100)
                                  );
                                  const width = Math.max(
                                    6,
                                    Math.min(100 - left, (Math.max(1, duration) / 1440) * 100)
                                  );

                                  return (
                                    <article
                                      key={shift.id}
                                      className={`shift-calendar__event ${
                                        shift.status === "completado"
                                          ? "shift-calendar__event--done"
                                          : ""
                                      }`}
                                      style={style}
                                    >
                                      <div className="shift-calendar__event-header">
                                        <strong>{shift.vigilante}</strong>
                                        <span>
                                          {shift.hora_inicio} - {shift.hora_fin}
                                        </span>
                                      </div>
                                      <div className="shift-calendar__event-track">
                                        <span
                                          className="shift-calendar__event-fill"
                                          style={{ left: `${left}%`, width: `${width}%` }}
                                        />
                                      </div>
                                      <p className="shift-calendar__event-meta">
                                        {shift.puesto}
                                      </p>
                                      <div className="shift-card__actions shift-calendar__event-actions">
                                        <button
                                          type="button"
                                          className="button button--ghost"
                                          onClick={() => toggleShiftStatus(shift.id)}
                                        >
                                          {shift.status === "completado"
                                            ? "Reabrir"
                                            : "Marcar completado"}
                                        </button>
                                        <button
                                          type="button"
                                          className="button button--soft"
                                          onClick={() => removeShift(shift.id)}
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </article>
                                  );
                                })
                              ) : (
                                <div className="shift-calendar__empty">Sin turnos</div>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">Aun no hay turnos guardados.</div>
              )}
            </div>
          </article>
        </section>
      </div>
      </main>
    </AppShell>
  );
}
