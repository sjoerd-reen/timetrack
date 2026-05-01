"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const nav = [
  { href: "/",      label: "Projecten",    icon: HomeIcon },
  { href: "/team",  label: "Teamleden",    icon: UsersIcon },
  { href: "/stats", label: "Statistieken", icon: ChartIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 flex flex-col min-h-screen shrink-0 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #0f172a 100%)" }}
    >
      {/* Ambient glow at top */}
      <div
        className="absolute -top-16 -left-8 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
      />

      {/* Brand */}
      <div className="relative px-5 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 animate-fade-in"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: "0 0 18px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            TT
          </div>
          <div className="animate-fade-in delay-50">
            <div className="font-semibold text-sm text-white tracking-tight">TimeTrack</div>
            <div className="text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>
              Projectmanagement
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 pt-5 pb-3 space-y-0.5">
        <div
          className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3 animate-fade-in delay-100"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Navigatie
        </div>

        {nav.map((n, i) => {
          const active =
            n.href === "/"
              ? pathname === "/" || pathname.startsWith("/project")
              : pathname.startsWith(n.href);

          return (
            <Link
              key={n.href}
              href={n.href}
              className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 animate-slide-in-left"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              {/* Active fill */}
              {active && (
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: "rgba(99,102,241,0.18)",
                    border: "1px solid rgba(99,102,241,0.35)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                />
              )}

              {/* Hover fill */}
              {!active && (
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              )}

              {/* Icon */}
              <div
                className="relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        boxShadow: "0 0 12px rgba(99,102,241,0.5)",
                        color: "#fff",
                      }
                    : { color: "rgba(255,255,255,0.35)" }
                }
              >
                <n.icon />
              </div>

              {/* Label */}
              <span
                className="relative transition-colors duration-200"
                style={{ color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)" }}
              >
                {n.label}
              </span>

              {/* Active indicator dot */}
              {active && (
                <div
                  className="relative ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "#818cf8", boxShadow: "0 0 6px rgba(129,140,248,0.8)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="relative px-5 py-4 animate-fade-in delay-500"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.18)" }}>
          TimeTrack v1.0
        </div>
      </div>
    </aside>
  );
}
