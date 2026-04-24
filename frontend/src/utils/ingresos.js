export function getVigilanteName(user) {
  const metadata = user?.user_metadata || {};
  const candidate =
    metadata.full_name ||
    metadata.name ||
    metadata.nombre ||
    user?.email?.split("@")[0];

  return candidate?.trim() || "Sin asignar";
}

export function getUserRole(user) {
  const metadata = user?.app_metadata || {};
  const role = `${metadata.role || ""}`.trim().toLowerCase();

  if (role === "admin") return "admin";
  return "vigilante";
}

export function isAdminUser(user) {
  return getUserRole(user) === "admin";
}

export function getTipoVisitaLabel(tipo) {
  const normalized = `${tipo || ""}`.toLowerCase();

  if (normalized === "domicilio") return "Domicilio";
  if (normalized === "proveedor") return "Proveedor";
  if (normalized === "residente") return "Residente";
  if (normalized === "visitante") return "Visitante";

  return "Otro";
}

export function getTipoVisitaClass(tipo) {
  const normalized = `${tipo || ""}`.toLowerCase();

  if (normalized === "domicilio") return "status-tag status-tag--slate";
  if (normalized === "proveedor") return "status-tag status-tag--peach";
  if (normalized === "residente") return "status-tag";

  return "status-tag status-tag--amber";
}

export function isPagoAdministracionPagado(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function getPagoAdministracionLabel(value) {
  return isPagoAdministracionPagado(value) ? "Pagado" : "Pendiente";
}

export function getPagoAdministracionClass(value) {
  return isPagoAdministracionPagado(value)
    ? "status-tag status-tag--mint"
    : "status-tag status-tag--amber";
}

const PAGO_ADMINISTRACION_VIGENCIA_DIAS = 30;
const PAGO_ADMINISTRACION_AVISO_DIAS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toValidDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export function getPagoAdministracionVencimiento(fechaPago, vigenciaDias = PAGO_ADMINISTRACION_VIGENCIA_DIAS) {
  const paidDate = toValidDate(fechaPago);
  if (!paidDate) return null;

  return addDays(paidDate, vigenciaDias);
}

export function getPagoAdministracionVencimientoEstado(item, referenceDate = new Date()) {
  if (isPagoAdministracionPagado(item?.pago_administracion)) {
    return {
      label: "Pagado",
      tone: "mint",
      dueDate: toValidDate(item?.fecha_pago_administracion),
      daysLeft: null,
      warning: false,
    };
  }

  if (!item?.fecha_pago_administracion) {
    return {
      label: "Sin pago",
      tone: "muted",
      dueDate: null,
      daysLeft: null,
      warning: false,
    };
  }

  const dueDate = getPagoAdministracionVencimiento(item.fecha_pago_administracion);
  if (!dueDate) {
    return {
      label: "Sin vencimiento",
      tone: "muted",
      dueDate: null,
      daysLeft: null,
      warning: false,
    };
  }

  const daysLeft = Math.ceil((dueDate.getTime() - referenceDate.getTime()) / DAY_MS);

  if (daysLeft < 0) {
    return {
      label: `Vencida hace ${Math.abs(daysLeft)} d`,
      tone: "danger",
      dueDate,
      daysLeft,
      warning: true,
    };
  }

  if (daysLeft <= PAGO_ADMINISTRACION_AVISO_DIAS) {
    return {
      label: daysLeft === 0 ? "Vence hoy" : `Vence en ${daysLeft} d`,
      tone: "amber",
      dueDate,
      daysLeft,
      warning: true,
    };
  }

  return {
    label: "Al día",
    tone: "mint",
    dueDate,
    daysLeft,
    warning: false,
  };
}
