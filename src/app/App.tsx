import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sun, Moon, Search, AlertTriangle, CheckCircle2, ZapOff,
  TrendingDown, Users, Activity, Award, History, Share2, ExternalLink,
  LayoutDashboard, Server, AlertCircle, RefreshCw,
} from "lucide-react";
import {
  fetchStatus,
  fetchHourlyAnalytics,
  fetchDailyAnalytics,
  reportOutage,
} from "./api/tzStatus";
import {
  type ServiceEntry,
  type Incident,
  CATEGORIES,
  domainMap,
  mapStatusItem,
  hourlyToTrend,
  healthLabel,
  healthColor,
  healthBg,
  severityColor,
  timeAgo,
  incidentsFromServices,
} from "./lib/statusUtils";
import { getStoredDarkMode, setStoredDarkMode } from "./lib/theme";

type Tab = "overview" | "services" | "incidents" | "leaderboard" | "history";

function Sparkline({ values, health }: { values: number[]; health: number }) {
  if (values.length < 2) {
    return <div className="w-full h-7 bg-secondary/50 rounded-lg" />;
  }
  const color = healthColor(health);
  const fill = health >= 75 ? "rgba(34,197,94,0.07)" : health >= 55 ? "rgba(245,158,11,0.07)" : health >= 30 ? "rgba(234,88,12,0.07)" : "rgba(220,38,38,0.07)";
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 100;
  const H = 28;
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${H - ((v - min) / range) * (H - 4) - 2}`).join(" ");
  const first = `0,${H - ((values[0] - min) / range) * (H - 4) - 2}`;
  const last = `${W},${H - ((values[values.length - 1] - min) / range) * (H - 4) - 2}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-7">
      <path d={`M ${first} L ${pts} L ${last} L ${W},${H} L 0,${H} Z`} fill={fill} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HealthRing({ health, size = 56 }: { health: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (health / 100) * circ;
  const color = healthColor(health);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-border opacity-40" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color, fontSize: size < 48 ? 10 : 12 }}>
        {health}
      </span>
    </div>
  );
}

function ServiceCard({ svc, onClick, onOpenWindow }: { svc: ServiceEntry; onClick: () => void; onOpenWindow?: (service: ServiceEntry) => void }) {
  const [imgErr, setImgErr] = useState(false);
  const domain = domainMap[svc.name];
  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
  const borderTop =
    svc.health >= 75 ? "border-t-emerald-400" :
    svc.health >= 55 ? "border-t-amber-400" :
    svc.health >= 30 ? "border-t-orange-400" : "border-t-red-500";
  return (
    <button onClick={onClick}
      className={`group w-full text-left bg-card border border-border border-t-2 ${borderTop} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 relative`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {favicon && !imgErr
            ? <img src={favicon} alt="" className="w-6 h-6 rounded-md shrink-0 bg-secondary object-contain" onError={() => setImgErr(true)} />
            : <div className="w-6 h-6 rounded-md shrink-0 bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">{svc.name.charAt(0)}</div>
          }
          <span className="text-sm font-semibold text-foreground truncate">{svc.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenWindow && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenWindow(svc); }}
              className="p-1 rounded-lg hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
              title="Open in new window">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <HealthRing health={svc.health} size={44} />
        </div>
      </div>
      <Sparkline values={svc.trend} health={svc.health} />
      <div className="flex items-center justify-between mt-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${healthBg(svc.health)}`}>
          {healthLabel(svc.health)}
        </span>
        <span className="text-xs text-muted-foreground font-mono">{svc.avgResponse ? `${svc.avgResponse}ms` : "—"}</span>
      </div>
    </button>
  );
}

function ServiceModal({ svc, onClose, onOpenWindow }: { svc: ServiceEntry; onClose: () => void; onOpenWindow?: (svc: ServiceEntry) => void }) {
  const [hourly, setHourly] = useState<{ hour: number; uptime_pct: number; avg_response_ms: number | null }[]>([]);
  const [daily, setDaily] = useState<{ date: string; uptime_pct: number; avg_response_ms: number | null }[]>([]);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchHourlyAnalytics(svc.id, 7),
      fetchDailyAnalytics(svc.id, 30),
    ]).then(([h, d]) => {
      if (cancelled) return;
      setHourly(h.hourly);
      setDaily(d.daily);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [svc.id]);

  async function handleReport() {
    setReporting(true);
    try {
      await reportOutage(svc.id);
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border rounded-t-3xl px-6 pt-5 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{svc.name}</h2>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">
              {CATEGORIES.find(c => c.id === svc.category)?.label ?? svc.category}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HealthRing health={svc.health} size={52} />
            <div className="flex gap-2">
              {onOpenWindow && (
                <button onClick={() => onOpenWindow(svc)} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground" title="Open in new window">
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">✕</button>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-foreground capitalize" style={{ fontFamily: "'DM Mono', monospace" }}>{svc.status ?? "unknown"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Current status</p>
            </div>
            <div className="bg-secondary rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{svc.avgResponse ? `${svc.avgResponse}ms` : "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Response time</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Uptime trend (7 days, by hour)</p>
            <div className="bg-secondary rounded-2xl p-4">
              <Sparkline values={hourly.map(h => h.uptime_pct)} health={svc.health} />
            </div>
          </div>
          {daily.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily uptime (30 days)</p>
              <div className="space-y-1.5">
                {daily.slice(-7).map(d => (
                  <div key={d.date} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground font-mono w-24">{d.date}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-400" style={{ width: `${d.uptime_pct}%` }} />
                    </div>
                    <span className="text-foreground font-medium w-16 text-right text-xs">{d.uptime_pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleReport}
            disabled={reporting}
            className="w-full py-2.5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            {reporting ? "Sending report…" : "Report an Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveStats({ services }: { services: ServiceEntry[] }) {
  const online = services.filter(s => s.status === "up").length;
  const issues = services.filter(s => s.status === "down" || s.status === "degraded").length;
  const avgResp = services.length
    ? Math.floor(services.reduce((a, s) => a + s.avgResponse, 0) / services.filter(s => s.avgResponse).length || 1)
    : 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {[
        { label: "Total Monitored", value: services.length, icon: <Users className="w-4 h-4" />, color: "text-violet-600 dark:text-violet-400" },
        { label: "Operational", value: online, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-600 dark:text-emerald-400" },
        { label: "Issues Detected", value: issues, icon: <AlertCircle className="w-4 h-4" />, color: "text-red-500 dark:text-red-400" },
        { label: "Avg Response", value: avgResp ? `${avgResp}ms` : "—", icon: <Activity className="w-4 h-4" />, color: "text-amber-600 dark:text-amber-400" },
      ].map(({ label, value, icon, color }) => (
        <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className={`${color} shrink-0`}>{icon}</div>
          <div>
            <p className="text-xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function IncidentsList({ incidents }: { incidents: Incident[] }) {
  if (!incidents.length) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">No active issues detected</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {incidents.map(inc => (
        <div key={inc.id} className="bg-card border border-border rounded-2xl px-4 py-3 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start gap-3 min-w-0">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${severityColor(inc.severity)}`}>{inc.severity}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{inc.service}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{inc.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{timeAgo(inc.startedAt)} · {inc.regions.join(", ")}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewTab({ services, incidents, onServiceClick, onOpenWindow }: { services: ServiceEntry[]; incidents: Incident[]; onServiceClick: (s: ServiceEntry) => void; onOpenWindow: (s: ServiceEntry) => void }) {
  const critical = services.filter(s => s.status === "down").slice(0, 6);
  return (
    <div className="space-y-10">
      <LiveStats services={services} />
      <section>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <AlertCircle className="w-4 h-4 text-red-500" /> Active Issues
          {incidents.length > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">{incidents.length}</span>
          )}
        </h2>
        <IncidentsList incidents={incidents} />
      </section>
      {critical.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <ZapOff className="w-4 h-4 text-red-500" /> Down Services
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {critical.map(svc => <ServiceCard key={svc.id} svc={svc} onClick={() => onServiceClick(svc)} onOpenWindow={onOpenWindow} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ServicesTab({ services, onServiceClick, query, onOpenWindow }: { services: ServiceEntry[]; onServiceClick: (s: ServiceEntry) => void; query: string; onOpenWindow: (s: ServiceEntry) => void }) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const filtered = services.filter(s => {
    const matchCat = !activeCat || s.category === activeCat;
    const matchQ = !query || s.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });
  const displayCats = activeCat ? CATEGORIES.filter(c => c.id === activeCat) : CATEGORIES;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveCat(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!activeCat ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
          All
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeCat === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>
      {displayCats.map(cat => {
        const catServices = filtered.filter(s => s.category === cat.id);
        if (!catServices.length) return null;
        return (
          <section key={cat.id} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">{cat.emoji}</span>
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{cat.label}</h2>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full font-medium">{catServices.length}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {catServices.map(svc => <ServiceCard key={svc.id} svc={svc} onClick={() => onServiceClick(svc)} onOpenWindow={onOpenWindow} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function LeaderboardTab({ services }: { services: ServiceEntry[] }) {
  const sorted = [...services].sort((a, b) => b.health - a.health);
  const best = sorted.slice(0, 10);
  const worst = sorted.slice(-10).reverse();
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <section>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <Award className="w-4 h-4 text-emerald-500" /> Most Reliable
        </h2>
        <div className="space-y-2">
          {best.map((svc, i) => (
            <div key={svc.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
              <span className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{svc.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{CATEGORIES.find(c => c.id === svc.category)?.label}</p>
              </div>
              <span className="text-sm font-bold" style={{ color: healthColor(svc.health), fontFamily: "'DM Mono', monospace" }}>{svc.health}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <TrendingDown className="w-4 h-4 text-red-500" /> Worst Services
        </h2>
        <div className="space-y-2">
          {worst.map((svc, i) => (
            <div key={svc.id} className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
              <span className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-xs font-bold text-red-500 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{svc.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{CATEGORIES.find(c => c.id === svc.category)?.label}</p>
              </div>
              <span className="text-sm font-bold" style={{ color: healthColor(svc.health), fontFamily: "'DM Mono', monospace" }}>{svc.health}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HistoryTab() {
  return (
    <div className="bg-secondary border border-border rounded-2xl p-8 text-center">
      <History className="w-10 h-10 text-violet-500 mx-auto mb-3" />
      <p className="text-sm font-semibold text-foreground mb-2">Historical data builds over time</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        The TZ Status backend checks services every 60 seconds. Open any service card to view its daily and hourly analytics as data accumulates.
      </p>
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(getStoredDarkMode);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ServiceEntry | null>(null);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(new Date());
  const bcRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for multi-window sync
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel("tz-status-sync");
      bcRef.current.onmessage = (event) => {
        if (event.data.type === "service-selected") {
          setSelected(event.data.service);
          setTab("overview");
        } else if (event.data.type === "services-updated") {
          setServices(event.data.services);
        }
      };
    } catch {
      console.debug("BroadcastChannel not available");
    }
    return () => {
      bcRef.current?.close();
    };
  }, []);

  const handleOpenWindow = (service: ServiceEntry) => {
    const url = new URL(window.location.href);
    url.searchParams.set("service", service.id.toString());
    url.searchParams.set("autoOpen", "true");
    window.open(url.toString(), `tz-status-${service.id}`, "width=1200,height=800,resizable=yes");
  };

  const loadServices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const status = await fetchStatus();
      const withTrends = await Promise.all(
        status.map(async (item) => {
          try {
            const analytics = await fetchHourlyAnalytics(item.id, 7);
            return mapStatusItem(item, hourlyToTrend(analytics.hourly));
          } catch {
            return mapStatusItem(item);
          }
        }),
      );
      setServices(withTrends);
      // Broadcast updated services to other windows
      bcRef.current?.postMessage({ type: "services-updated", services: withTrends });
    } catch {
      setError("Can't reach the TZ Status API. Make sure uvicorn is running (port 8000).");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
    const poll = setInterval(() => loadServices(true), 15000);
    return () => clearInterval(poll);
  }, [loadServices]);

  // Handle URL parameters for opening a specific service
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serviceId = params.get("service");
    if (serviceId && services.length > 0) {
      const svc = services.find(s => s.id === parseInt(serviceId));
      if (svc) {
        setSelected(svc);
        // Broadcast to other windows if needed
        bcRef.current?.postMessage({ type: "service-selected", service: svc });
      }
    }
  }, [services]);

  useEffect(() => {
    setStoredDarkMode(dark);
  }, [dark]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const incidents = incidentsFromServices(services);
  const totalDown = services.filter(s => s.status === "down").length;
  const allGood = services.length > 0 && totalDown === 0 && incidents.length === 0;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "services", label: "Services", icon: <Server className="w-4 h-4" /> },
    { id: "incidents", label: "Incidents", icon: <AlertCircle className="w-4 h-4" /> },
    { id: "leaderboard", label: "Leaderboard", icon: <Award className="w-4 h-4" /> },
    { id: "history", label: "History", icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300"
      style={{ fontFamily: "'DM Sans', sans-serif", scrollBehavior: "smooth" }}>

      <div className="relative overflow-hidden" style={{
        background: dark
          ? "linear-gradient(135deg, #1a1010 0%, #16100c 40%, #0f1a10 100%)"
          : "linear-gradient(135deg, #fdf4ff 0%, #fefaf6 40%, #f0fdf4 100%)",
      }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)", transform: "translate(30%,-30%)" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none opacity-10"
          style={{ background: "radial-gradient(circle, #34d399, transparent 70%)", transform: "translate(-30%,30%)" }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div>
              <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                TZ <span className="text-violet-600 dark:text-violet-400">STATUS</span>
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">National Infrastructure Monitor · live data</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/70 border border-border rounded-full px-3 py-1.5 backdrop-blur-sm">
                <div className={`w-1.5 h-1.5 rounded-full ${error ? "bg-amber-500" : services.length > 0 && services.filter(s => s.status === "down").length === 0 ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
                <span style={{ fontFamily: "'DM Mono', monospace" }}>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
              <button onClick={() => loadServices(true)} disabled={refreshing}
                className="p-2 rounded-full bg-card/70 border border-border hover:bg-secondary transition-colors backdrop-blur-sm disabled:opacity-50"
                title="Refresh">
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setDark((d) => !d)}
                className="p-2 rounded-full bg-card/70 border border-border hover:bg-secondary transition-colors backdrop-blur-sm">
                {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-600" />}
              </button>
            </div>
          </div>

          <div className="text-center max-w-2xl mx-auto mb-6">
            {error ? (
              <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            ) : services.length > 0 && services.filter(s => s.status === "down").length === 0 && incidents.length === 0 ? (
              <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                <CheckCircle2 className="w-4 h-4" /> All systems operational
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                <AlertCircle className="w-4 h-4" /> {incidents.length} issue{incidents.length !== 1 ? "s" : ""} detected
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight mb-2"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Tanzania&apos;s digital pulse,{" "}
              <span className="text-violet-600 dark:text-violet-400">live</span>
            </h1>
            <p className="text-muted-foreground">
              {services.length ? `Monitoring ${services.length} services` : "Connecting to TZ Status backend…"}
            </p>
          </div>

          <div className="relative max-w-xl mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Search a service..." value={query}
              onChange={e => { setQuery(e.target.value); if (tab !== "services") setTab("services"); }}
              className="w-full pl-11 pr-4 py-3 bg-card/80 border border-border rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground backdrop-blur-sm" />
          </div>

          <div className="flex items-center justify-center gap-1 flex-wrap">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-card/70"}`}>
                {t.icon} <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading && !services.length ? (
          <div className="text-center py-16 text-muted-foreground">Loading live status from TZ Status API…</div>
        ) : (
          <>
            {tab === "overview" && <OverviewTab services={services} incidents={incidents} onServiceClick={setSelected} onOpenWindow={handleOpenWindow} />}
            {tab === "services" && <ServicesTab services={services} onServiceClick={setSelected} query={query} onOpenWindow={handleOpenWindow} />}
            {tab === "incidents" && <IncidentsList incidents={incidents} />}
            {tab === "leaderboard" && <LeaderboardTab services={services} />}
            {tab === "history" && <HistoryTab />}
          </>
        )}
      </div>

      <footer className="border-t border-border bg-card/60 backdrop-blur-sm mt-8">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            TZ <span className="text-violet-600 dark:text-violet-400">STATUS</span>
          </span>
          <p className="text-xs text-muted-foreground text-center" style={{ fontFamily: "'DM Mono', monospace" }}>
            checks every 60s · {services.length} services · connected to backend 🇹🇿
          </p>
        </div>
      </footer>

      {selected && <ServiceModal svc={selected} onClose={() => setSelected(null)} onOpenWindow={handleOpenWindow} />}
    </div>
  );
}
