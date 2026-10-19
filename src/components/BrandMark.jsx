import { Link } from "react-router-dom";
export default function BrandMark({ to = "/", label, className = "" }) {
  return (
    <Link to={to} className={`brand-mark ${className}`}>
      <img src="/logo.jpg" alt="" width="36" height="36" />
      <strong className="brand-text">URPAQ</strong>
      {label && <span className="brand-label">{label}</span>}
    </Link>
  );
}
