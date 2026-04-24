import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context";

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-shell__brand-icon">
      <path
        d="M12 3l7 4v10l-7 4-7-4V7l7-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 9h8M8 12h8M8 15h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-shell__nav-icon">
      <path
        d="M4 11.5L12 5l8 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10.7V19h11V10.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EntryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-shell__nav-icon">
      <path
        d="M4.5 8.5h9M4.5 12h7M4.5 15.5h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14.5 6.5l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-shell__nav-icon">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8v4l2.7 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-shell__nav-icon">
      <path
        d="M12 3l7 4v5c0 4.5-3 8.5-7 9-4-.5-7-4.5-7-9V7l7-4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-shell__nav-icon">
      <path
        d="M5 4h10l4 4v12H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 13h6M9 16h6M9 10h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="app-shell__nav-icon">
      <path
        d="M10 7H6.5A1.5 1.5 0 0 0 5 8.5v7A1.5 1.5 0 0 0 6.5 17H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 8l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 12H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const commonNav = [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon, end: true },
  { to: "/ingresos", label: "Ingresos", icon: EntryIcon },
  { to: "/historial", label: "Historial", icon: ClockIcon },
];

const adminNav = [
  { to: "/admin", label: "Administrador", icon: ShieldIcon, end: true },
  { to: "/reportes", label: "Reportes", icon: ReportIcon },
];

function SidebarLink({ to, label, icon, end = false }) {
  const NavIcon = icon;

  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        `app-shell__nav-link ${isActive ? "app-shell__nav-link--active" : ""}`
      }
    >
      <span className="app-shell__nav-link-icon" aria-hidden="true">
        <NavIcon />
      </span>
      <span className="app-shell__nav-link-tooltip" aria-hidden="true">
        {label}
      </span>
    </NavLink>
  );
}

export default function AppShell({ children }) {
  const { isAdmin, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <span className="app-shell__orb app-shell__orb--one" aria-hidden="true" />
        <span className="app-shell__orb app-shell__orb--two" aria-hidden="true" />
        <span className="app-shell__orb app-shell__orb--three" aria-hidden="true" />

        <div className="app-shell__brand" title="Panel operativo">
          <div className="app-shell__brand-mark">
            <BrandMark />
          </div>
        </div>

        <nav className="app-shell__nav" aria-label="Navegacion principal">
          <div className="app-shell__nav-group">
            {commonNav.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
            {isAdmin
              ? adminNav.map((item) => <SidebarLink key={item.to} {...item} />)
              : null}
          </div>
        </nav>

        <div className="app-shell__footer">
          <button
            className="app-shell__logout"
            type="button"
            onClick={handleLogout}
            title="Cerrar sesion"
            aria-label="Cerrar sesion"
          >
            <span className="app-shell__nav-link-icon" aria-hidden="true">
              <LogoutIcon />
            </span>
            <span className="app-shell__nav-link-tooltip" aria-hidden="true">
              Cerrar sesion
            </span>
          </button>
        </div>
      </aside>

      <div className="app-shell__content">{children}</div>
    </div>
  );
}
