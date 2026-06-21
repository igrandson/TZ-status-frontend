import type { HourlyBucket, ServiceStatus, StatusItem } from "../api/tzStatus";

export interface ServiceEntry {
  id: number;
  name: string;
  category: string;
  status: ServiceStatus;
  health: number;
  avgResponse: number;
  lastChecked: Date | null;
  trend: number[];
}

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Incident {
  id: string;
  service: string;
  severity: Severity;
  description: string;
  startedAt: Date;
  regions: string[];
}

export const CATEGORIES = [
  { id: "government", label: "Government", emoji: "🏛️" },
  { id: "bank", label: "Banks", emoji: "🏦" },
  { id: "telecom", label: "Telecom", emoji: "📡" },
  { id: "mobile_money", label: "Mobile Money", emoji: "💸" },
  { id: "airlines", label: "Airlines", emoji: "✈️" },
  { id: "transport", label: "Transportation", emoji: "🚆" },
  { id: "ecommerce", label: "E-Commerce", emoji: "🛒" },
  { id: "app", label: "Apps & E-commerce", emoji: "📱" },
  { id: "media", label: "Media", emoji: "📺" },
  { id: "universities", label: "Universities", emoji: "🎓" },
];

export const domainMap: Record<string, string> = {
  NIDA: "nida.go.tz",
  TRA: "tra.go.tz",
  BRELA: "brela.go.tz",
  HESLB: "heslb.go.tz",
  "Ajira Portal": "ajira.go.tz",
  "eGA Portal": "ega.go.tz",
  "eGA / Government Portal": "ega.go.tz",
  NSSF: "nssf.go.tz",
  NHIF: "nhif.or.tz",
  "Immigration eServices": "immigration.go.tz",
  "eCitizen Tanzania": "eservices.gov.go.tz",
  "Judiciary Portal": "judiciary.go.tz",
  GePG: "gepg.go.tz",
  TANePS: "taneps.go.tz",
  TCRA: "tcra.go.tz",
  OSHA: "osha.go.tz",
  LATRA: "latra.go.tz",
  TBS: "tbs.go.tz",
  TMDA: "tmda.go.tz",
  WCF: "wcf.go.tz",
  RITA: "rita.go.tz",
  NECTA: "necta.go.tz",
  NACTVET: "nactvet.go.tz",
  TCU: "tcu.go.tz",
  TIC: "tic.go.tz",
  TANESCO: "tanesco.co.tz",
  EWURA: "ewura.go.tz",
  "Ministry of Education Portal": "moe.go.tz",
  "Ministry of Health Systems": "moh.go.tz",
  CRDB: "crdbbank.co.tz",
  "CRDB Bank": "crdbbank.co.tz",
  NMB: "nmbbank.co.tz",
  "NMB Bank": "nmbbank.co.tz",
  NBC: "nbc.co.tz",
  "NBC Bank": "nbc.co.tz",
  Stanbic: "stanbicbank.co.tz",
  "Stanbic Bank Tanzania": "stanbicbank.co.tz",
  DTB: "dtbtanzania.com",
  "DTB Tanzania": "dtbtanzania.com",
  Exim: "eximbank-tz.com",
  "Exim Bank Tanzania": "eximbank-tz.com",
  Equity: "equitygroupholdings.com",
  "Equity Bank Tanzania": "equitygroupholdings.com",
  Absa: "absa.co.tz",
  "Absa Bank Tanzania": "absa.co.tz",
  KCB: "kcbgroup.com",
  "Access Bank": "accessbankplc.com",
  "Akiba Commercial Bank": "akibabank.com",
  UBA: "ubagroup.com",
  Ecobank: "ecobank.com",
  "Standard Chartered": "sc.com",
  BOA: "boabank.co.tz",
  "Mkombozi Bank": "mkombozibank.co.tz",
  "Amana Bank": "amanabank.co.tz",
  Vodacom: "vodacom.co.tz",
  "Vodacom Tanzania": "vodacom.co.tz",
  Airtel: "airtel.co.tz",
  "Airtel Tanzania": "airtel.co.tz",
  "Yas (Tigo)": "yas.co.tz",
  Halotel: "halotel.co.tz",
  TTCL: "ttcl.co.tz",
  Zantel: "zantel.co.tz",
  "M-Pesa": "vodacom.co.tz",
  "M-Pesa Tanzania": "vodacom.co.tz",
  "Airtel Money": "airtel.co.tz",
  Mixx: "yas.co.tz",
  "Mixx by Yas (Tigo Pesa)": "yas.co.tz",
  Halopesa: "halotel.co.tz",
  "T-Pesa": "ttcl.co.tz",
  Selcom: "selcommobile.com",
  NALA: "nala.money",
  "Azam Pesa": "azampesa.co.tz",
  "Air Tanzania": "airtanzania.co.tz",
  "Precision Air": "precisionairtz.com",
  Flightlink: "flightlink.co.tz",
  "Auric Air": "auricair.com",
  TRC: "trc.co.tz",
  "Tanzania Railways Corporation": "trc.co.tz",
  "SGR Ticketing": "trc.co.tz",
  TAZARA: "tazara.co.tz",
  Bolt: "bolt.eu",
  Uber: "uber.com",
  Yango: "yango.com",
  "Little Ride": "little.bz",
  Jumia: "jumia.co.tz",
  "Jumia Tanzania": "jumia.co.tz",
  Kilimall: "kilimall.co.tz",
  "Kilimall Tanzania": "kilimall.co.tz",
  "Zoom Tanzania": "zoomtanzania.com",
  Kupatana: "kupatana.com",
  "Azam TV": "azamtv.co.tz",
  "DSTV Tanzania": "dstv.com",
  "Wasafi FM": "wasafi.media",
  "Clouds FM": "cloudsfm.com",
  ITV: "itv.co.tz",
  TBC: "tbc.go.tz",
  Mwananchi: "mwananchi.co.tz",
  UDSM: "udsm.ac.tz",
  ARU: "aru.ac.tz",
  OUT: "out.ac.tz",
  ATC: "atc.ac.tz",
  SUA: "sua.ac.tz",
  MUHAS: "muhas.ac.tz",
  IFM: "ifm.ac.tz",
  CBE: "cbe.ac.tz",
  Mzumbe: "mzumbe.ac.tz",
  UDOM: "udom.ac.tz",
};

export function statusToHealth(
  status: ServiceStatus,
  isUp: boolean | null,
  responseMs: number | null,
): number {
  if (status === null || isUp === null) return 0;
  if (status === "down" || !isUp) return 12;
  if (status === "degraded") return 52;
  if (!responseMs) return 92;
  if (responseMs < 500) return 98;
  if (responseMs < 1500) return 92;
  if (responseMs < 3000) return 85;
  return 72;
}

export function hourlyToTrend(hourly: HourlyBucket[]): number[] {
  if (!hourly.length) return [];
  return hourly.map((h) => h.uptime_pct);
}

export function mapStatusItem(item: StatusItem, trend: number[] = []): ServiceEntry {
  return {
    id: item.id,
    name: item.service,
    category: item.category,
    status: item.status,
    health: statusToHealth(item.status, item.is_up, item.response_time_ms),
    avgResponse: item.response_time_ms ?? 0,
    lastChecked: item.last_checked ? new Date(item.last_checked) : null,
    trend,
  };
}

export function healthLabel(h: number): string {
  if (h >= 90) return "Excellent";
  if (h >= 75) return "Good";
  if (h >= 55) return "Slow";
  if (h >= 30) return "Major Issues";
  return "Down";
}

export function healthColor(h: number, dark = false): string {
  if (h >= 90) return dark ? "#4ade80" : "#16a34a";
  if (h >= 75) return dark ? "#86efac" : "#22c55e";
  if (h >= 55) return dark ? "#fbbf24" : "#d97706";
  if (h >= 30) return dark ? "#fb923c" : "#ea580c";
  return dark ? "#f87171" : "#dc2626";
}

export function healthBg(h: number): string {
  if (h >= 90) return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400";
  if (h >= 75) return "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400";
  if (h >= 55) return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400";
  if (h >= 30) return "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400";
  return "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400";
}

export function severityColor(s: Severity): string {
  return {
    LOW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  }[s];
}

export function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function incidentsFromServices(services: ServiceEntry[]): Incident[] {
  return services
    .filter((s) => s.status === "down" || s.status === "degraded")
    .map((s) => ({
      id: String(s.id),
      service: s.name,
      severity: s.status === "down" ? "CRITICAL" : "HIGH",
      description:
        s.status === "down"
          ? "Service is unreachable or not responding."
          : `Elevated response time (${s.avgResponse}ms).`,
      startedAt: s.lastChecked ?? new Date(),
      regions: ["Nationwide"],
    }));
}
