import { Link } from "@tanstack/react-router";
export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground">
        <p>BlockAid · MIT License · open source</p>
        <nav className="flex gap-4">
          <Link to="/guide" className="hover:text-foreground">User guide</Link>
          <Link to="/self-host" className="hover:text-foreground">Self-hosting</Link>
          <a href="https://www.openstreetmap.org/copyright" className="hover:text-foreground">Map data © OpenStreetMap</a>
        </nav>
      </div>
    </footer>
  );
}
