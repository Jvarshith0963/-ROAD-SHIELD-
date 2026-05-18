import React, { useState, useEffect, useCallback, useRef } from "react";

// ─── Inline CSS ───────────────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0a0c10;
    --surface:  #111520;
    --card:     #161b2e;
    --border:   #1e2d4a;
    --safe:     #00e5a0;
    --warn:     #ffbe00;
    --danger:   #ff3d5a;
    --info:     #4da6ff;
    --text:     #e2e8f0;
    --muted:    #64748b;
    --accent:   #7c5cfc;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; overflow-x: hidden; }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── Mode toggle bar ── */
  .mode-bar {
    display: flex; align-items: center; gap: 0;
    background: var(--surface); border-bottom: 1px solid var(--border);
  }
  .mode-btn {
    flex: 1; padding: 12px 20px; border: none; cursor: pointer;
    font-family: 'Rajdhani', sans-serif; font-size: 15px; font-weight: 700;
    letter-spacing: 1px; transition: all 0.2s; background: transparent;
    color: var(--muted); border-right: 1px solid var(--border);
  }
  .mode-btn:last-child { border-right: none; }
  .mode-btn.active-live { background: rgba(77,166,255,0.12); color: var(--info); }
  .mode-btn.active-demo { background: rgba(124,92,252,0.12); color: var(--accent); }

  /* ── GPS status bar ── */
  .gps-bar {
    padding: 10px 32px; font-size: 12px; display: flex;
    align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--border); letter-spacing: 0.5px;
  }
  .gps-bar.acquiring { background: rgba(192, 146, 8, 0.06); color: var(--warn); }
  .gps-bar.active    { background: rgba(0,229,160,0.06); color: var(--safe); }
  .gps-bar.error     { background: rgba(255,61,90,0.06);  color: var(--danger); }
  .gps-bar.idle      { background: transparent; color: var(--muted); }
  .gps-retry { padding: 3px 10px; border-radius: 6px; border: 1px solid currentColor;
    background: none; color: inherit; cursor: pointer; font-size: 11px; font-family: inherit; }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 32px; border-bottom: 1px solid var(--border);
    background: linear-gradient(90deg, rgba(44, 166, 182, 0.08) 0%, transparent 100%);
    backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 100;
  }
  .header-logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 36px; height: 36px; background: var(--accent); border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .header-title { font-family: 'Rajdhani', sans-serif; font-size: 22px; font-weight: 700;
    letter-spacing: 1px; color: #fff; }
  .header-subtitle { font-size: 11px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; }
  .ws-badge { display: flex; align-items: center; gap: 6px; font-size: 12px;
    padding: 6px 14px; border-radius: 20px; background: var(--surface); border: 1px solid var(--border); }
  .ws-dot { width: 8px; height: 8px; border-radius: 50%; }
  .ws-dot.connected    { background: var(--safe); box-shadow: 0 0 8px var(--safe); animation: pulse 2s infinite; }
  .ws-dot.disconnected { background: var(--muted); }

  /* ── Main grid ── */
  .main { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: auto auto;
    gap: 20px; padding: 24px 32px; flex: 1; }

  /* ── Cards ── */
  .card {
    background: var(--card); border: 1px solid var(--border); border-radius: 16px;
    padding: 24px; position: relative; overflow: hidden;
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .card::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(135deg, rgba(124,92,252,0.04) 0%, transparent 60%);
    pointer-events: none;
  }
  .card-label { font-size: 11px; color: var(--muted); letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .card-label svg { opacity: 0.7; }

  /* ── Speedometer ── */
  .speed-card { grid-column: 1; grid-row: 1 / 3; display: flex; flex-direction: column; }
  .speedo-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .speedo-svg { width: 240px; height: 240px; }
  .speed-number { font-family: 'Space Mono', monospace; font-size: 52px; font-weight: 700;
    text-align: center; line-height: 1; transition: color 0.4s; }
  .speed-unit { font-size: 18px; color: var(--muted); text-align: center; margin-top: 4px;
    letter-spacing: 2px; text-transform: uppercase; }
  .limit-row { display: flex; align-items: center; justify-content: center;
    gap: 12px; margin-top: 20px; }
  .limit-badge { background: var(--surface); border: 2px solid var(--warn); border-radius: 50%;
    width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center;
    justify-content: center; font-family: 'Space Mono', monospace; font-size: 18px;
    font-weight: 700; color: var(--warn); }
  .limit-label { font-size: 10px; color: var(--muted); margin-top: 2px; }
  .speedo-controls { display: flex; gap: 10px; margin-top: 20px; justify-content: center; }
  .btn { padding: 10px 22px; border-radius: 10px; font-family: 'Rajdhani', sans-serif;
    font-size: 15px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s;
    letter-spacing: 0.5px; }
  .btn-start { background: var(--safe); color: #000; }
  .btn-start:hover { filter: brightness(1.15); }
  .btn-accel { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
  .btn-brake { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* violation state */
  .speed-card.violation { border-color: var(--danger); box-shadow: 0 0 30px rgba(255,61,90,0.15); }
  .speed-card.violation .speed-number { color: var(--danger); }
  .violation-banner {
    background: var(--danger); color: #fff; text-align: center;
    padding: 8px; font-family: 'Rajdhani', sans-serif; font-weight: 700;
    font-size: 14px; letter-spacing: 2px; border-radius: 8px;
    animation: flashRed 1s ease-in-out infinite; margin-top: 12px;
  }

  /* ── Live GPS card extras ── */
  .live-info { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
  .live-row { display: flex; justify-content: space-between; align-items: center;
    padding: 8px 12px; background: var(--surface); border-radius: 8px;
    border: 1px solid var(--border); font-size: 13px; }
  .live-row-label { color: var(--muted); font-size: 11px; letter-spacing: 1px; }
  .live-row-val { font-family: 'Space Mono', monospace; font-size: 13px; }

  /* ── Zone card ── */
  .zone-card { grid-column: 2; grid-row: 1; }
  .zone-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .zone-btn { padding: 14px 10px; border-radius: 10px; border: 1px solid var(--border);
    background: var(--surface); cursor: pointer; text-align: center;
    transition: all 0.2s; font-family: 'Inter', sans-serif; }
  .zone-btn:hover { border-color: var(--accent); }
  .zone-btn.active { border-color: var(--accent); background: rgba(124,92,252,0.15);
    box-shadow: 0 0 16px rgba(124,92,252,0.2); }
  .zone-icon { font-size: 24px; display: block; margin-bottom: 4px; }
  .zone-name { font-size: 12px; font-weight: 600; color: var(--text); }
  .zone-limit { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .zone-alert { margin-top: 16px; padding: 12px 16px; border-radius: 10px;
    background: rgba(255,190,0,0.08); border: 1px solid rgba(255,190,0,0.3);
    font-size: 13px; color: var(--warn); display: flex; align-items: center; gap: 8px; }

  /* ── Weather card ── */
  .weather-card { grid-column: 3; grid-row: 1; }
  .weather-main { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
  .weather-icon { font-size: 48px; line-height: 1; }
  .weather-temp { font-family: 'Space Mono', monospace; font-size: 38px; font-weight: 700; }
  .weather-desc { font-size: 13px; color: var(--muted); margin-top: 4px; text-transform: capitalize; }
  .weather-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stat-item { background: var(--surface); border-radius: 10px; padding: 12px;
    border: 1px solid var(--border); }
  .stat-label { font-size: 10px; color: var(--muted); letter-spacing: 1px;
    text-transform: uppercase; margin-bottom: 4px; }
  .stat-val { font-family: 'Space Mono', monospace; font-size: 16px; font-weight: 700; }
  .weather-alerts-list { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
  .weather-alert { padding: 10px 14px; border-radius: 8px; font-size: 13px; border-left: 3px solid; }
  .weather-alert.CRITICAL { background: rgba(255,61,90,0.08); border-color: var(--danger); color: #ffb3c1; }
  .weather-alert.HIGH     { background: rgba(255,61,90,0.06); border-color: var(--danger); color: #ffb3c1; }
  .weather-alert.MEDIUM   { background: rgba(255,190,0,0.06); border-color: var(--warn); color: var(--warn); }
  .weather-placeholder { display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 160px; gap: 12px; }
  .weather-coords { display: flex; gap: 12px; margin-bottom: 16px; }
  .coord-input { flex: 1; background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 8px 12px; color: var(--text);
    font-family: 'Space Mono', monospace; font-size: 13px; outline: none; }
  .coord-input:focus { border-color: var(--accent); }
  .btn-fetch { background: var(--accent); color: #fff; width: 100%; margin-bottom: 12px; }
  .btn-fetch:hover { filter: brightness(1.15); }

  /* ── ML Prediction card ── */
  .ml-card { grid-column: 2; grid-row: 2; }
  .risk-meter { display: flex; align-items: center; gap: 16px; margin: 16px 0; }
  .risk-bar-wrap { flex: 1; height: 10px; background: var(--surface); border-radius: 5px; overflow: hidden; }
  .risk-bar { height: 100%; border-radius: 5px; transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1); }
  .risk-LOW      { background: var(--safe); }
  .risk-MEDIUM   { background: var(--warn); }
  .risk-HIGH     { background: #ff7a00; }
  .risk-CRITICAL { background: var(--danger); box-shadow: 0 0 12px rgba(255,61,90,0.5); }
  .risk-label { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 18px; min-width: 80px; }
  .ml-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .ml-stat { text-align: center; background: var(--surface); border-radius: 10px;
    padding: 12px 8px; border: 1px solid var(--border); }
  .ml-stat-val { font-family: 'Space Mono', monospace; font-size: 18px; font-weight: 700; }
  .ml-stat-label { font-size: 10px; color: var(--muted); margin-top: 4px; letter-spacing: 1px; }
  .btn-check { background: var(--info); color: #000; font-weight: 700; width: 100%; margin-top: 16px; }
  .btn-check:hover { filter: brightness(1.1); }

  /* ── Alerts panel ── */
  .alerts-card { grid-column: 3; grid-row: 2; }
  .alerts-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px;
    overflow-y: auto; padding-right: 4px; }
  .alerts-list::-webkit-scrollbar { width: 4px; }
  .alerts-list::-webkit-scrollbar-track { background: transparent; }
  .alerts-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .alert-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px;
    border-radius: 10px; border: 1px solid; font-size: 13px;
    animation: slideIn 0.3s ease-out; }
  .alert-item.CRITICAL,.alert-item.HIGH {
    background: rgba(255,61,90,0.08); border-color: rgba(255,61,90,0.3); }
  .alert-item.MEDIUM {
    background: rgba(255,190,0,0.06); border-color: rgba(255,190,0,0.3); }
  .alert-item.LOW {
    background: rgba(77,166,255,0.06); border-color: rgba(77,166,255,0.3); }
  .alert-msg  { flex: 1; line-height: 1.4; }
  .alert-time { font-size: 10px; color: var(--muted); margin-top: 4px; white-space: nowrap; }
  .alert-dismiss { background: none; border: none; color: var(--muted); cursor: pointer;
    font-size: 16px; padding: 0; line-height: 1; flex-shrink: 0; }
  .alert-dismiss:hover { color: var(--text); }
  .no-alerts { display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 100px; gap: 8px; color: var(--muted); font-size: 14px; }

  /* ── Popup alerts ── */
  .popup-container { position: fixed; top: 80px; right: 20px; z-index: 9999;
    display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
  .popup-alert { pointer-events: all; background: var(--card); border: 1px solid var(--danger);
    border-radius: 14px; padding: 16px 20px; min-width: 320px; max-width: 380px;
    box-shadow: 0 8px 32px rgba(255,61,90,0.25);
    animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }
  .popup-alert.MEDIUM { border-color: var(--warn); box-shadow: 0 8px 32px rgba(255,190,0,0.2); }
  .popup-alert.LOW    { border-color: var(--info);  box-shadow: 0 8px 32px rgba(77,166,255,0.15); }
  .popup-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .popup-type  { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 12px;
    letter-spacing: 2px; text-transform: uppercase; }
  .popup-close { background: none; border: none; color: var(--muted); cursor: pointer;
    font-size: 18px; line-height: 1; }
  .popup-msg { font-size: 14px; line-height: 1.5; }

  /* ── Loading ── */
  .loading-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent); margin: 0 3px;
    animation: bounce 1.2s ease-in-out infinite; }
  .loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .loading-dot:nth-child(3) { animation-delay: 0.4s; }

  /* ── Animations ── */
  @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes flashRed{ 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes popIn   { from { opacity: 0; transform: scale(0.8) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes bounce  { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .main { grid-template-columns: 1fr 1fr; }
    .speed-card  { grid-column: 1; grid-row: 1; }
    .zone-card   { grid-column: 2; grid-row: 1; }
    .weather-card{ grid-column: 1; grid-row: 2; }
    .ml-card     { grid-column: 2; grid-row: 2; }
    .alerts-card { grid-column: 1 / -1; grid-row: 3; }
  }
  @media (max-width: 700px) {
    .main { grid-template-columns: 1fr; padding: 16px; }
    .speed-card,.zone-card,.weather-card,.ml-card,.alerts-card { grid-column: 1; grid-row: auto; }
    .header { padding: 12px 16px; }
    .gps-bar { padding: 8px 16px; }
  }
`;
document.head.appendChild(style);

// ─── Constants ────────────────────────────────────────────────────────────────
const ZONES = [
  { id: "school",      label: "School",      icon: "", limit: 20 },
  { id: "hospital",    label: "Hospital",    icon: "", limit: 25 },
  { id: "residential", label: "Residential", icon: "",  limit: 30 },
  { id: "highway",     label: "Highway",     icon: "",  limit: 70 },
  { id: "urban",       label: "Urban",       icon: "",  limit: 40 },
];

const ZONE_ALERTS = {
  school:      " School Zone — Children crossing, max 20 km/h",
  hospital:    " Hospital Zone — Sirens possible, give way",
  residential: " Residential — Watch for pedestrians & cyclists",
  highway:     null,
  urban:       null,
};

const WEATHER_ICONS = {
  clear: "☀️", clouds: "☁️", rain: "🌧️", drizzle: "🌦️",
  thunderstorm: "⛈️", snow: "❄️", mist: "🌫️", fog: "🌫️",
  haze: "😶‍🌫️", dust: "💨", default: "🌤️",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function riskColor(level) {
  return { LOW: "#00e5a0", MEDIUM: "#ffbe00", HIGH: "#ff7a00", CRITICAL: "#ff3d5a" }[level] || "#64748b";
}
function riskPct(prob) { return Math.round((prob ?? 0) * 100); }

function beep(freq = 880, ms = 400) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = "square";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + ms / 1000);
  } catch (e) {}
}
function vibrate(p = [200, 100, 200]) { if (navigator.vibrate) navigator.vibrate(p); }

// ─── Speedometer SVG ──────────────────────────────────────────────────────────
function SpeedometerArc({ speed, speedLimit }) {
  const max   = Math.max(speedLimit * 1.5, 80);
  const angle = Math.min((speed / max) * 240, 240);
  const polar = (a, r) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [120 + r * Math.cos(rad), 120 + r * Math.sin(rad)];
  };
  const arcPath = (from, to, r) => {
    const [sx, sy] = polar(from, r);
    const [ex, ey] = polar(to,   r);
    return `M ${sx} ${sy} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${ex} ${ey}`;
  };
  const isVio       = speed > speedLimit + 5;
  const color       = isVio ? "#ff3d5a" : speed > speedLimit ? "#ffbe00" : "#00e5a0";
  const [nx, ny]    = polar(-120 + angle, 70);

  return (
    <svg viewBox="0 0 240 240" className="speedo-svg">
      <path d={arcPath(-120, 120, 90)} fill="none" stroke="#1e2d4a" strokeWidth="14" strokeLinecap="round"/>
      <path d={arcPath(-120, -120 + angle, 90)} fill="none" stroke={color}
        strokeWidth="14" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: "stroke 0.3s" }}/>
      {Array.from({ length: 13 }).map((_, i) => {
        const a = -120 + i * 20;
        const [x1, y1] = polar(a, 100);
        const [x2, y2] = polar(a, i % 4 === 0 ? 108 : 104);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={i % 4 === 0 ? "#4a5568" : "#2d3748"} strokeWidth={i % 4 === 0 ? 2 : 1}/>;
      })}
      <circle cx={nx} cy={ny} r="5" fill={color}
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "all 0.1s" }}/>
      <circle cx="120" cy="120" r="12" fill="#161b2e" stroke="#1e2d4a" strokeWidth="2"/>
    </svg>
  );
}

// ─── Popup Alerts ─────────────────────────────────────────────────────────────
function PopupAlerts({ alerts, onDismiss }) {
  return (
    <div className="popup-container">
      {alerts.slice(0, 3).map((a) => (
        <div key={a.id} className={`popup-alert ${a.severity}`}>
          <div className="popup-header">
            <span className="popup-type" style={{ color: riskColor(a.severity) }}>
              {a.type} Alert — {a.severity}
            </span>
            <button className="popup-close" onClick={() => onDismiss(a.id)}>✕</button>
          </div>
          <div className="popup-msg">{a.message}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Mode: "demo" | "live" ──
  const [mode, setMode] = useState("demo");

  // ── GPS (live mode) ──
  const [gpsStatus, setGpsStatus]   = useState("idle"); // idle | acquiring | active | error
  const [gpsLocation, setGpsLoc]    = useState(null);
  const [gpsSpeedKmh, setGpsSpeed]  = useState(0);
  const gpsWatchRef                 = useRef(null);
  const gpsCheckRef                 = useRef(null);
  const gpsSpeedRef                 = useRef(0);
  const gpsLocRef                   = useRef(null);

  // ── Demo speed simulation (original) ──
  const [speed, setSpeed]           = useState(0);
  const [isRunning, setRunning]     = useState(false);
  const frameRef                    = useRef(null);
  const targetRef                   = useRef(0);

  // ── Shared ──
  const [zone, setZone]             = useState(ZONES[4]);
  const [lat, setLat]               = useState("17.3850");
  const [lon, setLon]               = useState("78.4867");
  const [weather, setWeather]       = useState(null);
  const [weatherLoading, setWL]     = useState(false);
  const [weatherErr, setWErr]       = useState(null);
  const [mlResult, setMlResult]     = useState(null);
  const [mlLoading, setMlLoading]   = useState(false);
  const [alerts, setAlerts]         = useState([]);
  const [popups, setPopups]         = useState([]);
  const [wsConnected, setWsConn]    = useState(false);

  // active speed depends on mode
  const activeSpeed = mode === "live" ? gpsSpeedKmh : speed;
  const speedLimit  = zone.limit;
  const isViolation = activeSpeed > speedLimit + 5;

  // ── GPS start/stop ────────────────────────────────────────
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus("error"); return; }
    setGpsStatus("acquiring");
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: s } = pos.coords;
        const kmh = s ? Math.round(s * 3.6) : 0;
        setGpsLoc({ lat: latitude, lon: longitude });
        setGpsSpeed(kmh);
        gpsSpeedRef.current = kmh;
        gpsLocRef.current   = { lat: latitude, lon: longitude };
        setLat(latitude.toFixed(4));
        setLon(longitude.toFixed(4));
        setGpsStatus("active");
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    // auto speed-check every 4 s
    gpsCheckRef.current = setInterval(() => {
      const loc = gpsLocRef.current;
      const spd = gpsSpeedRef.current;
      if (loc) runSpeedCheck(spd, loc.lat, loc.lon);
    }, 4000);
  }, []); // eslint-disable-line

  const stopGPS = useCallback(() => {
    if (gpsWatchRef.current) { navigator.geolocation.clearWatch(gpsWatchRef.current); gpsWatchRef.current = null; }
    if (gpsCheckRef.current) { clearInterval(gpsCheckRef.current); gpsCheckRef.current = null; }
    setGpsStatus("idle");
  }, []);

  useEffect(() => {
    if (mode === "live") {
      cancelAnimationFrame(frameRef.current);
      setRunning(false); targetRef.current = 0;
      startGPS();
    } else {
      stopGPS();
    }
    return () => stopGPS();
  }, [mode]); // eslint-disable-line

  // ── Demo simulation loop (original) ──────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      setSpeed(prev => {
        const diff = targetRef.current - prev;
        const step = Math.sign(diff) * Math.min(Math.abs(diff) * 0.08, 1.5);
        return Math.max(0, parseFloat((prev + step + (Math.random() - 0.5) * 0.3).toFixed(1)));
      });
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isRunning]);

  const toggleSim = () => {
    setRunning(r => {
      targetRef.current = r ? 0 : speedLimit * 0.85;
      return !r;
    });
  };
  const accel = () => { targetRef.current = Math.min(targetRef.current + 15, 130); };
  const brake = () => { targetRef.current = Math.max(0, targetRef.current - 15); };

  // ── Violation popup ──────────────────────────────────────
  const prevViolation = useRef(false);
  useEffect(() => {
    if (isViolation && !prevViolation.current) {
      const id  = Date.now().toString();
      const msg = {
        id, type: "SPEED", severity: "HIGH",
        message: ` Speed violation — ${(activeSpeed - speedLimit).toFixed(0)} km/h over limit in ${zone.label} zone`,
        createdAt: new Date().toISOString(),
      };
      setPopups(p => [msg, ...p].slice(0, 5));
      setAlerts(p => [msg, ...p].slice(0, 50));
      beep(1100, 500);
      vibrate([300, 100, 300]);
    }
    prevViolation.current = isViolation;
  }, [isViolation]); // eslint-disable-line

  // ── Weather fetch ─────────────────────────────────────────
  const fetchWeather = async () => {
    setWL(true); setWErr(null);
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setWeather(json.weather);
      if (json.weather.alerts?.length) {
        const wa = json.weather.alerts.map((a, i) => ({
          id: `w-${Date.now()}-${i}`, type: "WEATHER",
          severity: a.severity, message: a.message,
          createdAt: new Date().toISOString(),
        }));
        setPopups(p => [...wa, ...p].slice(0, 5));
        setAlerts(p => [...wa, ...p].slice(0, 50));
      }
    } catch (e) {
      setWErr(e.message);
      setWeather({
        condition: "rain", description: "moderate rain",
        temp: 24, feelsLike: 22, humidity: 78,
        windSpeed: 4.2, visibility: 4000,
        alerts: [{ severity: "MEDIUM", message: " Rain ahead — wet roads, increase following distance" }],
      });
    } finally { setWL(false); }
  };

  // ── ML / speed check ──────────────────────────────────────
  const runSpeedCheck = async (spd, la, lo) => {
    try {
      const res = await fetch("/api/speed-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: mode === "live" ? "MY-PHONE" : "DEMO-001",
          zoneType: zone.id, speedLimit, actualSpeed: spd,
          weatherCondition: weather?.condition || "clear",
          lat: parseFloat(la), lon: parseFloat(lo),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMlResult(data.ml);
    } catch {
      const excess = Math.max(spd - speedLimit, 0);
      const prob   = Math.min(0.95, excess / speedLimit);
      const level  = prob < 0.3 ? "LOW" : prob < 0.55 ? "MEDIUM" : prob < 0.8 ? "HIGH" : "CRITICAL";
      setMlResult({
        violation: excess > 5, violation_prob: prob, risk_level: level,
        speed_excess: excess,
        alerts: excess > 5 ? [` ${excess.toFixed(0)} km/h over limit`] : [],
        _demo: true,
      });
    }
  };

  const runMLCheck = async () => {
    setMlLoading(true);
    await runSpeedCheck(activeSpeed, lat, lon);
    setMlLoading(false);
  };

  const dismissPopup = (id) => setPopups(p => p.filter(a => a.id !== id));
  const dismissAlert = (id) => setAlerts(p => p.filter(a => a.id !== id));
  const weatherIcon  = weather ? (WEATHER_ICONS[weather.condition] || WEATHER_ICONS.default) : null;

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🚦</div>
          <div>
            <div className="header-title">ROAD SHIELD AI</div>
            <div className="header-subtitle">Speed + Weather Intelligence System</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="ws-badge">
            <div className={`ws-dot ${wsConnected ? "connected" : "disconnected"}`}/>
            {wsConnected ? "Live" : mode === "live" ? "GPS Mode" : "Demo Mode"}
          </div>
          {alerts.length > 0 && (
            <div style={{ background: "#ff3d5a", color: "#fff", borderRadius: 20,
              padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>
              {alerts.length} Alert{alerts.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </header>

      {/* ── Mode Toggle ── */}
      <div className="mode-bar">
        <button className={`mode-btn ${mode === "demo" ? "active-demo" : ""}`}
          onClick={() => setMode("demo")}>🎮 Demo Mode</button>
        <button className={`mode-btn ${mode === "live" ? "active-live" : ""}`}
          onClick={() => setMode("live")}>📡 Live GPS Mode</button>
      </div>

      {/* ── GPS Status Bar (live only) ── */}
      {mode === "live" && (
        <div className={`gps-bar ${gpsStatus}`}>
          <span>
            {gpsStatus === "acquiring" && " Acquiring GPS signal…"}
            {gpsStatus === "active"    && ` GPS Active — ${gpsLocation?.lat?.toFixed(4)}, ${gpsLocation?.lon?.toFixed(4)} — Speed: ${gpsSpeedKmh} km/h`}
            {gpsStatus === "error"     && " GPS unavailable — allow location permission in browser"}
            {gpsStatus === "idle"      && " Starting GPS…"}
          </span>
          {gpsStatus !== "active" && (
            <button className="gps-retry" onClick={startGPS}>Retry</button>
          )}
        </div>
      )}

      {/* ── Main Grid ── */}
      <main className="main">

        {/* ── Speedometer Card ── */}
        <div className={`card speed-card${isViolation ? " violation" : ""}`}>
          <div className="card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {mode === "live" ? "Live GPS Speed" : "Live Speed Monitor"}
          </div>
          <div className="speedo-wrap">
            <SpeedometerArc speed={activeSpeed} speedLimit={speedLimit}/>
            <div className="speed-number"
              style={{ color: isViolation ? "#ff3d5a" : activeSpeed > speedLimit ? "#ffbe00" : "#00e5a0" }}>
              {activeSpeed.toFixed(0)}
            </div>
            <div className="speed-unit">km / h</div>
            <div className="limit-row">
              <div>
                <div className="limit-badge">{speedLimit}</div>
                <div className="limit-label" style={{ textAlign: "center" }}>LIMIT</div>
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {isViolation ? (
                  <span style={{ color: "#ff3d5a", fontWeight: 700 }}>
                    +{(activeSpeed - speedLimit).toFixed(0)} over
                  </span>
                ) : (
                  <span style={{ color: "#00e5a0" }}>
                    {(speedLimit - activeSpeed).toFixed(0)} under
                  </span>
                )}
              </div>
            </div>
            {isViolation && (
              <div className="violation-banner">⚠️ SPEED VIOLATION DETECTED</div>
            )}

            {/* Demo controls (only in demo mode) */}
            {mode === "demo" && (
              <div className="speedo-controls">
                <button className="btn btn-start" onClick={toggleSim}>
                  {isRunning ? "⏹ Stop" : "▶ Start"}
                </button>
                <button className="btn btn-accel" disabled={!isRunning} onClick={accel}>▲ Accel</button>
                <button className="btn btn-brake" disabled={!isRunning} onClick={brake}>▼ Brake</button>
              </div>
            )}

            {/* Live GPS info */}
            {mode === "live" && gpsLocation && (
              <div className="live-info">
                <div className="live-row">
                  <span className="live-row-label">LATITUDE</span>
                  <span className="live-row-val">{gpsLocation.lat.toFixed(5)}</span>
                </div>
                <div className="live-row">
                  <span className="live-row-label">LONGITUDE</span>
                  <span className="live-row-val">{gpsLocation.lon.toFixed(5)}</span>
                </div>
                <div className="live-row">
                  <span className="live-row-label">GPS STATUS</span>
                  <span className="live-row-val" style={{ color: "#00e5a0" }}>● ACTIVE</span>
                </div>
              </div>
            )}
            {mode === "live" && gpsStatus !== "active" && (
              <div style={{ marginTop: 16, color: "#64748b", fontSize: 13, textAlign: "center" }}>
                {gpsStatus === "acquiring" ? "📡 Waiting for GPS fix…" : "Open on your phone for live GPS tracking"}
              </div>
            )}
          </div>
        </div>

        {/* ── Zone Card ── (original, unchanged) */}
        <div className="card zone-card">
          <div className="card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            Dynamic Speed Zones
          </div>
          <div className="zone-grid">
            {ZONES.map(z => (
              <button key={z.id} className={`zone-btn${zone.id === z.id ? " active" : ""}`}
                onClick={() => { setZone(z); if (mode === "demo") targetRef.current = Math.min(targetRef.current, z.limit * 1.2); }}>
                <span className="zone-icon">{z.icon}</span>
                <div className="zone-name">{z.label}</div>
                <div className="zone-limit">Max {z.limit} km/h</div>
              </button>
            ))}
          </div>
          {ZONE_ALERTS[zone.id] && (
            <div className="zone-alert">
              <span></span><span>{ZONE_ALERTS[zone.id]}</span>
            </div>
          )}
        </div>

        {/* ── Weather Card ── (original, unchanged) */}
        <div className="card weather-card">
          <div className="card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
            Weather Intelligence (+10 km ahead)
          </div>
          <div className="weather-coords">
            <input className="coord-input" placeholder="Latitude"  value={lat} onChange={e => setLat(e.target.value)}/>
            <input className="coord-input" placeholder="Longitude" value={lon} onChange={e => setLon(e.target.value)}/>
          </div>
          <button className="btn btn-fetch" onClick={fetchWeather} disabled={weatherLoading}>
            {weatherLoading
              ? <><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></>
              : " Fetch Weather Ahead"}
          </button>
          {weather ? (
            <>
              <div className="weather-main">
                <div className="weather-icon">{weatherIcon}</div>
                <div>
                  <div className="weather-temp">{weather.temp != null ? `${Math.round(weather.temp)}°C` : "—"}</div>
                  <div className="weather-desc">{weather.description}</div>
                </div>
              </div>
              <div className="weather-stats">
                <div className="stat-item">
                  <div className="stat-label">Humidity</div>
                  <div className="stat-val" style={{ color: "#4da6ff" }}>{weather.humidity}%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Wind</div>
                  <div className="stat-val" style={{ color: "#00e5a0" }}>{weather.windSpeed?.toFixed(1)} m/s</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Visibility</div>
                  <div className="stat-val" style={{ color: weather.visibility < 1000 ? "#ff3d5a" : "#e2e8f0" }}>
                    {(weather.visibility / 1000).toFixed(1)} km
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Condition</div>
                  <div className="stat-val" style={{ fontSize: 14, textTransform: "capitalize" }}>{weather.condition}</div>
                </div>
              </div>
              {weather.alerts?.length > 0 && (
                <div className="weather-alerts-list">
                  {weather.alerts.map((a, i) => (
                    <div key={i} className={`weather-alert ${a.severity}`}>{a.message}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="weather-placeholder">
              <span style={{ fontSize: 40 }}></span>
              <span style={{ color: "#64748b", fontSize: 13 }}>Enter coordinates and fetch weather</span>
            </div>
          )}
          {weatherErr && !weather && (
            <div style={{ color: "#ff7a00", fontSize: 12, marginTop: 8 }}>API unavailable — showing demo data</div>
          )}
        </div>

        {/* ── ML Card ── (original, unchanged) */}
        <div className="card ml-card">
          <div className="card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            ML Risk Assessment
          </div>
          {mlResult ? (
            <>
              <div className="risk-meter">
                <div className="risk-bar-wrap">
                  <div className={`risk-bar risk-${mlResult.risk_level}`}
                    style={{ width: `${riskPct(mlResult.violation_prob)}%` }}/>
                </div>
                <div className="risk-label" style={{ color: riskColor(mlResult.risk_level) }}>
                  {mlResult.risk_level}
                </div>
              </div>
              <div className="ml-stats">
                <div className="ml-stat">
                  <div className="ml-stat-val" style={{ color: riskColor(mlResult.risk_level) }}>
                    {riskPct(mlResult.violation_prob)}%
                  </div>
                  <div className="ml-stat-label">Violation Prob</div>
                </div>
                <div className="ml-stat">
                  <div className="ml-stat-val" style={{ color: mlResult.violation ? "#ff3d5a" : "#00e5a0" }}>
                    {mlResult.violation ? "YES" : "NO"}
                  </div>
                  <div className="ml-stat-label">Violation</div>
                </div>
                <div className="ml-stat">
                  <div className="ml-stat-val" style={{ color: mlResult.speed_excess > 0 ? "#ffbe00" : "#00e5a0" }}>
                    +{mlResult.speed_excess?.toFixed(0)}
                  </div>
                  <div className="ml-stat-label">Excess km/h</div>
                </div>
              </div>
              {mlResult.alerts?.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                  {mlResult.alerts.map((a, i) => (
                    <div key={i} style={{ background: "rgba(255,61,90,0.08)", border: "1px solid rgba(255,61,90,0.3)",
                      borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#ffb3c1" }}>{a}</div>
                  ))}
                </div>
              )}
              {mlResult._demo && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 8, textAlign: "center" }}>
                  * Rule-based fallback (connect backend for ML model)
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "20px 0", lineHeight: 1.6 }}>
              Run a speed check to get ML risk assessment.<br/>Model: Gradient Boosting Classifier
            </div>
          )}
          <button className="btn btn-check" onClick={runMLCheck} disabled={mlLoading}>
            {mlLoading
              ? <><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></>
              : " Run ML Speed Check"}
          </button>
        </div>

        {/* ── Alerts Card ── (original, unchanged) */}
        <div className="card alerts-card">
          <div className="card-label" style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Alert Log
            </span>
            {alerts.length > 0 && (
              <button style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12 }}
                onClick={() => setAlerts([])}>Clear all</button>
            )}
          </div>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="no-alerts">
                <span style={{ fontSize: 32 }}></span>
                <span>No alerts — all clear</span>
              </div>
            ) : (
              alerts.map(a => (
                <div key={a.id} className={`alert-item ${a.severity || "LOW"}`}>
                  <div className="alert-msg">
                    <div>{a.message}</div>
                    <div className="alert-time">{timeAgo(a.createdAt)} · {a.type}</div>
                  </div>
                  <button className="alert-dismiss" onClick={() => dismissAlert(a.id)}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* ── Popup Alerts ── */}
      <PopupAlerts alerts={popups} onDismiss={dismissPopup}/>
    </div>
  );
}
