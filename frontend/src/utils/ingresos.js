export function getVigilanteName(user) {
  const metadata = user?.user_metadata || {};
  const candidate =
    metadata.full_name ||
    metadata.name ||
    metadata.nombre ||
    user?.email?.split("@")[0];

  return candidate?.trim() || "Sin asignar";
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
