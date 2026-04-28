import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import esLocale from "@fullcalendar/core/locales/es";
import AppShell from "../../components/AppShell";
import { api } from "../../services/api";
import {
  getPagoAdministracionClass,
  getPagoAdministracionLabel,
  getTipoVisitaClass,
  getTipoVisitaLabel,
} from "../../utils/ingresos";
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

function formatDateLabel(value) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateRangeLabel(startValue, endValue) {
  const start = startValue || "";
  const end = endValue || start;

  if (!start) return "--";
  if (start === end) return formatDateLabel(start);

  return `${formatDateLabel(start)} - ${formatDateLabel(end)}`;
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

function formatDateInputValue(value) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeInputValue(value) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getStringHash(value) {
  return `${value || ""}`
    .split("")
    .reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7);
}

function getTurnoDateTime(fecha, hora) {
  if (!fecha || !hora) return null;
  return `${fecha}T${hora}:00`;
}

function getTurnoStartDate(turno) {
  return turno?.fecha_inicio || turno?.fecha || "";
}

function getTurnoEndDate(turno) {
  return turno?.fecha_fin || turno?.fecha_inicio || turno?.fecha || "";
}

function getTurnoSchedule(turno) {
  const dateRange = formatDateRangeLabel(getTurnoStartDate(turno), getTurnoEndDate(turno));
  const timeRange = getTurnoRange(turno);

  if (dateRange === "--") return timeRange;
  if (timeRange === "--") return dateRange;

  return `${dateRange} · ${timeRange}`;
}

function getTurnoRange(turno) {
  if (!turno?.fecha || !turno?.hora_inicio || !turno?.hora_fin) return "--";
  return `${turno.hora_inicio} - ${turno.hora_fin}`;
}

function getShiftSortKey(shift) {
  return `${getTurnoStartDate(shift) || ""} ${shift?.hora_inicio || ""}`;
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="search-shell__svg">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
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

const baseTurnoForm = {
  vigilante: "",
  fecha: getTodayValue(),
  fecha_fin: getTodayValue(),
  hora_inicio: "07:00",
  hora_fin: "15:00",
  puesto: "Porteria principal",
  observaciones: "",
  status: "programado",
};

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

  const [turnos, setTurnos] = useState([]);
  const [turnosLoading, setTurnosLoading] = useState(true);
  const [turnosError, setTurnosError] = useState("");
  const [savingTurno, setSavingTurno] = useState(false);
  const [selectedTurnoId, setSelectedTurnoId] = useState("");
  const [turnoForm, setTurnoForm] = useState(baseTurnoForm);
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await api("/ingresos");

        if (!active) return;

        setData(res.success && Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!active) return;
        setData([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const refreshTurnos = async () => {
    try {
      setTurnosLoading(true);
      setTurnosError("");
      const res = await api("/turnos");

      if (res.success && Array.isArray(res.data)) {
        setTurnos(res.data);
      } else {
        setTurnos([]);
        setTurnosError(res.error || "No se pudieron cargar los turnos.");
      }
    } catch (error) {
      setTurnos([]);
      setTurnosError(error.message || "No se pudieron cargar los turnos.");
    } finally {
      setTurnosLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setTurnosLoading(true);
        setTurnosError("");
        const res = await api("/turnos");

        if (!active) return;

        if (res.success && Array.isArray(res.data)) {
          setTurnos(res.data);
        } else {
          setTurnos([]);
          setTurnosError(res.error || "No se pudieron cargar los turnos.");
        }
      } catch (error) {
        if (!active) return;

        setTurnos([]);
        setTurnosError(error.message || "No se pudieron cargar los turnos.");
      } finally {
        if (active) {
          setTurnosLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const vigilantes = useMemo(() => {
    const names = new Set();

    data.forEach((item) => {
      if (item?.vigilante) {
        names.add(item.vigilante.trim());
      }
    });

    turnos.forEach((item) => {
      if (item?.vigilante) {
        names.add(item.vigilante.trim());
      }
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [data, turnos]);

  const defaultTurnoVigilante = vigilantes[0] || "";

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

  const orderedTurnos = useMemo(() => {
    return [...turnos].sort((a, b) => {
      const left = getShiftSortKey(a);
      const right = getShiftSortKey(b);

      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
  }, [turnos]);

  const turnoStats = useMemo(() => {
    const programados = turnos.filter((item) => item.status === "programado").length;
    const enCurso = turnos.filter((item) => item.status === "en curso").length;
    const completados = turnos.filter((item) => item.status === "completado").length;

    return [
      {
        label: "Turnos guardados",
        value: turnos.length,
        note: "Sincronizados con Supabase",
      },
      {
        label: "Programados",
        value: programados,
        note: "Pendientes por cubrir",
      },
      {
        label: "En curso",
        value: enCurso,
        note: "Activos actualmente",
      },
      {
        label: "Completados",
        value: completados,
        note: "Cerrados por el equipo",
      },
    ];
  }, [turnos]);

  const upcomingTurnos = useMemo(() => {
    return orderedTurnos.slice(0, 6);
  }, [orderedTurnos]);

  const calendarEvents = useMemo(() => {
    return orderedTurnos.map((turno) => {
      const style = getShiftAccentStyle(turno.vigilante);
      const startDate = getTurnoStartDate(turno);
      const endDate = getTurnoEndDate(turno);

      return {
        id: turno.id,
        title: turno.vigilante || "Sin asignar",
        start: getTurnoDateTime(startDate, turno.hora_inicio),
        end: getTurnoDateTime(endDate, turno.hora_fin),
        allDay: false,
        backgroundColor: "transparent",
        borderColor: "transparent",
        textColor: style["--shift-text"],
        extendedProps: {
          turno,
          accentStyle: style,
        },
      };
    });
  }, [orderedTurnos]);

  const editingTurno = useMemo(() => {
    return turnos.find((item) => item.id === selectedTurnoId) || null;
  }, [selectedTurnoId, turnos]);

  const resetTurnoForm = (overrides = {}) => {
    setSelectedTurnoId("");
    setTurnoForm({
      ...baseTurnoForm,
      vigilante: defaultTurnoVigilante,
      ...overrides,
    });
  };

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

  const handleTurnoChange = (event) => {
    const { name, value } = event.target;

    setTurnoForm((current) => {
      if (name === "fecha") {
        const nextFechaFin = current.fecha_fin && current.fecha_fin < value ? value : current.fecha_fin;

        return {
          ...current,
          fecha: value,
          fecha_fin: nextFechaFin || value,
        };
      }

      if (name === "fecha_fin") {
        const nextFecha = current.fecha && value < current.fecha ? value : current.fecha;

        return {
          ...current,
          fecha: nextFecha || value,
          fecha_fin: value,
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleCalendarDateClick = (info) => {
    openTurnoForCreate(info.dateStr || getTodayValue(), info.dateStr || getTodayValue());
  };

  const handleCalendarSelect = (info) => {
    const startDate = formatDateInputValue(info.start) || info.startStr || getTodayValue();
    const endDate = info.end
      ? info.allDay
        ? formatDateInputValue(new Date(info.end.getTime() - 24 * 60 * 60 * 1000))
        : formatDateInputValue(info.end)
      : startDate;
    const inclusiveEnd = endDate || startDate;

    openTurnoForCreate(startDate, inclusiveEnd);
    info.view.calendar.unselect();
  };

  const openTurnoForEdit = (turno) => {
    if (!turno) return;

    setSelectedTurnoId(turno.id);
    setTurnoForm({
      vigilante: turno.vigilante || defaultTurnoVigilante,
      fecha: getTurnoStartDate(turno) || getTodayValue(),
      fecha_fin: getTurnoEndDate(turno) || getTurnoStartDate(turno) || getTodayValue(),
      hora_inicio: turno.hora_inicio || "07:00",
      hora_fin: turno.hora_fin || "15:00",
      puesto: turno.puesto || "Porteria principal",
      observaciones: turno.observaciones || "",
      status: turno.status || "programado",
    });
    setIsTurnoModalOpen(true);
  };

  const openTurnoForCreate = (fecha = getTodayValue(), fechaFin = fecha) => {
    setSelectedTurnoId("");
    setTurnoForm({
      ...baseTurnoForm,
      vigilante: defaultTurnoVigilante,
      fecha,
      fecha_fin: fechaFin,
    });
    setIsTurnoModalOpen(true);
  };

  const persistTurno = async (payload, method, id = null, options = {}) => {
    const { resetForm = true } = options;
    const response = await api("/turnos", method, id ? { id, ...payload } : payload);

    if (!response.success) {
      throw new Error(response.error || "No se pudo guardar el turno.");
    }

    await refreshTurnos();
    if (resetForm) {
      resetTurnoForm();
    }
  };

  const handleTurnoSubmit = async (event) => {
    event.preventDefault();
    setSavingTurno(true);

    const payload = {
      vigilante: (turnoForm.vigilante || defaultTurnoVigilante).trim(),
      fecha: turnoForm.fecha,
      fecha_fin: turnoForm.fecha_fin || turnoForm.fecha,
      hora_inicio: turnoForm.hora_inicio,
      hora_fin: turnoForm.hora_fin,
      puesto: turnoForm.puesto.trim(),
      observaciones: turnoForm.observaciones.trim(),
      status: turnoForm.status,
    };

    try {
      await persistTurno(payload, selectedTurnoId ? "PATCH" : "POST", selectedTurnoId || null);
      setIsTurnoModalOpen(false);
    } catch (error) {
      setTurnosError(error.message || "No se pudo guardar el turno.");
    } finally {
      setSavingTurno(false);
    }
  };

  const handleToggleTurnoStatus = async (turno) => {
    if (!turno) return;

    try {
      const nextStatus = turno.status === "completado" ? "programado" : "completado";
      await persistTurno({ ...turno, status: nextStatus }, "PATCH", turno.id, {
        resetForm: false,
      });
    } catch (error) {
      setTurnosError(error.message || "No se pudo actualizar el turno.");
    }
  };

  const handleDeleteTurno = async (turnoId) => {
    if (!turnoId) return;

    const shouldDelete =
      typeof window === "undefined" ||
      window.confirm("¿Seguro que deseas eliminar este turno?");

    if (!shouldDelete) return;

    try {
      const response = await api("/turnos", "DELETE", { id: turnoId });

      if (!response.success) {
        throw new Error(response.error || "No se pudo eliminar el turno.");
      }

      await refreshTurnos();
      if (selectedTurnoId === turnoId) {
        resetTurnoForm();
        setIsTurnoModalOpen(false);
      }
    } catch (error) {
      setTurnosError(error.message || "No se pudo eliminar el turno.");
    }
  };

  const handleCalendarEventClick = (info) => {
    const turno = info.event.extendedProps.turno;
    openTurnoForEdit(turno);
  };

  const handleCancelTurnoEdit = () => {
    setIsTurnoModalOpen(false);
    resetTurnoForm();
  };

  const extractTurnoCalendarPayload = (event) => {
    const turno = event?.extendedProps?.turno;

    if (!turno) return null;

    const nextFecha = formatDateInputValue(event.start || getTurnoStartDate(turno)) || getTurnoStartDate(turno);
    const nextFechaFin =
      formatDateInputValue(event.end || getTurnoEndDate(turno)) || getTurnoEndDate(turno);
    const nextHoraInicio = formatTimeInputValue(event.start || turno.hora_inicio) || turno.hora_inicio;
    const nextHoraFin = formatTimeInputValue(event.end || turno.hora_fin) || turno.hora_fin;

    return {
      ...turno,
      fecha: nextFecha,
      fecha_fin: nextFechaFin,
      hora_inicio: nextHoraInicio,
      hora_fin: nextHoraFin,
    };
  };

  const syncTurnoCalendarChange = async (info) => {
    const payload = extractTurnoCalendarPayload(info.event);

    if (!payload?.id) return;

    try {
      setSavingTurno(true);
      await persistTurno(payload, "PATCH", payload.id, { resetForm: false });
    } catch (error) {
      info.revert();
      setTurnosError(error.message || "No se pudo mover el turno.");
    } finally {
      setSavingTurno(false);
    }
  };

  const renderTurnoEvent = (arg) => {
    const turno = arg.event.extendedProps.turno;
    const accentStyle = arg.event.extendedProps.accentStyle || getShiftAccentStyle(turno.vigilante);

    return (
      <div className="turnos-calendar__event" style={accentStyle}>
        <div className="turnos-calendar__event-head">
          <strong>{turno.vigilante || "Sin asignar"}</strong>
          <span>{getTurnoSchedule(turno) || arg.timeText || getTurnoRange(turno)}</span>
        </div>
        <p className="turnos-calendar__event-meta">{turno.puesto || "Porteria principal"}</p>
        {turno.status === "completado" ? (
          <span className="turnos-calendar__event-badge">Completado</span>
        ) : null}
      </div>
    );
  };

  const turnosContext = turnosLoading ? (
    <div className="loading-state" style={{ marginTop: 20 }}>
      <span className="skeleton skeleton--lg" />
      <span className="skeleton skeleton--md" />
      <span className="skeleton skeleton--lg" />
      <span className="skeleton skeleton--sm" />
    </div>
  ) : null;

  const turnoModalTitle = selectedTurnoId ? "Editar turno" : "Nuevo turno";
  const turnoModalSubtitle = selectedTurnoId
    ? "Ajusta el rango de fechas, las horas, el puesto o el estado sin salir del dashboard."
    : "Agenda un turno por rango de fechas y sincronizalo con Supabase en segundos.";

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
              <h2 className="section-title admin-hero__title">
                Controla reportes y turnos desde un solo lugar
              </h2>
              <p className="section-subtitle admin-hero__subtitle">
                Filtra los ingresos por fecha, vigilante o tipo de visita y mantiene una
                planeacion operativa de los vigilantes con FullCalendar y Supabase.
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
                        <span style={{ width: `${getPercent(item.value, reportRows.length)}%` }} />
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
                        <td>
                          {item.pago_administracion ? formatTime(item.fecha_pago_administracion) : "--"}
                        </td>
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
            <article className="panel admin-section fade-up admin-section--summary">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Panel de turnos</h2>
                  <p className="section-subtitle">
                    Usa el modal para crear o editar y arrastra los eventos para reprogramarlos.
                  </p>
                </div>
                <div className="shift-card__actions admin-section__actions">
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => openTurnoForCreate()}
                  >
                    Nuevo turno
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={refreshTurnos}
                    disabled={turnosLoading}
                  >
                    {turnosLoading ? "Actualizando..." : "Refrescar"}
                  </button>
                </div>
              </div>

              <div className="turnos-summary-card">
                <div className="turnos-summary-card__lead">
                  <span className="turnos-summary-card__label">Edicion rapida</span>
                  <p className="turnos-summary-card__title">
                    Organiza turnos desde el calendario, sin perder contexto.
                  </p>
                  <p className="turnos-summary-card__text">
                    Abre el modal para nuevos turnos y usa drag & drop o resize para mover
                    directamente los bloques ya programados.
                  </p>
                </div>

                <div className="stats-grid stats-grid--compact admin-shift-stats">
                  {turnoStats.map((stat, index) => (
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

                {turnosContext}

                <div className="turnos-summary-card__hint">
                  <strong>Atajo:</strong> haz clic en cualquier dia del calendario para abrir el modal
                  con esa fecha precargada.
                </div>
              </div>
            </article>

            <article className="panel admin-section fade-up">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Calendario FullCalendar</h2>
                  <p className="section-subtitle">
                    Vista de agenda conectada a Supabase con colores por vigilante y CRUD directo.
                  </p>
                </div>
                <div className="section-head__actions">
                  <div className="mini-note admin-mini-note">
                    <strong>Turnos:</strong> {turnos.length}
                  </div>
                  <button type="button" className="button button--ghost" onClick={() => openTurnoForCreate()}>
                    Abrir modal
                  </button>
                </div>
              </div>

              <div className="turnos-legend">
                {vigilantes.slice(0, 6).map((vigilante) => {
                  const style = getShiftAccentStyle(vigilante);

                  return (
                    <span key={vigilante} className="turnos-legend__item" style={style}>
                      <span className="turnos-legend__dot" />
                      {vigilante}
                    </span>
                  );
                })}
              </div>

              {turnosError ? <div className="empty-state">{turnosError}</div> : null}

              <div className="turnos-calendar">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale={esLocale}
                  firstDay={1}
                  height="auto"
                  expandRows
                  nowIndicator
                  selectable
                  select={handleCalendarSelect}
                  editable
                  eventStartEditable
                  eventDurationEditable
                  eventDrop={syncTurnoCalendarChange}
                  eventResize={syncTurnoCalendarChange}
                  eventOverlap={false}
                  dayMaxEvents={3}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }}
                  buttonText={{
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Dia",
                  }}
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                  eventClick={handleCalendarEventClick}
                  dateClick={handleCalendarDateClick}
                  events={calendarEvents}
                  eventContent={renderTurnoEvent}
                  eventClassNames={(arg) => [
                    "turnos-calendar__fc-event",
                    arg.event.extendedProps.turno.status === "completado"
                      ? "turnos-calendar__fc-event--done"
                      : "",
                  ]}
                  />
                </div>

              <div className="turnos-side">
                <div className="section-head turnos-side__head">
                  <div>
                    <h3 className="section-title">Proximos turnos</h3>
                    <p className="section-subtitle">
                      Atajos para editar, completar o eliminar registros sin salir del panel.
                    </p>
                  </div>
                </div>

                <div className="stats-grid stats-grid--compact admin-shift-stats">
                  {turnoStats.map((stat, index) => (
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

                {turnosContext}

                {!turnosLoading && upcomingTurnos.length > 0 ? (
                  <div className="turnos-list">
                    {upcomingTurnos.map((turno) => {
                      const style = getShiftAccentStyle(turno.vigilante);

                      return (
                        <article key={turno.id} className="turnos-list__item" style={style}>
                          <div className="turnos-list__head">
                            <div>
                              <strong>{turno.vigilante || "Sin asignar"}</strong>
                              <p>
                                {formatDateRangeLabel(
                                  getTurnoStartDate(turno),
                                  getTurnoEndDate(turno)
                                )}
                              </p>
                            </div>
                            <span className={`status-tag status-tag--mint`}>
                              {turno.status || "programado"}
                            </span>
                          </div>

                          <p className="turnos-list__meta">
                            {getTurnoRange(turno)} - {turno.puesto || "Porteria principal"}
                          </p>
                          {turno.observaciones ? (
                            <p className="turnos-list__notes">{turno.observaciones}</p>
                          ) : null}

                          <div className="shift-card__actions turnos-list__actions">
                            <button
                              type="button"
                              className="button button--ghost"
                              onClick={() => openTurnoForEdit(turno)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="button button--soft"
                              onClick={() => handleToggleTurnoStatus(turno)}
                            >
                              {turno.status === "completado" ? "Reabrir" : "Completar"}
                            </button>
                            <button
                              type="button"
                              className="button button--soft"
                              onClick={() => handleDeleteTurno(turno.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : turnosLoading ? null : (
                  <div className="empty-state">Aun no hay turnos sincronizados.</div>
                )}
              </div>
            </article>
          </section>

          {isTurnoModalOpen ? (
            <div
              className="turno-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="turno-modal-title"
              onClick={handleCancelTurnoEdit}
            >
              <div className="turno-modal__backdrop" />
              <div className="turno-modal__card" onClick={(event) => event.stopPropagation()}>
                <div className="turno-modal__header">
                  <div>
                    <p className="turno-modal__eyebrow">Planificacion operativa</p>
                    <h3 id="turno-modal-title" className="turno-modal__title">
                      {turnoModalTitle}
                    </h3>
                    <p className="turno-modal__subtitle">{turnoModalSubtitle}</p>
                  </div>
                  <button type="button" className="turno-modal__close" onClick={handleCancelTurnoEdit}>
                    Cerrar
                  </button>
                </div>

                {selectedTurnoId ? (
                  <div className="turno-modal__selected">
                    <span className="turno-modal__selected-label">Editando</span>
                    <strong>{editingTurno?.vigilante || "Turno sin nombre"}</strong>
                    <span>
                      {editingTurno
                        ? formatDateRangeLabel(
                            getTurnoStartDate(editingTurno),
                            getTurnoEndDate(editingTurno)
                          )
                        : "--"}
                    </span>
                  </div>
                ) : null}

                <form className="form admin-form turno-modal__form" onSubmit={handleTurnoSubmit}>
                  <div className="turno-modal__grid">
                    <div className="field-group">
                      <label className="field-label" htmlFor="turno-vigilante">
                        Vigilante
                      </label>
                      <input
                        id="turno-vigilante"
                        name="vigilante"
                        className="input"
                        list="vigilantes-sugeridos"
                        value={turnoForm.vigilante || defaultTurnoVigilante}
                        onChange={handleTurnoChange}
                        placeholder="Nombre del vigilante"
                        required
                      />
                      <datalist id="vigilantes-sugeridos">
                        {vigilantes.map((vigilante) => (
                          <option key={vigilante} value={vigilante} />
                        ))}
                      </datalist>
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="turno-fecha">
                        Fecha inicio
                      </label>
                      <input
                        id="turno-fecha"
                        name="fecha"
                        type="date"
                        className="input"
                        value={turnoForm.fecha}
                        onChange={handleTurnoChange}
                        required
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="turno-fecha-fin">
                        Fecha fin
                      </label>
                      <input
                        id="turno-fecha-fin"
                        name="fecha_fin"
                        type="date"
                        className="input"
                        value={turnoForm.fecha_fin}
                        onChange={handleTurnoChange}
                        required
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="turno-start">
                        Hora inicio
                      </label>
                      <input
                        id="turno-start"
                        name="hora_inicio"
                        type="time"
                        className="input"
                        value={turnoForm.hora_inicio}
                        onChange={handleTurnoChange}
                        required
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="turno-end">
                        Hora fin
                      </label>
                      <input
                        id="turno-end"
                        name="hora_fin"
                        type="time"
                        className="input"
                        value={turnoForm.hora_fin}
                        onChange={handleTurnoChange}
                        required
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="turno-status">
                        Estado
                      </label>
                      <select
                        id="turno-status"
                        name="status"
                        className="select"
                        value={turnoForm.status}
                        onChange={handleTurnoChange}
                      >
                        <option value="programado">Programado</option>
                        <option value="en curso">En curso</option>
                        <option value="completado">Completado</option>
                      </select>
                    </div>

                    <div className="field-group field-group--full">
                      <label className="field-label" htmlFor="turno-puesto">
                        Puesto
                      </label>
                      <select
                        id="turno-puesto"
                        name="puesto"
                        className="select"
                        value={turnoForm.puesto}
                        onChange={handleTurnoChange}
                      >
                        <option value="Porteria principal">Porteria principal</option>
                        <option value="Parqueadero">Parqueadero</option>
                        <option value="Ronda interna">Ronda interna</option>
                        <option value="Apoyo operativo">Apoyo operativo</option>
                      </select>
                    </div>

                    <div className="field-group field-group--full">
                      <label className="field-label" htmlFor="turno-notes">
                        Observaciones
                      </label>
                      <textarea
                        id="turno-notes"
                        name="observaciones"
                        className="textarea"
                        rows="4"
                        placeholder="Ej. Cubrir descanso, apoyo en ingreso de visitantes, relevos..."
                        value={turnoForm.observaciones}
                        onChange={handleTurnoChange}
                      />
                    </div>
                  </div>

                  <div className="turno-modal__actions">
                    <button className="button button--primary" type="submit" disabled={savingTurno}>
                      {savingTurno
                        ? "Guardando..."
                        : selectedTurnoId
                        ? "Actualizar turno"
                        : "Agregar turno"}
                    </button>

                    <button
                      type="button"
                      className="button button--soft"
                      onClick={handleCancelTurnoEdit}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}
