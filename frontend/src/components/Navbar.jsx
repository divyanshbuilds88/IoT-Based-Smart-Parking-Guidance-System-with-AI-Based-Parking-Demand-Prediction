import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/slots", label: "Live Slots" },
  { to: "/controls", label: "Controls" },
  { to: "/prediction", label: "AI Prediction" },
  { to: "/history", label: "History" },
  { to: "/analytics", label: "Analytics" },
  { to: "/system", label: "System Status" },
];

export default function Navbar() {
  return (
    <nav className="sidebar">
      <h2>🅿️ Smart Parking</h2>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}