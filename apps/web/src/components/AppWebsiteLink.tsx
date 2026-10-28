const DEFAULT_DEV_URL = "http://localhost:5173";

export function AppWebsiteLink() {
  const href =
    typeof window !== "undefined" ? window.location.origin : DEFAULT_DEV_URL;

  return (
    <p className="sidebar-website-link">
      <span className="muted">Website: </span>
      <a href={href} target="_blank" rel="noreferrer">
        {href}
      </a>
    </p>
  );
}
