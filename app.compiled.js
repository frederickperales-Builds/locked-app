import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Dumbbell, Zap, ArrowUp, Layers, RotateCcw, Activity, HeartPulse, ChevronDown, TrendingUp, Lightbulb, ClipboardList, Weight, Link, Flame, Wind, BarChart2, Anchor, Camera, Youtube, Calendar, ChevronLeft, ChevronRight, Download, Upload, ArrowLeftRight, Lock, WifiOff, Target, User, Plus, Settings, X } from "lucide-react";

// ---- Sync layer -----------------------------------------------------
// window.__LOCKED_SYNC__ is set up by index.html before this file loads:
//   { functionUrl: "https://<project>.supabase.co/functions/v1/kv-sync", pin: "1234" }
// Data is local-first: every read/write hits localStorage immediately (works
// offline, instant UI). Writes are also debounced out to Supabase in the
// background so the same data is available from any device/browser.

const SYNC = () => typeof window !== "undefined" ? window.__LOCKED_SYNC__ : null;
const pendingSync = {}; // key -> timeout id, for debouncing
const syncQueue = {}; // key -> latest value waiting to be sent
let syncOnline = true;
const syncListeners = new Set();
function setSyncStatus(online) {
  if (online === syncOnline) return;
  syncOnline = online;
  syncListeners.forEach(fn => fn(online));
}
async function syncCall(action, key, value) {
  const cfg = SYNC();
  if (!cfg || !cfg.functionUrl || !cfg.pin) return null;
  try {
    const res = await fetch(cfg.functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pin: cfg.pin,
        action,
        key,
        value
      })
    });
    if (!res.ok) throw new Error("sync failed: " + res.status);
    setSyncStatus(true);
    return await res.json();
  } catch (e) {
    setSyncStatus(false);
    return null;
  }
}
function queueSyncWrite(key, value) {
  syncQueue[key] = value;
  clearTimeout(pendingSync[key]);
  pendingSync[key] = setTimeout(async () => {
    const v = syncQueue[key];
    delete syncQueue[key];
    const result = await syncCall("set", key, v);
    if (result === null) {
      // retry once more shortly if it failed (e.g. flaky gym wifi)
      setTimeout(() => queueSyncWrite(key, v), 8000);
    }
  }, 800);
}

// Persistent storage hook -- local-first, background-synced to Supabase
function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const remote = window.__LOCKED_REMOTE_CACHE__ && window.__LOCKED_REMOTE_CACHE__[key];
      if (remote !== undefined) return remote;
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  });
  const firstRun = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("localStorage write failed:", e);
    }
    // Skip pushing to remote on the very first render (that's just the
    // initial load, not a real change) unless we had no remote cache at all.
    if (firstRun.current) {
      firstRun.current = false;
      const hadRemote = window.__LOCKED_REMOTE_CACHE__ && window.__LOCKED_REMOTE_CACHE__[key] !== undefined;
      if (hadRemote) return;
    }
    queueSyncWrite(key, value);
  }, [key, value]);
  return [value, setValue];
}
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #F0F0F0;
    --card: #ffffff;
    --rim: #e5e5ea;
    --ink: #000000;
    --muted: #8e8e93;
    --neon: #00c2ff;
    --neon-dim: rgba(0,194,255,0.1);
    --green: #34c759;
    --r: 14px;
  }
  html, body, #root { height: 100%; background: var(--bg); }
  body { font-family: 'Inter', sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }
  .app { max-width: 700px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }

  /* Header */
  .header { padding: 14px 20px 10px; display: flex; align-items: center; justify-content: space-between; background: var(--card); border-bottom: 1px solid var(--rim); }
  .header-logo { font-family: 'DM Mono', monospace; font-size: 13px; letter-spacing: 0.2em; color: var(--neon); text-transform: uppercase; }
  .header-date { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }

  /* Rest timer */
  .rest-timer { background: var(--neon-dim); border-bottom: 1px solid var(--neon); padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; }
  .rest-timer-label { font-size: 12px; color: var(--neon); font-weight: 600; }
  .rest-timer-display { font-family: 'DM Mono', monospace; font-size: 22px; color: var(--ink); }
  .rest-timer-skip { font-size: 12px; color: var(--muted); background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; }

  /* Bottom Tab Bar — frosted glass */
  .tabs {
    display: flex; align-items: center;
    padding: 0 8px 0 8px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: rgba(255,255,255,0.82);
    backdrop-filter: blur(20px) saturate(1.8);
    -webkit-backdrop-filter: blur(20px) saturate(1.8);
    border-top: 1px solid rgba(0,0,0,0.08);
    box-shadow: 0 -1px 0 rgba(0,0,0,0.04), 0 -4px 20px rgba(0,0,0,0.06);
    position: relative;
    z-index: 100;
    min-height: 56px;
  }
  .tab {
    flex: 1; padding: 8px 0 6px; font-size: 9.5px; font-weight: 600;
    color: #8e8e93; background: none; border: none; cursor: pointer;
    font-family: 'Inter', sans-serif; display: flex; flex-direction: column;
    align-items: center; gap: 3px; letter-spacing: 0.02em;
    transition: color 0.15s; -webkit-tap-highlight-color: transparent;
  }
  .tab.active { color: #00c2ff; }
  .tab span { line-height: 1; }
  /* Center + / dumbbell button */
  .tab-center-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3px; border: none; background: none;
    cursor: pointer; padding: 4px 0 6px; position: relative;
    -webkit-tap-highlight-color: transparent;
  }
  .tab-center-icon {
    width: 52px; height: 52px; border-radius: 50%;
    background: #1c1c1e;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.28), 0 0 0 3px rgba(255,255,255,0.9);
    position: relative; top: -10px;
    transition: background 0.2s;
  }
  .tab-center-icon.session-active {
    background: #00c2ff;
    box-shadow: 0 2px 12px rgba(0,194,255,0.4), 0 0 0 3px rgba(255,255,255,0.9);
    animation: centerPulse 2s ease-in-out infinite;
  }
  @keyframes centerPulse {
    0%,100% { box-shadow: 0 2px 12px rgba(0,194,255,0.4), 0 0 0 3px rgba(255,255,255,0.9); }
    50% { box-shadow: 0 2px 20px rgba(0,194,255,0.7), 0 0 0 3px rgba(255,255,255,0.9), 0 0 0 7px rgba(0,194,255,0.15); }
  }
  .tab-center-label { font-size: 9.5px; font-weight: 600; color: #8e8e93; font-family: 'Inter', sans-serif; margin-top: -6px; letter-spacing: 0.02em; }

  /* Plus bottom sheet */
  .plus-sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: flex-end; }
  .plus-sheet {
    width: 100%; background: #fff; border-radius: 24px 24px 0 0;
    padding: 12px 20px 32px; box-shadow: 0 -4px 40px rgba(0,0,0,0.18);
    animation: sheetUp 0.28s cubic-bezier(0.32,0.72,0,1);
  }
  @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .plus-sheet-handle { width: 36px; height: 4px; background: #d1d1d6; border-radius: 2px; margin: 0 auto 20px; }
  .plus-sheet-title { font-size: 13px; font-weight: 700; color: #8e8e93; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 14px; font-family: 'Inter', sans-serif; }
  .plus-sheet-btn {
    width: 100%; padding: 16px 18px; border-radius: 14px; border: none;
    background: #f2f2f7; margin-bottom: 10px; cursor: pointer;
    display: flex; align-items: center; gap: 14px;
    font-family: 'Inter', sans-serif; text-align: left;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.12s;
  }
  .plus-sheet-btn:active { background: #e5e5ea; }
  .plus-sheet-btn-icon { width: 36px; height: 36px; border-radius: 10px; background: #1c1c1e; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .plus-sheet-btn-text { display: flex; flex-direction: column; gap: 2px; }
  .plus-sheet-btn-label { font-size: 15px; font-weight: 600; color: #1c1c1e; }
  .plus-sheet-btn-sub { font-size: 12px; color: #8e8e93; }

  /* Content */
  .content { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; overflow-anchor: none; }
  .section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; color: var(--muted); text-transform: uppercase; margin-bottom: 6px; }

  /* Workout type grid */
  .type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .type-card { background: var(--card); border: 1.5px solid var(--rim); border-radius: var(--r); padding: 14px; cursor: pointer; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .type-card.selected { border-color: var(--neon); box-shadow: 0 0 0 1px var(--neon), 0 0 12px rgba(0,194,255,0.2); background: var(--neon-dim); }
  .type-icon { font-size: 22px; margin-bottom: 4px; }
  .type-name { font-size: 14px; font-weight: 700; color: var(--ink); }
  .type-tag { font-size: 11px; color: var(--muted); margin-top: 2px; }

  /* Exercise cards */
  .exercise-card { background: #fff; border: 1.5px solid #e5e5ea; border-radius: 14px; overflow: hidden; margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); contain: layout style; scroll-margin-top: 16px; }
  .exercise-header { padding: 12px 14px 10px; cursor: pointer; }
  .exercise-name { font-size: 17px; font-weight: 800; color: #000; line-height: 1.15; letter-spacing: -0.3px; }
  .exercise-muscle-head { font-size: 12px; font-weight: 600; color: #8e8e93; margin-top: 2px; }
  .exercise-pills { display: flex; gap: 6px; margin-top: 8px; }
  .exercise-pills::-webkit-scrollbar { display: none; }
  .exercise-pill { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 5px 8px; border-radius: 8px; border: 1.5px solid #e5e5ea; background: #fff; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .exercise-pill-label { font-size: 9px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .exercise-pill-val { font-size: 11px; font-weight: 700; color: #000; margin-top: 1px; white-space: nowrap; text-align: center; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .exercise-pill.blue { border-color: #00c2ff; background: #fff; }
  .exercise-pill.blue .exercise-pill-val { color: #00c2ff; }
  .exercise-pill.green { border-color: #00ff88; background: #fff; }
  .exercise-pill.green .exercise-pill-val { color: #00ff88; }
  .exercise-info-row { display: flex; gap: 6px; margin-top: 10px; }
  .exercise-info-chip { flex: 1; padding: 5px 10px; text-align: center; border: 1.5px solid #8e8e93; border-radius: 8px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .exercise-info-chip:last-child { border-right: 1.5px solid #8e8e93; }
  .exercise-info-label { font-size: 9px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.05em; }
  .exercise-info-val { font-size: 11px; font-weight: 700; color: #8e8e93; font-family: "DM Mono", monospace; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .exercise-chevron { color: var(--muted); font-size: 11px; flex-shrink: 0; transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
  .exercise-chevron.open { transform: rotate(180deg); }
  .sets-area-wrapper { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out; }
  .sets-area-wrapper.open { max-height: 3000px; opacity: 1; transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out 0.05s; }
  .sets-area { padding: 0 14px 12px; display: flex; flex-direction: column; gap: 6px; background: var(--card); }
  .sets-header { display: grid; grid-template-columns: 18px minmax(52px,1.5fr) minmax(36px,1fr) minmax(36px,1fr) minmax(46px,1.2fr) 30px; gap: 6px; padding: 0 4px 4px; align-items: center; }
  .sets-header span { font-size: 12px; font-weight: 700; color: #8e8e93; letter-spacing: 0.02em; font-family: "DM Mono", monospace; }
  .set-row { display: grid; grid-template-columns: 18px minmax(52px,1.5fr) minmax(36px,1fr) minmax(36px,1fr) minmax(46px,1.2fr) 30px; gap: 6px; align-items: center; padding: 0 4px; margin-bottom: 6px; }
  .set-last { font-family: "DM Mono", monospace; font-size: 14px; font-weight: 500; color: #c7c7cc; text-align: center; background: #fff; border: 1.5px solid #e5e5ea; border-radius: 10px; padding: 6px 4px; }
  .set-last { font-family: "DM Mono", monospace; font-size: 14px; font-weight: 500; color: #c7c7cc; text-align: center; background: #fff; border: 1.5px solid #e5e5ea; border-radius: 10px; padding: 10px 4px; }
  .set-input { background: #F0F0F0; border: 1.5px solid #e5e5ea; border-radius: 10px; padding: 6px 10px; font-family: "DM Mono", monospace; font-size: 16px; font-weight: 700; color: #000; width: 100%; outline: none; transition: border-color 0.15s; -moz-appearance: textfield; box-sizing: border-box; }
  .set-input::-webkit-outer-spin-button, .set-input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .set-input:focus { border-color: #00c2ff; background: #fff; box-shadow: 0 0 0 3px rgba(0,194,255,0.12); }
  .set-input::placeholder { color: #d1d1d6; }
  .set-done { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--rim); background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.15s; flex-shrink: 0; }
  .set-done.checked { background: var(--green); border-color: var(--green); color: #fff; }
  .add-set-btn { background: none; border: 1.5px dashed var(--rim); border-radius: 8px; padding: 8px; width: 100%; font-size: 12px; color: var(--muted); cursor: pointer; font-family: "Inter", sans-serif; transition: all 0.15s; margin-top: 2px; }
  .add-set-btn:hover { border-color: var(--neon); color: var(--neon); }
  .prev-hint { font-size: 11px; color: var(--muted); padding: 2px 2px 4px; }
  .card-rest-timer { background: #F0F0F0; border-radius: 10px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
  .exercise-notes { width: 100%; border: 1.5px solid #e5e5ea; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-family: "Inter", sans-serif; color: #000; resize: none; outline: none; background: #fafafa; margin-top: 6px; box-sizing: border-box; min-height: 60px; }
  .exercise-notes:focus { border-color: #00c2ff; }
  .progression-hint-text { font-size: 12px; color: #1a8c3a; font-weight: 600; flex: 1; }
  .progression-apply { background: var(--green); color: #fff; border: none; border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; }

  /* Buttons */
  .add-exercise-btn { background: var(--card); border: 1.5px dashed var(--rim); border-radius: var(--r); padding: 16px; width: 100%; font-size: 14px; font-weight: 500; color: var(--muted); cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .add-exercise-btn:hover { border-color: var(--neon); color: var(--neon); }
  .finish-row { display: flex; gap: 8px; }
  .btn { width: 100%; padding: 16px; border-radius: var(--r); border: none; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.1s; }
  .btn:active { transform: scale(0.98); }
  .btn-primary { background: #000; color: #fff; box-shadow: 0 0 0 2px var(--neon), 0 0 14px rgba(0,194,255,0.3); }
  .btn-ghost { background: var(--card); color: var(--ink); border: 1.5px solid var(--rim); }
  .rest-btn { background: var(--card); border: 1.5px solid var(--rim); border-radius: 8px; padding: 6px 12px; font-size: 12px; color: var(--muted); cursor: pointer; font-family: 'DM Mono', monospace; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  .rest-btn.active { border-color: var(--neon); color: var(--neon); box-shadow: 0 0 0 1px var(--neon); }

  /* History */
  .history-card { background: #fff; border: 1.5px solid #e5e5ea; border-radius: var(--r); padding: 16px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .history-top { display: flex; align-items: center; justify-content: space-between; }
  .history-type { font-size: 16px; font-weight: 700; color: var(--ink); }
  .history-date { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
  .history-stats { display: flex; gap: 24px; }
  .stat { display: flex; flex-direction: column; gap: 2px; }
  .stat-val { font-family: 'DM Mono', monospace; font-size: 18px; font-weight: 700; color: var(--neon); }
  .stat-key { font-size: 11px; color: var(--muted); }
  .history-exlist { font-size: 12px; color: var(--muted); line-height: 1.7; }
  .export-row { display: flex; align-items: center; justify-content: space-between; background: var(--neon-dim); border: 1.5px solid var(--neon); border-radius: 10px; padding: 10px 14px; gap: 10px; margin-bottom: 8px; }
  .export-text { font-size: 12px; line-height: 1.5; color: var(--ink); }
  .export-text strong { color: var(--neon); }
  .export-btn-sm { flex-shrink: 0; background: #000; color: #fff; border: none; border-radius: 8px; padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 0 0 1.5px #00c2ff; }

  /* Gym tab */
  .equip-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .equip-chip { background: var(--card); border: 1.5px solid var(--rim); border-radius: 20px; padding: 6px 12px; font-size: 12px; font-weight: 600; color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  .ex-group-title { font-size: 13px; font-weight: 700; color: var(--muted); margin: 14px 0 6px; }
  .ex-row { padding: 10px 0; border-bottom: 1px solid var(--rim); display: flex; justify-content: space-between; align-items: center; font-size: 13px; gap: 8px; }
  .ex-row:last-child { border-bottom: none; }
  .ex-row-muscle { font-size: 11px; color: var(--muted); }

  /* -- Splash Screen -- */
  .splash { position: fixed; inset: 0; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; gap: 0; }
  .splash.fade-out { animation: splashFade 0.6s ease forwards; }
  @keyframes splashFade { to { opacity: 0; pointer-events: none; } }
  @keyframes restPulse { 0%,100% { box-shadow: 0 0 0 3px rgba(0,194,255,0.3), 0 4px 20px rgba(0,0,0,0.4); } 50% { box-shadow: 0 0 0 6px rgba(0,194,255,0.15), 0 4px 20px rgba(0,0,0,0.4); } }
  @keyframes cardGlow { 0% { box-shadow: 0 0 0 2px #00c2ff, 0 0 16px rgba(0,194,255,0.3); } 80% { box-shadow: 0 0 0 2px #00c2ff, 0 0 16px rgba(0,194,255,0.3); } 100% { box-shadow: 0 1px 4px rgba(0,0,0,0.06); } }

  .splash-logo { font-family: 'DM Mono', monospace; font-size: 48px; font-weight: 500; letter-spacing: 0.15em; color: #fff; text-transform: uppercase; opacity: 0; animation: logoIn 0.6s ease 0.3s forwards; }
  .splash-lock { opacity: 0; animation: lockIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s forwards; margin-bottom: 16px; }
  .splash-tagline { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: 0.12em; color: #8e8e93; text-transform: uppercase; opacity: 0; animation: tagIn 0.5s ease 1s forwards; margin-top: 10px; }
  .splash-bar { width: 0; height: 2px; background: #00c2ff; border-radius: 1px; margin-top: 32px; animation: barGrow 0.8s ease 1.4s forwards; box-shadow: 0 0 12px rgba(0,194,255,0.6); }

  @keyframes lockIn  { from { opacity:0; transform: scale(0.4) rotate(-15deg); } to { opacity:1; transform: scale(1) rotate(0deg); } }
  @keyframes logoIn  { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
  @keyframes tagIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes barGrow { from { width:0; } to { width: 80px; } }
  @keyframes setDoneBounce { 0% { transform: scale(1); } 30% { transform: scale(1.4); box-shadow: 0 0 0 8px rgba(52,199,89,0.3); } 60% { transform: scale(0.95); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(52,199,89,0); } }
  .set-done-bounce { animation: setDoneBounce 0.5s cubic-bezier(0.4, 0, 0.2, 1); }

  .neon-ring { animation: ringPulse 1.5s ease-in-out 0.1s infinite; }
  @keyframes ringPulse { 0%,100% { filter: drop-shadow(0 0 6px #00c2ff); } 50% { filter: drop-shadow(0 0 20px #00c2ff) drop-shadow(0 0 40px #00c2ff88); } }
  .cal-nav { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 16px; }
  .cal-month-label { font-size: 18px; font-weight: 700; color: #000; letter-spacing: -0.3px; }
  .cal-nav-btn { background: #fff; border: 1.5px solid #e5e5ea; border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
  .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; }
  .cal-dow { text-align: center; font-size: 11px; font-weight: 700; color: #8e8e93; padding-bottom: 8px; letter-spacing: 0.04em; }
  .cal-day { aspect-ratio: 1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; position: relative; transition: all 0.15s; border: 2px solid transparent; }
  .cal-day:hover { background: #F0F0F0; }
  .cal-day.other-month { opacity: 0.25; }
  .cal-day.today { background: #000 !important; border-color: transparent !important; }
  .cal-day.today .cal-day-num { color: #fff !important; font-weight: 700; }
  .cal-day.logged { background: #5a8f6e; border-color: transparent; }
  .cal-day.logged .cal-day-num { color: #fff; font-weight: 700; }
  .cal-day.scheduled { border-color: #00c2ff; }
  .cal-day.recovery { border-color: #c7c7cc; }
  .cal-day.scheduled.today { border-color: transparent; }
  .cal-day.recovery.today { border-color: transparent; }
  .cal-day-num { font-size: 14px; font-weight: 500; color: #000; line-height: 1; }
  .cal-dot { width: 4px; height: 4px; border-radius: 50%; background: #fff; margin-top: 3px; }
  .cal-detail { background: #fff; border-radius: 14px; border: 1.5px solid #e5e5ea; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .cal-detail-date { font-size: 12px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .cal-detail-name { font-size: 16px; font-weight: 700; color: #000; margin-bottom: 4px; }
  .cal-detail-exlist { font-size: 12px; color: #8e8e93; line-height: 1.7; }
  .schedule-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; }
  .schedule-day-btn { aspect-ratio: 1; border-radius: 10px; border: 1.5px solid #e5e5ea; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.06); gap: 2px; }
  .schedule-day-btn.on { background: #000; border-color: #00c2ff; box-shadow: 0 0 0 1.5px #00c2ff, 0 0 10px rgba(0,194,255,0.2); }
  .schedule-day-label { font-size: 10px; font-weight: 700; color: #8e8e93; letter-spacing: 0.04em; }
  .schedule-day-btn.on .schedule-day-label { color: #8e8e93; }
  .schedule-day-num-label { font-size: 13px; font-weight: 700; color: #000; }
  .schedule-day-btn.on .schedule-day-num-label { color: #fff; }

  .cal-day.missed { background: #F0F0F0; border-color: transparent; }
  .cal-day.missed .cal-day-num { color: #ff3b30; }
  .cal-day.cardio-done::before { content: ''; position: absolute; top: 4px; right: 4px; width: 5px; height: 5px; border-radius: 50%; background: #8a63d2; }
  .cal-day.cardio { }
  .cal-day.cardio::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 16px; height: 2.5px; border-radius: 2px; background: #8a63d2; }
  .schedule-day-btn.cardio-on { background: #f1ecfb; border-color: #8a63d2; box-shadow: 0 0 0 1.5px #8a63d2; }
  .schedule-day-btn.cardio-on .schedule-day-label { color: #8a63d2; }
  .schedule-day-btn.cardio-on .schedule-day-num-label { color: #8a63d2; }
  /* Equipment editor */
  .equip-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .equip-row { background: var(--card); border: 1.5px solid var(--rim); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  .equip-name { font-size: 13px; font-weight: 600; color: var(--ink); }
  .equip-type-pill { font-size: 11px; font-weight: 700; color: #00c2ff; background: rgba(0,194,255,0.1); border: 1px solid rgba(0,194,255,0.25); border-radius: 20px; padding: 3px 10px; cursor: pointer; white-space: nowrap; }
  .equip-type-sheet { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
  .equip-type-panel { background: #F0F0F0; border-radius: 24px 24px 0 0; width: 100%; max-width: 700px; padding: 16px 0 32px; }
  .equip-type-title { font-size: 13px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.05em; padding: 0 20px 12px; border-bottom: 1px solid #e5e5ea; margin-bottom: 8px; }
  .equip-type-option { padding: 14px 20px; font-size: 15px; font-weight: 500; color: #000; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
  .equip-type-option:active { background: #e5e5ea; }
  .equip-type-option.selected { color: #00c2ff; font-weight: 700; }

  .swap-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 120; display: flex; align-items: flex-end; justify-content: center; }
  .swap-sheet { background: #F0F0F0; border-radius: 24px 24px 0 0; width: 100%; max-width: 700px; max-height: 70vh; display: flex; flex-direction: column; overflow: hidden; }
  .swap-handle { width: 40px; height: 5px; background: #c7c7cc; border-radius: 3px; margin: 12px auto 0; flex-shrink: 0; }
  .swap-header { padding: 14px 18px 10px; flex-shrink: 0; }
  .swap-title { font-size: 13px; font-weight: 600; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
  .swap-current { font-size: 18px; font-weight: 700; color: #000; }
  .swap-list { overflow-y: auto; flex: 1; padding: 0 14px 20px; }
  .swap-group-label { font-size: 11px; font-weight: 600; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 2px 6px; }
  .swap-item { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; cursor: pointer; border: 1.5px solid #e5e5ea; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .swap-item:hover { border-color: #00c2ff; }
  .swap-item.current { border-color: #00c2ff; background: rgba(0,194,255,0.06); }
  .swap-item-icon { width: 40px; height: 40px; border-radius: 10px; background: #F0F0F0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #e5e5ea; }
  .swap-item-name { font-size: 14px; font-weight: 600; color: #000; }
  .swap-item-sub { font-size: 11px; color: #8e8e93; margin-top: 2px; }
  .swap-item-check { margin-left: auto; color: #00c2ff; flex-shrink: 0; }
  .picker-overlay { position: fixed; inset: 0; background: var(--bg); z-index: 100; display: flex; flex-direction: column; max-width: 700px; margin: 0 auto; }
  .picker-topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--rim); flex-shrink: 0; background: var(--card); }
  .picker-close { background: #e5e5ea; border: none; color: #555; font-size: 14px; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .picker-title { font-size: 17px; font-weight: 700; color: var(--ink); }
  .picker-cart { background: #000; color: #fff; border: none; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 6px; box-shadow: 0 0 0 2px var(--neon); }
  .picker-cart-count { background: var(--neon); color: #000; border-radius: 10px; width: 18px; height: 18px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .muscle-row { display: flex; gap: 6px; padding: 10px 16px; overflow-x: auto; flex-shrink: 0; border-bottom: 1px solid var(--rim); background: var(--card); }
  .muscle-row::-webkit-scrollbar { display: none; }
  .muscle-btn { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; opacity: 0.4; transition: opacity 0.15s; }
  .muscle-btn.active { opacity: 1; }
  .muscle-icon { width: 44px; height: 48px; border-radius: 8px; background: var(--bg); border: 1.5px solid var(--rim); display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .muscle-btn.active .muscle-icon { border-color: var(--neon); background: var(--neon-dim); box-shadow: 0 0 0 1px var(--neon); }
  .muscle-label { font-size: 10px; color: var(--ink); text-align: center; white-space: nowrap; font-weight: 500; }
  .filter-bar { display: flex; gap: 6px; padding: 8px 16px; overflow-x: auto; flex-shrink: 0; background: var(--card); border-bottom: 1px solid var(--rim); }
  .filter-bar::-webkit-scrollbar { display: none; }
  .fchip { flex-shrink: 0; padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--rim); background: var(--bg); font-size: 13px; color: var(--muted); cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; font-weight: 500; }
  .fchip.on { background: #000; border-color: #000; color: #fff; font-weight: 700; }
  .picker-search-wrap { padding: 10px 16px; flex-shrink: 0; background: var(--card); }
  .picker-search { background: var(--bg); border: 1.5px solid var(--rim); border-radius: 12px; padding: 10px 14px 10px 38px; width: 100%; font-size: 14px; color: var(--ink); outline: none; font-family: 'Inter', sans-serif; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 12px center; }
  .picker-search:focus { border-color: var(--neon); }
  .picker-search::placeholder { color: #c7c7cc; }
  .picker-list { overflow-y: auto; flex: 1; background: var(--bg); }
  .picker-alpha { padding: 10px 16px 4px; font-size: 12px; font-weight: 700; color: var(--muted); }
  .picker-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--rim); cursor: pointer; transition: background 0.1s; background: var(--card); margin: 0 0 1px; }
  .picker-item:hover { background: var(--bg); }
  .picker-item.added { opacity: 0.35; pointer-events: none; }
  .picker-item-img { width: 50px; height: 50px; border-radius: 10px; background: var(--bg); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; border: 1px solid var(--rim); }
  .picker-item-text { flex: 1; min-width: 0; }
  .picker-item-name { font-size: 15px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .picker-item-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .picker-item-sub strong { color: var(--ink); font-weight: 600; }
  .picker-add { width: 30px; height: 30px; border-radius: 50%; background: var(--bg); border: 1.5px solid var(--rim); color: var(--ink); font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; transition: all 0.15s; }
  .picker-add.selected { background: var(--neon); border-color: var(--neon); color: #fff; }
  .picker-empty { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 14px; }
  .picker-done-bar { padding: 12px 16px; border-top: 1px solid var(--rim); flex-shrink: 0; background: var(--card); }
  .picker-done-btn { width: 100%; padding: 16px; background: #000; color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 0 0 2px var(--neon), 0 0 14px rgba(0,194,255,0.3); }

  /* Toast */
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #000; color: #fff; padding: 11px 20px; border-radius: 100px; font-size: 13px; font-weight: 600; z-index: 300; white-space: nowrap; animation: toastIn 0.2s ease, toastOut 0.3s ease 2.3s forwards; box-shadow: 0 0 0 1.5px var(--neon); }
  @keyframes toastIn  { from { opacity:0; transform:translateX(-50%) translateY(10px); } }
  @keyframes toastOut { to   { opacity:0; transform:translateX(-50%) translateY(10px); } }
  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state { text-align: center; color: var(--muted); padding: 40px 0; font-size: 14px; line-height: 1.8; }
  .empty-icon { font-size: 36px; margin-bottom: 12px; }

  /* -- Plate Calculator -- */
  .plate-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 150; display: flex; align-items: flex-end; justify-content: center; }
  .plate-sheet { background: #F0F0F0; border-radius: 24px 24px 0 0; width: 100%; max-width: 700px; padding-bottom: 28px; max-height: 92vh; overflow-y: auto; }
  .plate-handle { width: 40px; height: 5px; background: #c7c7cc; border-radius: 3px; margin: 12px auto 0; }
  .plate-header { padding: 12px 18px 8px; display: flex; align-items: center; justify-content: space-between; }
  .plate-header-title { font-size: 18px; font-weight: 700; color: #000; letter-spacing: -0.3px; }
  .plate-close { background: #e5e5ea; border: none; color: #555; font-size: 14px; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }

  /* Bar selector */
  .bar-section { padding: 0 14px 8px; }
  .bar-label { font-size: 10px; font-weight: 600; color: #8e8e93; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
  .bar-pills { display: flex; gap: 6px; overflow-x: auto; padding: 2px 2px 4px 2px; }
  .bar-pills::-webkit-scrollbar { display: none; }
  .bar-pill { flex-shrink: 0; padding: 5px 10px; border-radius: 8px; border: none; background: #fff; font-size: 12px; font-weight: 600; color: #3c3c43; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.08); }
  .bar-pill.on { background: #000; color: #fff; box-shadow: 0 0 0 2px #00c2ff, 0 0 10px rgba(0,194,255,0.35); }

  /* Total card */
  .plate-total-section { margin: 0 14px 10px; background: #fff; border-radius: 16px; padding: 12px 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .plate-total-label { font-size: 10px; font-weight: 600; color: #8e8e93; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; }
  .plate-total-num { font-size: 38px; font-weight: 700; color: #000; line-height: 1; letter-spacing: -2px; font-family: 'DM Mono', monospace; }
  .plate-total-unit { font-size: 16px; color: #8e8e93; font-weight: 500; margin-left: 3px; }

  /* Load mode toggle */
  .load-mode-row { display: flex; align-items: center; justify-content: space-between; margin: 0 14px 8px; }
  .load-mode-label { font-size: 11px; font-weight: 600; color: #8e8e93; letter-spacing: 0.05em; text-transform: uppercase; }
  .load-mode-toggle { display: flex; background: #e5e5ea; border-radius: 10px; padding: 2px; }
  .load-mode-btn { padding: 6px 14px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; color: #666; background: transparent; white-space: nowrap; }
  .load-mode-btn.on { background: #fff; color: #000; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }

  /* Plate grid */
  .plate-grid-section { padding: 0 14px; }
  .plate-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .plate-card { background: #fff; border-radius: 14px; border: 2px solid #e5e5ea; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 6px 10px; cursor: pointer; transition: all 0.15s; min-height: 80px; gap: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.07); -webkit-tap-highlight-color: transparent; }
  .plate-card.selected { border-color: #00c2ff; box-shadow: 0 0 0 2px #00c2ff, 0 0 16px rgba(0,194,255,0.4); background: rgba(0,194,255,0.04); }
  .plate-card-weight { font-size: 28px; font-weight: 800; line-height: 1; letter-spacing: -1px; }
  .plate-card-unit { font-size: 10px; font-weight: 600; color: #8e8e93; }
  .plate-card-count { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 700; margin-top: 3px; }
  .plate-toggle-wrap { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .plate-toggle-svg { cursor: pointer; -webkit-tap-highlight-color: transparent; transition: filter 0.2s, transform 0.1s; display: block; }
  .plate-toggle-svg:active { transform: scale(0.94); }
  .plate-count-label { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 700; color: #000; min-width: 24px; text-align: center; }
  .plate-count-label.zero { color: #c7c7cc; font-weight: 400; }

  /* Use button */
  .plate-use-btn { position: sticky; bottom: 0; margin: 14px 14px 0; width: calc(100% - 28px); padding: 18px; background: #000; color: #fff; border: none; border-radius: 16px; font-size: 17px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; letter-spacing: -0.2px; box-shadow: 0 0 0 2.5px #00c2ff, 0 0 20px rgba(0,194,255,0.4); transition: transform 0.1s; }
  .plate-use-btn:active { transform: scale(0.98); }

  /* Buttons */
  .add-exercise-btn { background: var(--card); border: 1.5px dashed var(--rim); border-radius: var(--r); padding: 14px; width: 100%; font-size: 14px; font-weight: 500; color: var(--muted); cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
  .add-exercise-btn:hover { border-color: var(--neon); color: var(--neon); }

  /* Rest timer buttons */
  .rest-btn { background: var(--card); border: 1.5px solid var(--rim); border-radius: 8px; padding: 6px 12px; font-size: 12px; color: var(--muted); cursor: pointer; font-family: 'DM Mono', monospace; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  .rest-btn.active { border-color: var(--neon); color: var(--neon); box-shadow: 0 0 0 1px var(--neon); }

  /* -- Warm Up Sheet -- */
  .warmup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 150; display: flex; align-items: flex-end; justify-content: center; }
  .warmup-sheet { background: #F0F0F0; border-radius: 24px 24px 0 0; width: 100%; max-width: 700px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; }
  .warmup-handle { width: 40px; height: 5px; background: #c7c7cc; border-radius: 3px; margin: 12px auto 0; flex-shrink: 0; }
  .warmup-header { padding: 14px 18px 12px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; border-bottom: 1px solid #e5e5ea; }
  .warmup-title { font-size: 18px; font-weight: 700; color: #000; }
  .warmup-body { flex: 1; overflow-y: auto; padding: 12px 14px 24px; display: flex; flex-direction: column; gap: 8px; }
  .warmup-row { background: #fff; border-radius: 12px; padding: 12px 14px; border: 1.5px solid #e5e5ea; display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .warmup-row.done-row { opacity: 0.5; }
  .warmup-check { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #e5e5ea; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.15s; flex-shrink: 0; }
  .warmup-check.checked { background: #00c2ff; border-color: #00c2ff; color: #fff; }
  .warmup-label { font-size: 13px; font-weight: 600; color: #000; flex: 1; }
  .warmup-meta { font-size: 11px; color: #8e8e93; margin-top: 2px; }
  .warmup-tag { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px; flex-shrink: 0; }
  .warmup-tag.general { background: rgba(0,229,204,0.15); color: #00b8a0; }
  .warmup-tag.feeder { background: rgba(0,194,255,0.12); color: #00c2ff; }
  .db-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 150; display: flex; align-items: flex-end; justify-content: center; }
  .db-sheet { background: #F0F0F0; border-radius: 24px 24px 0 0; width: 100%; max-width: 700px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; padding-bottom: 28px; }
  .db-handle { width: 40px; height: 5px; background: #c7c7cc; border-radius: 3px; margin: 12px auto 0; flex-shrink: 0; }
  .db-header { padding: 14px 18px 10px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .db-title { font-size: 18px; font-weight: 700; color: #000; }
  .db-close { background: #e5e5ea; border: none; color: #555; font-size: 14px; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .db-brand-row { padding: 0 14px 10px; flex-shrink: 0; }
  .db-brand-pills { display: flex; gap: 6px; }
  .db-brand-pill { flex: 1; padding: 8px 6px; border-radius: 12px; border: none; background: #fff; font-size: 12px; font-weight: 700; color: #3c3c43; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .db-brand-pill.on { background: #000; color: #fff; box-shadow: 0 0 0 2px #00c2ff, 0 0 12px rgba(0,194,255,0.3); }
  .db-info-row { margin: 0 14px 10px; background: #fff; border-radius: 16px; padding: 12px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .db-last { display: flex; flex-direction: column; align-items: center; }
  .db-last-label { font-size: 10px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.06em; }
  .db-last-num { font-size: 24px; font-weight: 700; font-family: 'DM Mono', monospace; line-height: 1; }
  .db-side-toggle { display: flex; background: #e5e5ea; border-radius: 10px; padding: 2px; }
  .db-side-btn { padding: 6px 14px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; color: #666; background: transparent; white-space: nowrap; }
  .db-side-btn.on { background: #fff; color: #000; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
  .db-grid-wrap { flex: 1; overflow-y: auto; padding: 0 14px 14px; }
  .db-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .db-weight-btn { padding: 14px 4px; border-radius: 12px; border: 1.5px solid #e5e5ea; background: #fff; font-family: 'DM Mono', monospace; font-size: 14px; font-weight: 700; color: #000; cursor: pointer; transition: all 0.15s; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.07); -webkit-tap-highlight-color: transparent; }
  .db-weight-btn:hover { border-color: #00c2ff; }
  .db-weight-btn.current { background: #000; color: #fff; border-color: #00c2ff; box-shadow: 0 0 0 2px #00c2ff, 0 0 12px rgba(0,194,255,0.3); }
  .stack-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 150; display: flex; align-items: flex-end; justify-content: center; }
  .stack-sheet { background: #F0F0F0; border-radius: 24px 24px 0 0; width: 100%; max-width: 700px; max-height: 92vh; overflow-y: auto; padding-bottom: 28px; }
  .stack-handle { width: 40px; height: 5px; background: #c7c7cc; border-radius: 3px; margin: 12px auto 0; }
  .stack-header { padding: 14px 18px 10px; display: flex; align-items: center; justify-content: space-between; }
  .stack-title { font-size: 18px; font-weight: 700; color: #000; }
  .stack-close { background: #e5e5ea; border: none; color: #555; font-size: 14px; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .stack-machine-row { padding: 0 14px 10px; }
  .stack-machine-pills { display: flex; gap: 6px; overflow-x: auto; padding: 2px; }
  .stack-machine-pills::-webkit-scrollbar { display: none; }
  .stack-machine-pill { flex-shrink: 0; padding: 6px 12px; border-radius: 10px; border: none; background: #fff; font-size: 12px; font-weight: 600; color: #3c3c43; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .stack-machine-pill.on { background: #000; color: #fff; box-shadow: 0 0 0 2px #00c2ff, 0 0 12px rgba(0,194,255,0.3); }
  .stack-total-card { margin: 0 14px 12px; background: #fff; border-radius: 16px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .stack-total-left { flex: 1; }
  .stack-total-label { font-size: 10px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
  .stack-total-num { font-size: 44px; font-weight: 700; color: #000; line-height: 1; letter-spacing: -2px; font-family: 'DM Mono', monospace; display: inline; }
  .stack-total-unit { font-size: 18px; color: #8e8e93; font-weight: 500; margin-left: 3px; }
  .stack-last { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
  .stack-last-label { font-size: 10px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.06em; }
  .stack-last-num { font-size: 24px; font-weight: 700; font-family: 'DM Mono', monospace; line-height: 1; }
  .stack-section { padding: 0 14px 12px; }
  .stack-section-label { font-size: 11px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .stack-scroll { display: flex; gap: 6px; overflow-x: auto; padding: 4px 2px 6px; }
  .stack-scroll::-webkit-scrollbar { display: none; }
  .stack-val-btn { flex-shrink: 0; width: 60px; height: 60px; border-radius: 12px; border: 1.5px solid #e5e5ea; background: #fff; font-family: 'DM Mono', monospace; font-size: 14px; font-weight: 700; color: #3c3c43; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.07); -webkit-tap-highlight-color: transparent; }
  .stack-val-btn.on { background: #000; color: #fff; border-color: #00c2ff; box-shadow: 0 0 0 2px #00c2ff, 0 0 12px rgba(0,194,255,0.3); }
  .addon-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .addon-btn { padding: 9px 14px; border-radius: 10px; border: 1.5px solid #e5e5ea; background: #fff; font-size: 13px; font-weight: 600; color: #3c3c43; cursor: pointer; font-family: 'DM Mono', monospace; transition: all 0.15s; white-space: nowrap; box-shadow: 0 1px 2px rgba(0,0,0,0.06); -webkit-tap-highlight-color: transparent; }
  .addon-btn.on { background: #000; color: #fff; border-color: #00c2ff; box-shadow: 0 0 0 2px #00c2ff, 0 0 10px rgba(0,194,255,0.25); }
  .band-row { display: flex; gap: 6px; }
  .band-btn { flex: 1; padding: 10px 4px; border-radius: 10px; border: 1.5px solid #e5e5ea; background: #fff; font-size: 12px; font-weight: 700; color: #3c3c43; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
  .band-btn.on { border-color: #00c2ff; color: #00c2ff; background: rgba(0,194,255,0.08); }
  .ratio-note { font-size: 11px; color: #8e8e93; background: #fff; border-radius: 8px; padding: 7px 12px; margin: 0 14px 10px; text-align: center; border: 1px solid #e5e5ea; }
  .stack-use-btn { margin: 6px 14px 0; width: calc(100% - 28px); padding: 18px; background: #000; color: #fff; border: none; border-radius: 16px; font-size: 17px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 0 0 2.5px #00c2ff, 0 0 20px rgba(0,194,255,0.4); transition: transform 0.1s; display: block; }
  .stack-use-btn:active { transform: scale(0.98); }

  /* -- PICKER MODAL (white theme) -- */
  .picker-overlay { position: fixed; inset: 0; background: var(--bg); z-index: 100; display: flex; flex-direction: column; max-width: 700px; margin: 0 auto; }
  .picker-topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 12px; border-bottom: 1px solid var(--rim); flex-shrink: 0; background: #fff; }
  .picker-close { background: #e5e5ea; border: none; color: #555; font-size: 14px; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .picker-title { font-size: 17px; font-weight: 700; color: #000; }
  .picker-cart { background: #000; color: #fff; border: none; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 6px; box-shadow: 0 0 0 2px #00c2ff; }
  .picker-cart-count { background: #00c2ff; color: #000; border-radius: 10px; width: 18px; height: 18px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .muscle-row { display: flex; gap: 6px; padding: 10px 16px; overflow-x: auto; flex-shrink: 0; border-bottom: 1px solid var(--rim); background: #fff; }
  .muscle-row::-webkit-scrollbar { display: none; }
  .muscle-btn { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; opacity: 0.4; transition: opacity 0.15s; }
  .muscle-btn.active { opacity: 1; }
  .muscle-icon { width: 44px; height: 48px; border-radius: 8px; background: var(--bg); border: 1.5px solid var(--rim); display: flex; align-items: center; justify-content: center; }
  .muscle-btn.active .muscle-icon { border-color: #00c2ff; background: rgba(0,194,255,0.08); }
  .muscle-label { font-size: 10px; color: #000; text-align: center; white-space: nowrap; font-weight: 500; }
  .filter-bar { display: flex; gap: 6px; padding: 8px 16px; overflow-x: auto; flex-shrink: 0; background: #fff; border-bottom: 1px solid var(--rim); }
  .filter-bar::-webkit-scrollbar { display: none; }
  .fchip { flex-shrink: 0; padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--rim); background: var(--bg); font-size: 13px; color: var(--muted); cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; white-space: nowrap; font-weight: 500; }
  .fchip.on { background: #000; border-color: #000; color: #fff; font-weight: 700; }
  .picker-search-wrap { padding: 10px 16px; flex-shrink: 0; background: #fff; }
  .picker-search { background: var(--bg); border: 1.5px solid var(--rim); border-radius: 12px; padding: 10px 14px 10px 38px; width: 100%; font-size: 14px; color: #000; outline: none; font-family: 'Inter', sans-serif; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 12px center; }
  .picker-search:focus { border-color: #00c2ff; }
  .picker-search::placeholder { color: #c7c7cc; }
  .picker-list { overflow-y: auto; flex: 1; background: var(--bg); }
  .picker-alpha { padding: 10px 16px 4px; font-size: 12px; font-weight: 700; color: var(--muted); }
  .picker-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--rim); cursor: pointer; transition: background 0.1s; background: #fff; margin: 0 0 1px; }
  .picker-item:hover { background: var(--bg); }
  .picker-item.added { opacity: 0.35; pointer-events: none; }
  .picker-item-img { width: 50px; height: 50px; border-radius: 10px; background: var(--bg); flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--rim); }
  .picker-item-text { flex: 1; min-width: 0; }
  .picker-item-name { font-size: 15px; font-weight: 600; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .picker-item-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .picker-item-sub strong { color: #000; font-weight: 600; }
  .picker-add { width: 30px; height: 30px; border-radius: 50%; background: var(--bg); border: 1.5px solid var(--rim); color: #000; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; transition: all 0.15s; }
  .picker-add.selected { background: #00c2ff; border-color: #00c2ff; color: #fff; }
  .picker-empty { padding: 40px 20px; text-align: center; color: var(--muted); font-size: 14px; }
  .picker-done-bar { padding: 12px 16px; border-top: 1px solid var(--rim); flex-shrink: 0; background: #fff; }
  .picker-done-btn { width: 100%; padding: 16px; background: #000; color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; box-shadow: 0 0 0 2px #00c2ff, 0 0 14px rgba(0,194,255,0.3); }

  /* Gym tab */
  .ex-group-title { font-size: 13px; font-weight: 700; color: var(--muted); margin: 14px 0 6px; }
  .ex-row { padding: 10px 0; border-bottom: 1px solid var(--rim); display: flex; justify-content: space-between; align-items: center; font-size: 13px; gap: 8px; }
  .ex-row:last-child { border-bottom: none; }
  .ex-row-right { text-align: right; }
  .ex-row-muscle { font-size: 11px; color: var(--muted); }

  .empty-state { text-align: center; color: var(--muted); padding: 40px 0; font-size: 14px; line-height: 1.8; }
  .empty-icon { font-size: 36px; margin-bottom: 12px; }
`;

// Muscle groups -- lucide icons
const MUSCLES = [{
  id: "chest",
  label: "Chest",
  Icon: Dumbbell
}, {
  id: "back",
  label: "Back",
  Icon: Layers
}, {
  id: "shoulders",
  label: "Shoulders",
  Icon: ArrowUp
}, {
  id: "biceps",
  label: "Biceps",
  Icon: Dumbbell
}, {
  id: "triceps",
  label: "Triceps",
  Icon: Dumbbell
}, {
  id: "quads",
  label: "Quads",
  Icon: Activity
}, {
  id: "hamstrings",
  label: "Hamstrings",
  Icon: Activity
}, {
  id: "glutes",
  label: "Glutes",
  Icon: Wind
}, {
  id: "core",
  label: "Core",
  Icon: Zap
}, {
  id: "calves",
  label: "Calves",
  Icon: Activity
}, {
  id: "traps",
  label: "Traps",
  Icon: ArrowUp
}, {
  id: "fullbody",
  label: "Full Body",
  Icon: Flame
}];

// Exercise icon mapping -- lucide components
const EX_ICON = {
  "Power Rack": Dumbbell,
  "MX100 Barbell": Weight,
  "Dumbbells": Dumbbell,
  "Kettlebells": Anchor,
  "Cable Machine": Link,
  "Preacher Pad": Dumbbell,
  "Pec Deck": Layers,
  "Thigh Machine": Activity,
  "Leg Ext/Curl": Activity,
  "Leg Press": Activity,
  "Reverse Hyper": RotateCcw,
  "Resistance Bands": Zap,
  "Accessories": BarChart2
};
const EXERCISE_DB = [{
  id: "incline-barbell-press",
  name: "Incline Barbell Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Upper Chest",
  equipment: "Power Rack",
  muscleId: "chest",
  calculator: "plate",
  bench: "Incline bench: 30 or 45 deg",
  variations: ["30 deg", "45 deg", "Wide grip", "Narrow grip", "Paused", "Chain"]
}, {
  id: "incline-smith-press",
  name: "Incline Smith Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Upper Chest",
  equipment: "Smith Machine",
  muscleId: "chest",
  calculator: "plate",
  bench: "Incline bench: 30 or 45 deg",
  variations: ["30 deg", "45 deg", "Wide grip", "Narrow grip"]
}, {
  id: "incline-dumbbell-press",
  name: "Incline Dumbbell Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Upper Chest",
  equipment: "Fixed Dumbbells",
  muscleId: "chest",
  calculator: "dumbbell",
  bench: "Incline bench: 30 or 45 deg",
  variations: ["30 deg", "45 deg", "Neutral grip", "Alternating"]
}, {
  id: "incline-dumbbell-fly",
  name: "Incline Dumbbell Fly",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Upper Chest",
  equipment: "Fixed Dumbbells",
  muscleId: "chest",
  calculator: "dumbbell",
  bench: "Incline bench: 30 or 45 deg",
  variations: ["30 deg", "45 deg", "Wide", "Narrow"]
}, {
  id: "low-cable-fly",
  name: "Low Cable Fly",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Upper Chest",
  equipment: "Cable Machine",
  muscleId: "chest",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Single arm", "Both arms", "Kneeling"]
}, {
  id: "single-arm-cable-press",
  name: "Single Arm Cable Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Upper Chest",
  equipment: "Cable Machine",
  muscleId: "chest",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Low to high", "Mid pulley"]
}, {
  id: "barbell-bench-press",
  name: "Barbell Bench Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Power Rack",
  muscleId: "chest",
  calculator: "plate",
  bench: "Flat bench: 0 deg",
  variations: ["Flat", "Wide grip", "Narrow grip", "Paused", "Chain", "Floor press"]
}, {
  id: "smith-machine-bench-press",
  name: "Smith Machine Bench Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Smith Machine",
  muscleId: "chest",
  calculator: "plate",
  bench: "Flat bench: 0 deg",
  variations: ["Flat", "Wide grip", "Narrow grip", "Decline"]
}, {
  id: "dumbbell-bench-press",
  name: "Dumbbell Bench Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Fixed Dumbbells",
  muscleId: "chest",
  calculator: "dumbbell",
  bench: "Flat bench: 0 deg",
  variations: ["Flat", "Neutral grip", "Alternating", "Feet elevated"]
}, {
  id: "dumbbell-fly",
  name: "Dumbbell Fly",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Fixed Dumbbells",
  muscleId: "chest",
  calculator: "dumbbell",
  bench: "Flat bench: 0 deg",
  variations: ["Flat", "Decline", "Wide", "Narrow"]
}, {
  id: "cable-crossover",
  name: "Cable Crossover",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Cable Machine",
  muscleId: "chest",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["High pulley", "Mid pulley", "Single arm", "Kneeling"]
}, {
  id: "pec-deck-fly",
  name: "Pec Deck Fly",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Pec Deck",
  muscleId: "chest",
  calculator: "stack",
  bench: "Seated (machine)",
  variations: ["Standard", "Low position (upper chest)", "Wide", "Narrow"]
}, {
  id: "rear-delt-pec-deck",
  name: "Rear Delt Pec Deck",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Pec Deck",
  muscleId: "chest",
  calculator: "stack",
  bench: "Seated (machine)",
  variations: ["Standard", "Wide arm"]
}, {
  id: "push-up",
  name: "Push-Up",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Accessories",
  muscleId: "chest",
  calculator: "bodyweight",
  bench: "N/A",
  variations: ["Standard", "Wide", "Close (diamond)", "Feet elevated", "Rotating handles"]
}, {
  id: "pull-up",
  name: "Pull-Up",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lats (Width)",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "bodyweight",
  bench: "N/A - hanging",
  variations: ["Wide overhand", "Close overhand", "Neutral wide", "Neutral close", "Angled", "Weighted", "Eccentric", "L-sit", "Scapular"]
}, {
  id: "chin-up",
  name: "Chin-Up",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lats (Width)",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "bodyweight",
  bench: "N/A - hanging",
  variations: ["Standard", "Close", "Wide", "Weighted"]
}, {
  id: "fat-bar-pull-up",
  name: "Fat Bar Pull-Up",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lats (Width)",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "bodyweight",
  bench: "N/A - hanging",
  variations: ["Overhand", "Underhand"]
}, {
  id: "lat-pulldown",
  name: "Lat Pulldown",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lats (Width)",
  equipment: "Cable Machine",
  muscleId: "back",
  calculator: "stack",
  bench: "Seated (cable station)",
  variations: ["Wide overhand", "Close neutral", "Underhand", "Single arm"]
}, {
  id: "straight-arm-pulldown",
  name: "Straight Arm Pulldown",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lats (Width)",
  equipment: "Cable Machine",
  muscleId: "back",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Rope", "Bar", "Single arm"]
}, {
  id: "dumbbell-pullover",
  name: "Dumbbell Pullover",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lats (Width)",
  equipment: "Fixed Dumbbells",
  muscleId: "back",
  calculator: "dumbbell",
  bench: "Flat bench: 0 deg",
  variations: ["Across bench", "Along bench"]
}, {
  id: "barbell-row-overhand",
  name: "Barbell Row (Overhand)",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Rhomboids / Mid Traps",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "plate",
  bench: "N/A - standing/bent over",
  variations: ["Standard", "Wide", "Pendlay", "Yates"]
}, {
  id: "barbell-row-underhand",
  name: "Barbell Row (Underhand)",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Rhomboids / Mid Traps",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "plate",
  bench: "N/A - standing/bent over",
  variations: ["Standard", "Close", "Yates style"]
}, {
  id: "smith-machine-row-overhand",
  name: "Smith Machine Row (Overhand)",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Rhomboids / Mid Traps",
  equipment: "Smith Machine",
  muscleId: "back",
  calculator: "plate",
  bench: "N/A - standing/bent over",
  variations: ["Standard", "Wide"]
}, {
  id: "smith-machine-row-underhand",
  name: "Smith Machine Row (Underhand)",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Rhomboids / Mid Traps",
  equipment: "Smith Machine",
  muscleId: "back",
  calculator: "plate",
  bench: "N/A - standing/bent over",
  variations: ["Standard", "Close"]
}, {
  id: "seated-cable-row",
  name: "Seated Cable Row",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Rhomboids / Mid Traps",
  equipment: "Cable Machine",
  muscleId: "back",
  calculator: "stack",
  bench: "Seated (cable station)",
  variations: ["V-bar", "Wide bar", "Single arm", "Rope"]
}, {
  id: "face-pull-back",
  name: "Face Pull",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Rhomboids / Mid Traps",
  equipment: "Cable Machine",
  muscleId: "back",
  calculator: "stack",
  bench: "N/A - standing or kneeling",
  variations: ["Rope", "Single arm", "Kneeling"]
}, {
  id: "dumbbell-row",
  name: "Dumbbell Row",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Rhomboids / Mid Traps",
  equipment: "Fixed Dumbbells",
  muscleId: "back",
  calculator: "dumbbell",
  bench: "Flat bench: 0 deg (knee supported)",
  variations: ["Standard", "Chest supported", "Incline bench", "Single arm"]
}, {
  id: "conventional-deadlift",
  name: "Conventional Deadlift",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lower Traps / Erectors",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Deficit", "Paused"]
}, {
  id: "sumo-deadlift",
  name: "Sumo Deadlift",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lower Traps / Erectors",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Wide", "Deficit"]
}, {
  id: "romanian-deadlift",
  name: "Romanian Deadlift",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lower Traps / Erectors",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Single leg", "Deficit"]
}, {
  id: "good-morning",
  name: "Good Morning",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lower Traps / Erectors",
  equipment: "Power Rack",
  muscleId: "back",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Wide stance", "Seated"]
}, {
  id: "dumbbell-rdl",
  name: "Dumbbell RDL",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lower Traps / Erectors",
  equipment: "Fixed Dumbbells",
  muscleId: "back",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Single leg"]
}, {
  id: "reverse-hyperextension",
  name: "Reverse Hyperextension",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lower Traps / Erectors",
  equipment: "Reverse Hyper",
  muscleId: "back",
  calculator: "plate",
  bench: "Prone on machine pad",
  variations: ["Standard", "Single leg", "Traction (no weight)"]
}, {
  id: "barbell-shrug",
  name: "Barbell Shrug",
  section: "Upper",
  muscle: "Traps",
  muscleHead: "Upper Traps",
  equipment: "Power Rack",
  muscleId: "traps",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Behind back", "Wide grip"]
}, {
  id: "smith-machine-shrug",
  name: "Smith Machine Shrug",
  section: "Upper",
  muscle: "Traps",
  muscleHead: "Upper Traps",
  equipment: "Smith Machine",
  muscleId: "traps",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Behind back"]
}, {
  id: "dumbbell-shrug",
  name: "Dumbbell Shrug",
  section: "Upper",
  muscle: "Traps",
  muscleHead: "Upper Traps",
  equipment: "Fixed Dumbbells",
  muscleId: "traps",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Alternating", "Rotating"]
}, {
  id: "cable-shrug",
  name: "Cable Shrug",
  section: "Upper",
  muscle: "Traps",
  muscleHead: "Upper Traps",
  equipment: "Cable Machine",
  muscleId: "traps",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Low pulley", "Single arm"]
}, {
  id: "face-pull",
  name: "Face Pull",
  section: "Upper",
  muscle: "Traps",
  muscleHead: "Rear Delt / Mid Traps",
  equipment: "Cable Machine",
  muscleId: "traps",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Rope", "Single arm", "Seated"]
}, {
  id: "overhead-press",
  name: "Overhead Press",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Front Delt",
  equipment: "Power Rack",
  muscleId: "shoulders",
  calculator: "plate",
  bench: "N/A - standing or seated",
  variations: ["Standard", "Push press", "Wide grip"]
}, {
  id: "smith-machine-ohp",
  name: "Smith Machine OHP",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Front Delt",
  equipment: "Smith Machine",
  muscleId: "shoulders",
  calculator: "plate",
  bench: "N/A - standing or seated",
  variations: ["Standard", "Behind neck"]
}, {
  id: "dumbbell-shoulder-press",
  name: "Dumbbell Shoulder Press",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Front Delt",
  equipment: "Fixed Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "Upright bench: 75 or 85 deg",
  variations: ["Seated", "Standing", "Arnold press", "Alternating"]
}, {
  id: "front-raise",
  name: "Front Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Front Delt",
  equipment: "Fixed Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Both arms", "Alternating", "Hammer grip", "Plate"]
}, {
  id: "cable-front-raise",
  name: "Cable Front Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Front Delt",
  equipment: "Cable Machine",
  muscleId: "shoulders",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Low pulley", "Single arm", "Rope"]
}, {
  id: "lateral-raise",
  name: "Lateral Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Side Delt",
  equipment: "Fixed Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "N/A - standing or seated",
  variations: ["Standard", "Seated", "Incline", "Leaning", "Partial"]
}, {
  id: "cable-lateral-raise",
  name: "Cable Lateral Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Side Delt",
  equipment: "Cable Machine",
  muscleId: "shoulders",
  calculator: "stack",
  bench: "N/A - standing or seated",
  variations: ["Single arm", "Behind back", "Both arms", "Kneeling"]
}, {
  id: "face-pull-2",
  name: "Face Pull",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Rear Delt",
  equipment: "Cable Machine",
  muscleId: "shoulders",
  calculator: "stack",
  bench: "N/A - standing or kneeling",
  variations: ["Rope", "Single arm", "Kneeling"]
}, {
  id: "rear-delt-pec-deck-2",
  name: "Rear Delt Pec Deck",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Rear Delt",
  equipment: "Pec Deck",
  muscleId: "shoulders",
  calculator: "stack",
  bench: "Seated (machine)",
  variations: ["Standard", "Wide arm"]
}, {
  id: "rear-delt-fly",
  name: "Rear Delt Fly",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Rear Delt",
  equipment: "Fixed Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "Incline bench: 30 deg (chest supported)",
  variations: ["Bent over", "Chest supported", "Incline bench"]
}, {
  id: "band-pull-apart",
  name: "Band Pull-Apart",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Rear Delt",
  equipment: "Resistance Bands",
  muscleId: "shoulders",
  calculator: "bands",
  bench: "N/A - standing",
  variations: ["Overhand", "Underhand", "Wide", "Narrow"]
}, {
  id: "barbell-curl",
  name: "Barbell Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Long Head (Outer Peak)",
  equipment: "Power Rack",
  muscleId: "biceps",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Narrow grip", "EZ bar", "Reverse", "Drag curl"]
}, {
  id: "smith-machine-curl",
  name: "Smith Machine Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Long Head (Outer Peak)",
  equipment: "Smith Machine",
  muscleId: "biceps",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Drag curl style"]
}, {
  id: "hammer-curl",
  name: "Hammer Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Long Head (Outer Peak)",
  equipment: "Fixed Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "N/A - standing or seated",
  variations: ["Alternating", "Cross-body", "Seated", "Incline"]
}, {
  id: "incline-dumbbell-curl",
  name: "Incline Dumbbell Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Long Head (Outer Peak)",
  equipment: "Fixed Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "Incline bench: 37.5 to 52.5 deg",
  variations: ["Standard", "Alternating"]
}, {
  id: "cable-curl",
  name: "Cable Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Long Head (Outer Peak)",
  equipment: "Cable Machine",
  muscleId: "biceps",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Bar", "Rope", "Overhead", "Single arm"]
}, {
  id: "adjustable-barbell-curl",
  name: "Adjustable Barbell Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Long Head (Outer Peak)",
  equipment: "Adjustable Barbell",
  muscleId: "biceps",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Curl bar", "Straight bar"]
}, {
  id: "preacher-curl",
  name: "Preacher Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Short Head (Inner)",
  equipment: "Preacher Pad",
  muscleId: "biceps",
  calculator: "plate",
  bench: "Preacher pad seat",
  variations: ["EZ bar", "Straight bar", "Single arm DB", "Hammer", "Reverse"]
}, {
  id: "concentration-curl",
  name: "Concentration Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Short Head (Inner)",
  equipment: "Fixed Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "Seated flat (lean forward on knee)",
  variations: ["Standard", "Hammer", "Reverse"]
}, {
  id: "cross-body-curl",
  name: "Cross-Body Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Short Head (Inner)",
  equipment: "Fixed Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Hammer"]
}, {
  id: "hammer-curl-adj",
  name: "Hammer Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Long Head (Outer Peak)",
  equipment: "Adjustable Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "N/A - standing or seated",
  variations: ["Alternating", "Cross-body", "Seated", "Incline"]
}, {
  id: "incline-dumbbell-curl-adj",
  name: "Incline Dumbbell Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Long Head (Outer Peak)",
  equipment: "Adjustable Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "Incline bench: 37.5 to 52.5 deg",
  variations: ["Standard", "Alternating"]
}, {
  id: "concentration-curl-adj",
  name: "Concentration Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Short Head (Inner)",
  equipment: "Adjustable Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "Seated flat (lean forward on knee)",
  variations: ["Standard", "Hammer", "Reverse"]
}, {
  id: "cross-body-curl-adj",
  name: "Cross-Body Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Short Head (Inner)",
  equipment: "Adjustable Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Hammer"]
}, {
  id: "single-arm-cable-curl",
  name: "Single Arm Cable Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Short Head (Inner)",
  equipment: "Cable Machine",
  muscleId: "biceps",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Low pulley", "High pulley", "Overhead"]
}, {
  id: "chin-up-2",
  name: "Chin-Up",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Both Heads",
  equipment: "Power Rack",
  muscleId: "biceps",
  calculator: "bodyweight",
  bench: "N/A - hanging",
  variations: ["Standard", "Close", "Wide", "Weighted"]
}, {
  id: "kettlebell-curl",
  name: "Kettlebell Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Both Heads",
  equipment: "Kettlebells",
  muscleId: "biceps",
  calculator: "kettlebell",
  bench: "N/A - standing",
  variations: ["Standard", "Hammer", "Alternating"]
}, {
  id: "overhead-cable-extension",
  name: "Overhead Cable Extension",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Long Head (Size)",
  equipment: "Cable Machine",
  muscleId: "triceps",
  calculator: "stack",
  bench: "N/A - standing or kneeling",
  variations: ["Rope", "Single arm", "Bar", "Kneeling"]
}, {
  id: "overhead-db-tricep-extension",
  name: "Overhead DB Tricep Extension",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Long Head (Size)",
  equipment: "Fixed Dumbbells",
  muscleId: "triceps",
  calculator: "dumbbell",
  bench: "Upright bench: 75 or 85 deg",
  variations: ["Two hands", "Single arm", "Seated", "Standing"]
}, {
  id: "skull-crusher",
  name: "Skull Crusher",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Long Head (Size)",
  equipment: "Power Rack",
  muscleId: "triceps",
  calculator: "plate",
  bench: "Flat bench: 0 deg",
  variations: ["EZ bar", "Straight bar", "Decline", "Floor"]
}, {
  id: "dip",
  name: "Dip",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Long Head (Size)",
  equipment: "Accessories",
  muscleId: "triceps",
  calculator: "bodyweight",
  bench: "N/A - parallel bars",
  variations: ["Bodyweight", "Weighted", "Narrow", "Wide"]
}, {
  id: "tricep-pushdown",
  name: "Tricep Pushdown",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Lateral / Medial",
  equipment: "Cable Machine",
  muscleId: "triceps",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Bar", "Rope", "V-bar", "Single arm", "Reverse grip"]
}, {
  id: "close-grip-bench-press",
  name: "Close-Grip Bench Press",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Lateral / Medial",
  equipment: "Power Rack",
  muscleId: "triceps",
  calculator: "plate",
  bench: "Flat bench: 0 deg",
  variations: ["Standard", "Pause", "Floor press", "Decline"]
}, {
  id: "smith-machine-close-grip-press",
  name: "Smith Machine Close-Grip Press",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Lateral / Medial",
  equipment: "Smith Machine",
  muscleId: "triceps",
  calculator: "plate",
  bench: "Flat bench: 0 deg",
  variations: ["Standard", "Decline"]
}, {
  id: "tricep-kickback",
  name: "Tricep Kickback",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Lateral / Medial",
  equipment: "Fixed Dumbbells",
  muscleId: "triceps",
  calculator: "dumbbell",
  bench: "Incline bench: 30 deg (chest supported)",
  variations: ["Bent over", "Incline bench", "Single arm"]
}, {
  id: "band-tricep-pushdown",
  name: "Band Tricep Pushdown",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Lateral / Medial",
  equipment: "Resistance Bands",
  muscleId: "triceps",
  calculator: "bands",
  bench: "N/A - standing",
  variations: ["Both arms", "Single arm", "Overhead"]
}, {
  id: "barbell-back-squat",
  name: "Barbell Back Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Vastus Lateralis (Outer)",
  equipment: "Power Rack",
  muscleId: "quads",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["High bar", "Low bar", "Wide stance", "Box squat", "Chain"]
}, {
  id: "smith-machine-squat",
  name: "Smith Machine Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Vastus Lateralis (Outer)",
  equipment: "Smith Machine",
  muscleId: "quads",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Wide stance", "Standard", "Box squat"]
}, {
  id: "wide-stance-leg-press",
  name: "Wide Stance Leg Press",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Vastus Lateralis (Outer)",
  equipment: "Leg Press",
  muscleId: "quads",
  calculator: "plate",
  bench: "Reclined (leg press machine)",
  variations: ["Toes straight", "Toes out 30 deg", "Toes out 45 deg"]
}, {
  id: "toes-in-leg-press",
  name: "Toes-In Leg Press",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Vastus Lateralis (Outer)",
  equipment: "Leg Press",
  muscleId: "quads",
  calculator: "plate",
  bench: "Reclined (leg press machine)",
  variations: ["Both legs", "Single leg"]
}, {
  id: "leg-extension",
  name: "Leg Extension",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "VMO (Inner)",
  equipment: "Leg Ext/Curl",
  muscleId: "quads",
  calculator: "plate",
  bench: "Seated (machine)",
  variations: ["Toes neutral", "Toes out", "Toes in", "Single leg", "Paused at top"]
}, {
  id: "narrow-low-feet-leg-press",
  name: "Narrow / Low Feet Leg Press",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "VMO (Inner)",
  equipment: "Leg Press",
  muscleId: "quads",
  calculator: "plate",
  bench: "Reclined (leg press machine)",
  variations: ["Feet close together", "Feet low on platform"]
}, {
  id: "front-squat",
  name: "Front Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "VMO (Inner)",
  equipment: "Power Rack",
  muscleId: "quads",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Pause", "Box"]
}, {
  id: "smith-machine-front-squat",
  name: "Smith Machine Front Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "VMO (Inner)",
  equipment: "Smith Machine",
  muscleId: "quads",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Narrow"]
}, {
  id: "high-feet-leg-press",
  name: "High Feet Leg Press",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Rectus Femoris",
  equipment: "Leg Press",
  muscleId: "quads",
  calculator: "plate",
  bench: "Reclined (leg press machine)",
  variations: ["Feet high", "Single leg", "High and wide"]
}, {
  id: "barbell-lunge",
  name: "Barbell Lunge",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Rectus Femoris",
  equipment: "Power Rack",
  muscleId: "quads",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Walking", "Reverse", "Step-up"]
}, {
  id: "smith-machine-lunge",
  name: "Smith Machine Lunge",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Rectus Femoris",
  equipment: "Smith Machine",
  muscleId: "quads",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Forward", "Reverse", "Split squat"]
}, {
  id: "dumbbell-lunge",
  name: "Dumbbell Lunge",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Rectus Femoris",
  equipment: "Fixed Dumbbells",
  muscleId: "quads",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Walking", "Reverse", "Lateral"]
}, {
  id: "bulgarian-split-squat",
  name: "Bulgarian Split Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Rectus Femoris",
  equipment: "Accessories",
  muscleId: "quads",
  calculator: "bodyweight",
  bench: "N/A - rear foot on bench",
  variations: ["Bodyweight", "Dumbbell", "Barbell"]
}, {
  id: "heavy-back-squat",
  name: "Heavy Back Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Vastus Intermedius (Deep)",
  equipment: "Power Rack",
  muscleId: "quads",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Full depth", "Pause at bottom"]
}, {
  id: "standard-leg-press",
  name: "Standard Leg Press",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Vastus Intermedius (Deep)",
  equipment: "Leg Press",
  muscleId: "quads",
  calculator: "plate",
  bench: "Reclined (leg press machine)",
  variations: ["Shoulder width", "Full range of motion"]
}, {
  id: "goblet-squat",
  name: "Goblet Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "All Heads",
  equipment: "Fixed Dumbbells",
  muscleId: "quads",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Pause", "Heel elevated"]
}, {
  id: "kettlebell-goblet-squat",
  name: "Kettlebell Goblet Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "All Heads",
  equipment: "Kettlebells",
  muscleId: "quads",
  calculator: "kettlebell",
  bench: "N/A - standing",
  variations: ["Standard", "Pause", "Heel elevated"]
}, {
  id: "romanian-deadlift-2",
  name: "Romanian Deadlift",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Biceps Femoris (Outer)",
  equipment: "Power Rack",
  muscleId: "hamstrings",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Single leg", "Deficit"]
}, {
  id: "smith-machine-rdl",
  name: "Smith Machine RDL",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Biceps Femoris (Outer)",
  equipment: "Smith Machine",
  muscleId: "hamstrings",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Single leg"]
}, {
  id: "dumbbell-rdl-2",
  name: "Dumbbell RDL",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Biceps Femoris (Outer)",
  equipment: "Fixed Dumbbells",
  muscleId: "hamstrings",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Single leg"]
}, {
  id: "leg-curl-toes-in",
  name: "Leg Curl (Toes In)",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Biceps Femoris (Outer)",
  equipment: "Leg Ext/Curl",
  muscleId: "hamstrings",
  calculator: "plate",
  bench: "Prone (machine)",
  variations: ["Both legs", "Single leg", "Paused"]
}, {
  id: "cable-rdl",
  name: "Cable RDL",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Biceps Femoris (Outer)",
  equipment: "Cable Machine",
  muscleId: "hamstrings",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Low pulley", "Single leg"]
}, {
  id: "kettlebell-swing",
  name: "Kettlebell Swing",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Biceps Femoris (Outer)",
  equipment: "Kettlebells",
  muscleId: "hamstrings",
  calculator: "kettlebell",
  bench: "N/A - standing",
  variations: ["Two-hand", "Single arm", "American (overhead)"]
}, {
  id: "reverse-hyper-pull-through",
  name: "Reverse Hyper Pull-Through",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Biceps Femoris (Outer)",
  equipment: "Reverse Hyper",
  muscleId: "hamstrings",
  calculator: "plate",
  bench: "Prone on machine pad",
  variations: ["Standard", "Single leg"]
}, {
  id: "lying-leg-curl",
  name: "Lying Leg Curl",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Semitendinosus / Semi",
  equipment: "Leg Ext/Curl",
  muscleId: "hamstrings",
  calculator: "plate",
  bench: "Prone (machine)",
  variations: ["Toes neutral", "Toes out", "Toes in", "Single leg", "Paused"]
}, {
  id: "stiff-leg-deadlift",
  name: "Stiff Leg Deadlift",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Semitendinosus / Semi",
  equipment: "Power Rack",
  muscleId: "hamstrings",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Wide stance"]
}, {
  id: "good-morning-2",
  name: "Good Morning",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Semitendinosus / Semi",
  equipment: "Power Rack",
  muscleId: "hamstrings",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Wide stance", "Seated"]
}, {
  id: "banded-nordic-curl",
  name: "Banded Nordic Curl",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Both Heads",
  equipment: "Resistance Bands",
  muscleId: "hamstrings",
  calculator: "bands",
  bench: "N/A - kneeling",
  variations: ["Standard", "Single leg"]
}, {
  id: "hip-thrust",
  name: "Hip Thrust",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Power Rack",
  muscleId: "glutes",
  calculator: "plate",
  bench: "Upper back on flat bench: 0 deg",
  variations: ["Standard", "Single leg", "Paused", "Band added", "Smith machine"]
}, {
  id: "smith-machine-hip-thrust",
  name: "Smith Machine Hip Thrust",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Smith Machine",
  muscleId: "glutes",
  calculator: "plate",
  bench: "Upper back on flat bench: 0 deg",
  variations: ["Standard", "Single leg", "Paused"]
}, {
  id: "high-wide-feet-leg-press",
  name: "High & Wide Feet Leg Press",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Leg Press",
  muscleId: "glutes",
  calculator: "plate",
  bench: "Reclined (leg press machine)",
  variations: ["Both legs", "Single leg"]
}, {
  id: "cable-pull-through",
  name: "Cable Pull-Through",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Cable Machine",
  muscleId: "glutes",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Rope", "Low pulley", "Single leg"]
}, {
  id: "cable-glute-kickback",
  name: "Cable Glute Kickback",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Cable Machine",
  muscleId: "glutes",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Single leg", "Ankle strap"]
}, {
  id: "sumo-deadlift-2",
  name: "Sumo Deadlift",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Power Rack",
  muscleId: "glutes",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Standard", "Wide", "Deficit"]
}, {
  id: "dumbbell-hip-thrust",
  name: "Dumbbell Hip Thrust",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Fixed Dumbbells",
  muscleId: "glutes",
  calculator: "dumbbell",
  bench: "Upper back on flat bench: 0 deg",
  variations: ["Standard", "Single leg"]
}, {
  id: "banded-hip-thrust",
  name: "Banded Hip Thrust",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Resistance Bands",
  muscleId: "glutes",
  calculator: "bands",
  bench: "Upper back on flat bench: 0 deg",
  variations: ["Standard", "Single leg", "Elevated feet"]
}, {
  id: "hip-abduction",
  name: "Hip Abduction",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Medius",
  equipment: "Thigh Machine",
  muscleId: "glutes",
  calculator: "plate",
  bench: "Seated (machine)",
  variations: ["Standard", "Leaning forward", "Toes in", "Toes out"]
}, {
  id: "cable-hip-abduction",
  name: "Cable Hip Abduction",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Medius",
  equipment: "Cable Machine",
  muscleId: "glutes",
  calculator: "stack",
  bench: "Seated (machine)",
  variations: ["Standing", "Ankle strap", "Single leg"]
}, {
  id: "lateral-band-walk",
  name: "Lateral Band Walk",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Medius",
  equipment: "Resistance Bands",
  muscleId: "glutes",
  calculator: "bands",
  bench: "N/A - standing",
  variations: ["Standing", "Squat position", "Forward walk"]
}, {
  id: "banded-clamshell",
  name: "Banded Clamshell",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Medius",
  equipment: "Resistance Bands",
  muscleId: "glutes",
  calculator: "bands",
  bench: "N/A - side lying on floor",
  variations: ["Standard", "Elevated hip", "Weighted"]
}, {
  id: "leg-press-calf-raise",
  name: "Leg Press Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Gastrocnemius (Upper)",
  equipment: "Leg Press",
  muscleId: "calves",
  calculator: "plate",
  bench: "Reclined (leg press machine)",
  variations: ["Toes straight", "Toes in", "Toes out", "Single leg", "Both legs"]
}, {
  id: "standing-calf-raise",
  name: "Standing Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Gastrocnemius (Upper)",
  equipment: "Accessories",
  muscleId: "calves",
  calculator: "bodyweight",
  bench: "N/A - standing on step",
  variations: ["Toes straight", "Toes in", "Toes out", "Single leg", "Both legs", "Weighted"]
}, {
  id: "smith-machine-calf-raise",
  name: "Smith Machine Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Gastrocnemius (Upper)",
  equipment: "Smith Machine",
  muscleId: "calves",
  calculator: "plate",
  bench: "N/A - standing (bar on back or hips)",
  variations: ["Toes straight", "Toes in", "Toes out", "Single leg"]
}, {
  id: "barbell-calf-raise",
  name: "Barbell Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Gastrocnemius (Upper)",
  equipment: "Power Rack",
  muscleId: "calves",
  calculator: "plate",
  bench: "N/A - standing on step",
  variations: ["Toes straight", "Toes in", "Toes out"]
}, {
  id: "single-leg-dumbbell-calf-raise",
  name: "Single Leg Dumbbell Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Gastrocnemius (Upper)",
  equipment: "Fixed Dumbbells",
  muscleId: "calves",
  calculator: "dumbbell",
  bench: "N/A - standing on step",
  variations: ["Toes straight", "Toes in", "Toes out"]
}, {
  id: "seated-calf-raise",
  name: "Seated Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Soleus (Lower)",
  equipment: "Fixed Dumbbells",
  muscleId: "calves",
  calculator: "dumbbell",
  bench: "Seated flat (knees bent 90 deg)",
  variations: ["Toes straight", "Toes in", "Toes out", "Single leg"]
}, {
  id: "seated-leg-press-calf-raise",
  name: "Seated Leg Press Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Soleus (Lower)",
  equipment: "Leg Press",
  muscleId: "calves",
  calculator: "plate",
  bench: "Reclined (leg press machine)",
  variations: ["Toes straight", "Toes in", "Toes out", "Single leg"]
}, {
  id: "ab-wheel-rollout",
  name: "Ab Wheel Rollout",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Rectus Abdominis",
  equipment: "Accessories",
  muscleId: "core",
  calculator: "bodyweight",
  bench: "N/A - kneeling or standing",
  variations: ["Knees", "Full extension", "Single arm"]
}, {
  id: "cable-crunch",
  name: "Cable Crunch",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Rectus Abdominis",
  equipment: "Cable Machine",
  muscleId: "core",
  calculator: "stack",
  bench: "N/A - kneeling",
  variations: ["Kneeling", "Standing", "Single arm", "Rope"]
}, {
  id: "decline-sit-up",
  name: "Decline Sit-Up",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Rectus Abdominis",
  equipment: "Accessories",
  muscleId: "core",
  calculator: "bodyweight",
  bench: "Decline bench: -8 deg",
  variations: ["Standard", "Weighted", "Twisting"]
}, {
  id: "cable-wood-chop",
  name: "Cable Wood Chop",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Obliques",
  equipment: "Cable Machine",
  muscleId: "core",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["High to low", "Low to high", "Single arm"]
}, {
  id: "side-plank",
  name: "Side Plank",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Obliques",
  equipment: "Accessories",
  muscleId: "core",
  calculator: "bodyweight",
  bench: "N/A - floor",
  variations: ["Standard", "Hip dip", "Rotation"]
}, {
  id: "plank",
  name: "Plank",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Full Core",
  equipment: "Accessories",
  muscleId: "core",
  calculator: "bodyweight",
  bench: "N/A - floor",
  variations: ["Standard", "RKC", "Weighted", "Feet elevated"]
}, {
  id: "hanging-leg-raise",
  name: "Hanging Leg Raise",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Full Core",
  equipment: "Power Rack",
  muscleId: "core",
  calculator: "bodyweight",
  bench: "N/A - hanging from bar",
  variations: ["Knees bent", "Straight legs", "Toes to bar", "Single leg"]
}, {
  id: "incline-dumbbell-press-adj",
  name: "Incline Dumbbell Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Upper Chest",
  equipment: "Adjustable Dumbbells",
  muscleId: "chest",
  calculator: "dumbbell",
  bench: "Incline bench: 30 or 45 deg",
  variations: ["30 deg", "45 deg", "Neutral grip", "Alternating"]
}, {
  id: "incline-dumbbell-fly-adj",
  name: "Incline Dumbbell Fly",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Upper Chest",
  equipment: "Adjustable Dumbbells",
  muscleId: "chest",
  calculator: "dumbbell",
  bench: "Incline bench: 30 or 45 deg",
  variations: ["30 deg", "45 deg", "Wide", "Narrow"]
}, {
  id: "dumbbell-bench-press-adj",
  name: "Dumbbell Bench Press",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Adjustable Dumbbells",
  muscleId: "chest",
  calculator: "dumbbell",
  bench: "Flat bench: 0 deg",
  variations: ["Flat", "Neutral grip", "Alternating", "Feet elevated"]
}, {
  id: "dumbbell-fly-adj",
  name: "Dumbbell Fly",
  section: "Upper",
  muscle: "Chest",
  muscleHead: "Mid / Lower Chest",
  equipment: "Adjustable Dumbbells",
  muscleId: "chest",
  calculator: "dumbbell",
  bench: "Flat bench: 0 deg",
  variations: ["Flat", "Decline", "Wide", "Narrow"]
}, {
  id: "dumbbell-pullover-adj",
  name: "Dumbbell Pullover",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lats (Width)",
  equipment: "Adjustable Dumbbells",
  muscleId: "back",
  calculator: "dumbbell",
  bench: "Flat bench: 0 deg",
  variations: ["Across bench", "Along bench"]
}, {
  id: "dumbbell-row-adj",
  name: "Dumbbell Row",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Rhomboids / Mid Traps",
  equipment: "Adjustable Dumbbells",
  muscleId: "back",
  calculator: "dumbbell",
  bench: "Flat bench: 0 deg (knee supported)",
  variations: ["Standard", "Chest supported", "Incline bench", "Single arm"]
}, {
  id: "dumbbell-rdl-adj",
  name: "Dumbbell RDL",
  section: "Upper",
  muscle: "Back",
  muscleHead: "Lower Traps / Erectors",
  equipment: "Adjustable Dumbbells",
  muscleId: "back",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Single leg"]
}, {
  id: "dumbbell-shrug-adj",
  name: "Dumbbell Shrug",
  section: "Upper",
  muscle: "Traps",
  muscleHead: "Upper Traps",
  equipment: "Adjustable Dumbbells",
  muscleId: "traps",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Alternating", "Rotating"]
}, {
  id: "dumbbell-shoulder-press-adj",
  name: "Dumbbell Shoulder Press",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Front Delt",
  equipment: "Adjustable Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "Upright bench: 75 or 85 deg",
  variations: ["Seated", "Standing", "Arnold press", "Alternating"]
}, {
  id: "front-raise-adj",
  name: "Front Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Front Delt",
  equipment: "Adjustable Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Both arms", "Alternating", "Hammer grip", "Plate"]
}, {
  id: "lateral-raise-adj",
  name: "Lateral Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Side Delt",
  equipment: "Adjustable Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "N/A - standing or seated",
  variations: ["Standard", "Seated", "Incline", "Leaning", "Partial"]
}, {
  id: "rear-delt-fly-adj",
  name: "Rear Delt Fly",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Rear Delt",
  equipment: "Adjustable Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "Incline bench: 30 deg (chest supported)",
  variations: ["Bent over", "Chest supported", "Incline bench"]
}, {
  id: "overhead-db-tricep-extension-adj",
  name: "Overhead DB Tricep Extension",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Long Head (Size)",
  equipment: "Adjustable Dumbbells",
  muscleId: "triceps",
  calculator: "dumbbell",
  bench: "Upright bench: 75 or 85 deg",
  variations: ["Two hands", "Single arm", "Seated", "Standing"]
}, {
  id: "tricep-kickback-adj",
  name: "Tricep Kickback",
  section: "Upper",
  muscle: "Triceps",
  muscleHead: "Lateral / Medial",
  equipment: "Adjustable Dumbbells",
  muscleId: "triceps",
  calculator: "dumbbell",
  bench: "Incline bench: 30 deg (chest supported)",
  variations: ["Bent over", "Incline bench", "Single arm"]
}, {
  id: "dumbbell-lunge-adj",
  name: "Dumbbell Lunge",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Rectus Femoris",
  equipment: "Adjustable Dumbbells",
  muscleId: "quads",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Walking", "Reverse", "Lateral"]
}, {
  id: "goblet-squat-adj",
  name: "Goblet Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "All Heads",
  equipment: "Adjustable Dumbbells",
  muscleId: "quads",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Pause", "Heel elevated"]
}, {
  id: "dumbbell-rdl-2-adj",
  name: "Dumbbell RDL",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Biceps Femoris (Outer)",
  equipment: "Adjustable Dumbbells",
  muscleId: "hamstrings",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standard", "Single leg"]
}, {
  id: "dumbbell-hip-thrust-adj",
  name: "Dumbbell Hip Thrust",
  section: "Lower",
  muscle: "Glutes",
  muscleHead: "Gluteus Maximus",
  equipment: "Adjustable Dumbbells",
  muscleId: "glutes",
  calculator: "dumbbell",
  bench: "Upper back on flat bench: 0 deg",
  variations: ["Standard", "Single leg"]
}, {
  id: "single-leg-dumbbell-calf-raise-adj",
  name: "Single Leg Dumbbell Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Gastrocnemius (Upper)",
  equipment: "Adjustable Dumbbells",
  muscleId: "calves",
  calculator: "dumbbell",
  bench: "N/A - standing on step",
  variations: ["Toes straight", "Toes in", "Toes out"]
}, {
  id: "seated-calf-raise-adj",
  name: "Seated Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Soleus (Lower)",
  equipment: "Adjustable Dumbbells",
  muscleId: "calves",
  calculator: "dumbbell",
  bench: "Seated flat (knees bent 90 deg)",
  variations: ["Toes straight", "Toes in", "Toes out", "Single leg"]
}, {
  id: "russian-twist",
  name: "Russian Twist",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Obliques",
  equipment: "Accessories",
  muscleId: "core",
  calculator: "none",
  bench: "N/A - seated on floor",
  variations: ["Bodyweight", "Weighted (plate)", "Weighted (medicine ball)", "Feet elevated"]
}, {
  id: "hanging-knee-raise",
  name: "Hanging Knee Raise",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Rectus Abdominis",
  equipment: "Power Rack",
  muscleId: "core",
  calculator: "none",
  bench: "N/A - hanging from pull-up bar",
  variations: ["Straight leg", "Bent knee", "Twisting (obliques)", "L-sit hold"]
}, {
  id: "bicycle-crunch",
  name: "Bicycle Crunch",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Obliques",
  equipment: "Accessories",
  muscleId: "core",
  calculator: "none",
  bench: "N/A - on floor",
  variations: ["Standard", "Slow tempo", "Weighted"]
}, {
  id: "cable-oblique-twist",
  name: "Cable Oblique Twist",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Obliques",
  equipment: "Cable Machine",
  muscleId: "core",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["High to low", "Low to high", "Horizontal", "Kneeling"]
}, {
  id: "side-bend",
  name: "Dumbbell Side Bend",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Obliques",
  equipment: "Fixed Dumbbells",
  muscleId: "core",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Single arm", "Double arm"]
}, {
  id: "side-bend-adj",
  name: "Dumbbell Side Bend",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Obliques",
  equipment: "Adjustable Dumbbells",
  muscleId: "core",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Single arm", "Double arm"]
}, {
  id: "reverse-crunch",
  name: "Reverse Crunch",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Rectus Abdominis",
  equipment: "Accessories",
  muscleId: "core",
  calculator: "none",
  bench: "N/A - on floor or bench",
  variations: ["Bodyweight", "Weighted", "Incline bench"]
}, {
  id: "pallof-press",
  name: "Pallof Press",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Full Core",
  equipment: "Cable Machine",
  muscleId: "core",
  calculator: "stack",
  bench: "N/A - standing or kneeling",
  variations: ["Standing", "Kneeling", "Half-kneeling", "Rotational"]
}, {
  id: "pallof-press-band",
  name: "Pallof Press (Band)",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Full Core",
  equipment: "Resistance Bands",
  muscleId: "core",
  calculator: "none",
  bench: "N/A - standing or kneeling",
  variations: ["Standing", "Kneeling", "Half-kneeling"]
}, {
  id: "dead-bug",
  name: "Dead Bug",
  section: "Full Body",
  muscle: "Core",
  muscleHead: "Full Core",
  equipment: "Accessories",
  muscleId: "core",
  calculator: "none",
  bench: "N/A - on floor",
  variations: ["Bodyweight", "Band-resisted", "Weighted"]
}, {
  id: "cable-lateral-raise-2",
  name: "Cable Lateral Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Side Delt",
  equipment: "Cable Machine",
  muscleId: "shoulders",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Single arm", "Behind back", "Cross-body", "Lean away"]
}, {
  id: "kettlebell-lateral-raise",
  name: "Kettlebell Lateral Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Side Delt",
  equipment: "Kettlebells",
  muscleId: "shoulders",
  calculator: "none",
  bench: "N/A - standing",
  variations: ["Standard", "Alternating"]
}, {
  id: "leaning-lateral-raise",
  name: "Leaning Lateral Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Side Delt",
  equipment: "Fixed Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "N/A - lean against pole",
  variations: ["Standard", "Full range"]
}, {
  id: "leaning-lateral-raise-adj",
  name: "Leaning Lateral Raise",
  section: "Upper",
  muscle: "Shoulders",
  muscleHead: "Side Delt",
  equipment: "Adjustable Dumbbells",
  muscleId: "shoulders",
  calculator: "dumbbell",
  bench: "N/A - lean against pole",
  variations: ["Standard", "Full range"]
}, {
  id: "nordic-curl",
  name: "Nordic Hamstring Curl",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Both Heads",
  equipment: "Accessories",
  muscleId: "hamstrings",
  calculator: "none",
  bench: "N/A - kneeling with feet anchored",
  variations: ["Assisted (band)", "Bodyweight", "Weighted", "Eccentric only"]
}, {
  id: "single-leg-lying-curl",
  name: "Single Leg Lying Curl",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Semitendinosus / Semi",
  equipment: "Leg Ext/Curl",
  muscleId: "hamstrings",
  calculator: "stack",
  bench: "Flat on machine",
  variations: ["Standard", "Alternating"]
}, {
  id: "good-morning-ham",
  name: "Good Morning",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Both Heads",
  equipment: "Power Rack",
  muscleId: "hamstrings",
  calculator: "plate",
  bench: "N/A - standing with bar on back",
  variations: ["Barbell", "Wide stance", "Narrow stance", "SSB bar"]
}, {
  id: "seated-leg-curl",
  name: "Seated Leg Curl",
  section: "Lower",
  muscle: "Hamstrings",
  muscleHead: "Semitendinosus / Semi",
  equipment: "Leg Ext/Curl",
  muscleId: "hamstrings",
  calculator: "stack",
  bench: "Seated on machine",
  variations: ["Standard", "Slow eccentric", "Single leg"]
}, {
  id: "cyclist-squat",
  name: "Cyclist Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Vastus Intermedius (Deep)",
  equipment: "Power Rack",
  muscleId: "quads",
  calculator: "plate",
  bench: "N/A - heels elevated on wedge",
  variations: ["Barbell", "Smith Machine", "Dumbbell", "Heel wedge"]
}, {
  id: "sissy-squat",
  name: "Sissy Squat",
  section: "Lower",
  muscle: "Quads",
  muscleHead: "Vastus Intermedius (Deep)",
  equipment: "Accessories",
  muscleId: "quads",
  calculator: "none",
  bench: "N/A - use support for balance",
  variations: ["Bodyweight", "Weighted (plate)", "Sissy squat bench"]
}, {
  id: "seated-calf-raise-machine",
  name: "Seated Calf Raise Machine",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Soleus (Lower)",
  equipment: "Leg Press",
  muscleId: "calves",
  calculator: "plate",
  bench: "Seated with pad on knees",
  variations: ["Both feet", "Single leg", "Toes in", "Toes out"]
}, {
  id: "donkey-calf-raise",
  name: "Donkey Calf Raise",
  section: "Lower",
  muscle: "Calves",
  muscleHead: "Gastrocnemius (Upper)",
  equipment: "Accessories",
  muscleId: "calves",
  calculator: "none",
  bench: "N/A - bent over with weight on hips",
  variations: ["Bodyweight", "Weighted plate on back"]
}, {
  id: "zottman-curl",
  name: "Zottman Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Both Heads",
  equipment: "Fixed Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standing", "Seated", "Alternating"]
}, {
  id: "zottman-curl-adj",
  name: "Zottman Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Both Heads",
  equipment: "Adjustable Dumbbells",
  muscleId: "biceps",
  calculator: "dumbbell",
  bench: "N/A - standing",
  variations: ["Standing", "Seated", "Alternating"]
}, {
  id: "reverse-curl",
  name: "Reverse Curl",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Both Heads",
  equipment: "Power Rack",
  muscleId: "biceps",
  calculator: "plate",
  bench: "N/A - standing",
  variations: ["Barbell", "EZ bar", "Straight bar"]
}, {
  id: "reverse-curl-cable",
  name: "Reverse Curl (Cable)",
  section: "Upper",
  muscle: "Biceps",
  muscleHead: "Both Heads",
  equipment: "Cable Machine",
  muscleId: "biceps",
  calculator: "stack",
  bench: "N/A - standing",
  variations: ["Straight bar", "Rope", "EZ bar attachment"]
}];
// Alias for backward compatibility
const EQUIPMENT_ALTERNATIVES = {
  "ab-wheel-rollout": ["cable-crunch", "decline-sit-up", "hanging-leg-raise", "hanging-knee-raise", "reverse-crunch", "pallof-press", "dead-bug"],
  "band-pull-apart": ["face-pull", "face-pull-2", "rear-delt-pec-deck", "rear-delt-pec-deck-2", "rear-delt-fly"],
  "band-tricep-pushdown": ["tricep-pushdown"],
  "banded-clamshell": ["hip-abduction", "cable-hip-abduction", "lateral-band-walk"],
  "banded-hip-thrust": ["hip-thrust", "smith-machine-hip-thrust", "dumbbell-hip-thrust"],
  "barbell-back-squat": ["smith-machine-squat", "front-squat", "smith-machine-front-squat", "heavy-back-squat", "goblet-squat", "kettlebell-goblet-squat", "cyclist-squat", "sissy-squat"],
  "barbell-bench-press": ["smith-machine-bench-press", "dumbbell-bench-press"],
  "barbell-calf-raise": ["leg-press-calf-raise", "standing-calf-raise", "smith-machine-calf-raise", "single-leg-dumbbell-calf-raise", "seated-calf-raise", "seated-leg-press-calf-raise"],
  "barbell-curl": ["smith-machine-curl", "mx100-curl", "preacher-curl", "reverse-curl", "reverse-curl-cable", "zottman-curl", "zottman-curl-adj"],
  "barbell-lunge": ["smith-machine-lunge", "dumbbell-lunge", "bulgarian-split-squat"],
  "barbell-row-overhand": ["barbell-row-underhand", "smith-machine-row-overhand", "smith-machine-row-underhand", "seated-cable-row", "dumbbell-row"],
  "barbell-row-underhand": ["barbell-row-overhand", "smith-machine-row-overhand", "smith-machine-row-underhand", "seated-cable-row", "dumbbell-row"],
  "barbell-shrug": ["smith-machine-shrug", "dumbbell-shrug", "cable-shrug"],
  "bulgarian-split-squat": ["barbell-lunge", "smith-machine-lunge", "dumbbell-lunge"],
  "cable-crossover": ["dumbbell-fly", "pec-deck-fly", "incline-dumbbell-fly", "low-cable-fly", "single-arm-cable-press"],
  "cable-crunch": ["ab-wheel-rollout", "decline-sit-up", "hanging-leg-raise", "hanging-knee-raise", "reverse-crunch"],
  "cable-curl": ["single-arm-cable-curl"],
  "cable-front-raise": ["front-raise"],
  "cable-glute-kickback": ["cable-pull-through"],
  "cable-hip-abduction": ["hip-abduction", "lateral-band-walk", "banded-clamshell"],
  "cable-lateral-raise": ["lateral-raise"],
  "cable-pull-through": ["cable-glute-kickback"],
  "cable-rdl": ["romanian-deadlift", "smith-machine-rdl", "dumbbell-rdl", "stiff-leg-deadlift"],
  "cable-shrug": ["barbell-shrug", "smith-machine-shrug", "dumbbell-shrug"],
  "cable-wood-chop": ["side-plank", "russian-twist", "cable-oblique-twist", "side-bend", "side-bend-adj", "pallof-press"],
  "chin-up": ["pull-up", "fat-bar-pull-up", "lat-pulldown", "straight-arm-pulldown"],
  "close-grip-bench-press": ["smith-machine-close-grip-press", "dip"],
  "concentration-curl": ["concentration-curl-adj", "hammer-curl", "hammer-curl-adj", "hammer-curl-adj", "incline-dumbbell-curl", "incline-dumbbell-curl-adj", "incline-dumbbell-curl-adj", "cross-body-curl", "cross-body-curl-adj", "cross-body-curl-adj", "kettlebell-curl"],
  "concentration-curl-adj": ["concentration-curl", "hammer-curl", "hammer-curl-adj", "hammer-curl-adj", "incline-dumbbell-curl", "incline-dumbbell-curl-adj", "incline-dumbbell-curl-adj", "cross-body-curl", "cross-body-curl-adj", "cross-body-curl-adj", "kettlebell-curl"],
  "conventional-deadlift": ["sumo-deadlift", "romanian-deadlift"],
  "cross-body-curl": ["cross-body-curl-adj", "hammer-curl", "hammer-curl-adj", "hammer-curl-adj", "incline-dumbbell-curl", "incline-dumbbell-curl-adj", "incline-dumbbell-curl-adj", "concentration-curl", "concentration-curl-adj", "concentration-curl-adj", "kettlebell-curl"],
  "cross-body-curl-adj": ["cross-body-curl", "hammer-curl", "hammer-curl-adj", "hammer-curl-adj", "incline-dumbbell-curl", "incline-dumbbell-curl-adj", "incline-dumbbell-curl-adj", "concentration-curl", "concentration-curl-adj", "concentration-curl-adj", "kettlebell-curl"],
  "decline-sit-up": ["ab-wheel-rollout", "cable-crunch", "hanging-leg-raise"],
  "dip": ["close-grip-bench-press", "smith-machine-close-grip-press"],
  "dumbbell-bench-press": ["dumbbell-bench-press-adj", "barbell-bench-press", "smith-machine-bench-press"],
  "dumbbell-bench-press-adj": ["dumbbell-bench-press", "barbell-bench-press", "smith-machine-bench-press"],
  "dumbbell-fly": ["dumbbell-fly-adj", "pec-deck-fly", "cable-crossover", "incline-dumbbell-fly", "incline-dumbbell-fly-adj"],
  "dumbbell-fly-adj": ["dumbbell-fly", "pec-deck-fly", "cable-crossover", "incline-dumbbell-fly", "incline-dumbbell-fly-adj"],
  "dumbbell-hip-thrust": ["dumbbell-hip-thrust-adj", "hip-thrust", "smith-machine-hip-thrust", "banded-hip-thrust"],
  "dumbbell-hip-thrust-adj": ["dumbbell-hip-thrust", "hip-thrust", "smith-machine-hip-thrust", "banded-hip-thrust"],
  "dumbbell-lunge": ["dumbbell-lunge-adj", "barbell-lunge", "smith-machine-lunge", "bulgarian-split-squat"],
  "dumbbell-lunge-adj": ["dumbbell-lunge", "barbell-lunge", "smith-machine-lunge", "bulgarian-split-squat"],
  "dumbbell-rdl": ["dumbbell-rdl-adj", "romanian-deadlift", "smith-machine-rdl", "cable-rdl", "stiff-leg-deadlift", "kettlebell-swing"],
  "dumbbell-rdl-adj": ["dumbbell-rdl", "romanian-deadlift", "smith-machine-rdl", "cable-rdl", "stiff-leg-deadlift", "kettlebell-swing"],
  "dumbbell-row": ["dumbbell-row-adj", "barbell-row-overhand", "barbell-row-underhand", "smith-machine-row-overhand", "smith-machine-row-underhand", "seated-cable-row"],
  "dumbbell-row-adj": ["dumbbell-row", "barbell-row-overhand", "barbell-row-underhand", "smith-machine-row-overhand", "smith-machine-row-underhand", "seated-cable-row"],
  "dumbbell-shoulder-press": ["dumbbell-shoulder-press-adj", "overhead-press", "smith-machine-ohp"],
  "dumbbell-shoulder-press-adj": ["dumbbell-shoulder-press", "overhead-press", "smith-machine-ohp"],
  "dumbbell-shrug": ["dumbbell-shrug-adj", "barbell-shrug", "smith-machine-shrug", "cable-shrug"],
  "dumbbell-shrug-adj": ["dumbbell-shrug", "barbell-shrug", "smith-machine-shrug", "cable-shrug"],
  "face-pull": ["face-pull-2", "rear-delt-pec-deck", "rear-delt-pec-deck-2", "rear-delt-fly", "band-pull-apart"],
  "face-pull-2": ["face-pull", "rear-delt-pec-deck", "rear-delt-pec-deck-2", "rear-delt-fly", "band-pull-apart"],
  "fat-bar-pull-up": ["pull-up", "chin-up"],
  "front-raise": ["front-raise-adj", "cable-front-raise"],
  "front-raise-adj": ["front-raise", "cable-front-raise"],
  "front-squat": ["barbell-back-squat", "smith-machine-squat", "smith-machine-front-squat", "heavy-back-squat", "goblet-squat", "kettlebell-goblet-squat"],
  "goblet-squat": ["goblet-squat-adj", "barbell-back-squat", "smith-machine-squat", "front-squat", "smith-machine-front-squat", "heavy-back-squat", "kettlebell-goblet-squat"],
  "goblet-squat-adj": ["goblet-squat", "barbell-back-squat", "smith-machine-squat", "front-squat", "smith-machine-front-squat", "heavy-back-squat", "kettlebell-goblet-squat"],
  "hammer-curl": ["hammer-curl-adj", "incline-dumbbell-curl", "incline-dumbbell-curl-adj", "incline-dumbbell-curl-adj", "concentration-curl", "concentration-curl-adj", "concentration-curl-adj", "cross-body-curl", "cross-body-curl-adj", "cross-body-curl-adj", "kettlebell-curl", "zottman-curl", "zottman-curl-adj", "reverse-curl"],
  "hammer-curl-adj": ["hammer-curl", "incline-dumbbell-curl", "incline-dumbbell-curl-adj", "incline-dumbbell-curl-adj", "concentration-curl", "concentration-curl-adj", "concentration-curl-adj", "cross-body-curl", "cross-body-curl-adj", "cross-body-curl-adj", "kettlebell-curl", "zottman-curl", "zottman-curl-adj", "reverse-curl"],
  "hanging-leg-raise": ["ab-wheel-rollout", "cable-crunch", "decline-sit-up"],
  "heavy-back-squat": ["barbell-back-squat", "smith-machine-squat", "front-squat", "smith-machine-front-squat", "goblet-squat", "kettlebell-goblet-squat"],
  "high-feet-leg-press": ["wide-stance-leg-press", "toes-in-leg-press", "narrow-low-feet-leg-press", "standard-leg-press"],
  "hip-abduction": ["cable-hip-abduction", "lateral-band-walk", "banded-clamshell"],
  "hip-thrust": ["smith-machine-hip-thrust", "dumbbell-hip-thrust", "banded-hip-thrust"],
  "incline-barbell-press": ["incline-smith-press", "incline-dumbbell-press"],
  "incline-dumbbell-curl": ["incline-dumbbell-curl-adj", "hammer-curl", "hammer-curl-adj", "hammer-curl-adj", "concentration-curl", "concentration-curl-adj", "concentration-curl-adj", "cross-body-curl", "cross-body-curl-adj", "cross-body-curl-adj", "kettlebell-curl"],
  "incline-dumbbell-curl-adj": ["incline-dumbbell-curl", "hammer-curl", "hammer-curl-adj", "hammer-curl-adj", "concentration-curl", "concentration-curl-adj", "concentration-curl-adj", "cross-body-curl", "cross-body-curl-adj", "cross-body-curl-adj", "kettlebell-curl"],
  "incline-dumbbell-fly": ["incline-dumbbell-fly-adj", "dumbbell-fly", "dumbbell-fly-adj", "pec-deck-fly", "cable-crossover"],
  "incline-dumbbell-fly-adj": ["incline-dumbbell-fly", "dumbbell-fly", "dumbbell-fly-adj", "pec-deck-fly", "cable-crossover"],
  "incline-dumbbell-press": ["incline-dumbbell-press-adj", "incline-barbell-press", "incline-smith-press"],
  "incline-dumbbell-press-adj": ["incline-dumbbell-press", "incline-barbell-press", "incline-smith-press"],
  "incline-smith-press": ["incline-barbell-press", "incline-dumbbell-press"],
  "kettlebell-curl": ["hammer-curl", "incline-dumbbell-curl", "concentration-curl", "cross-body-curl"],
  "kettlebell-goblet-squat": ["barbell-back-squat", "smith-machine-squat", "front-squat", "smith-machine-front-squat", "heavy-back-squat", "goblet-squat"],
  "kettlebell-swing": ["romanian-deadlift", "smith-machine-rdl", "dumbbell-rdl", "stiff-leg-deadlift"],
  "lat-pulldown": ["straight-arm-pulldown", "pull-up", "chin-up"],
  "lateral-band-walk": ["hip-abduction", "cable-hip-abduction", "banded-clamshell"],
  "lateral-raise": ["lateral-raise-adj", "cable-lateral-raise", "kettlebell-lateral-raise", "leaning-lateral-raise", "leaning-lateral-raise-adj"],
  "lateral-raise-adj": ["lateral-raise", "cable-lateral-raise", "kettlebell-lateral-raise", "leaning-lateral-raise", "leaning-lateral-raise-adj"],
  "leg-curl-toes-in": ["lying-leg-curl"],
  "leg-extension": [],
  "leg-press-calf-raise": ["standing-calf-raise", "smith-machine-calf-raise", "barbell-calf-raise", "single-leg-dumbbell-calf-raise", "seated-calf-raise", "seated-leg-press-calf-raise"],
  "low-cable-fly": ["single-arm-cable-press", "cable-crossover"],
  "lying-leg-curl": ["leg-curl-toes-in", "nordic-curl", "seated-leg-curl", "single-leg-lying-curl"],
  "mx100-curl": ["barbell-curl", "smith-machine-curl", "preacher-curl"],
  "narrow-low-feet-leg-press": ["wide-stance-leg-press", "toes-in-leg-press", "high-feet-leg-press", "standard-leg-press"],
  "overhead-cable-extension": ["overhead-db-tricep-extension", "skull-crusher"],
  "overhead-db-tricep-extension": ["overhead-db-tricep-extension-adj", "overhead-cable-extension", "skull-crusher"],
  "overhead-db-tricep-extension-adj": ["overhead-db-tricep-extension", "overhead-cable-extension", "skull-crusher"],
  "overhead-press": ["smith-machine-ohp", "dumbbell-shoulder-press"],
  "pec-deck-fly": ["dumbbell-fly", "cable-crossover", "incline-dumbbell-fly"],
  "preacher-curl": ["barbell-curl", "smith-machine-curl", "mx100-curl"],
  "pull-up": ["chin-up", "fat-bar-pull-up", "lat-pulldown", "straight-arm-pulldown"],
  "rear-delt-fly": ["rear-delt-fly-adj", "face-pull", "face-pull-2", "rear-delt-pec-deck", "rear-delt-pec-deck-2", "band-pull-apart"],
  "rear-delt-fly-adj": ["rear-delt-fly", "face-pull", "face-pull-2", "rear-delt-pec-deck", "rear-delt-pec-deck-2", "band-pull-apart"],
  "rear-delt-pec-deck": ["face-pull", "face-pull-2", "rear-delt-pec-deck-2", "rear-delt-fly", "band-pull-apart"],
  "rear-delt-pec-deck-2": ["face-pull", "face-pull-2", "rear-delt-pec-deck", "rear-delt-fly", "band-pull-apart"],
  "romanian-deadlift": ["conventional-deadlift", "sumo-deadlift", "smith-machine-rdl", "dumbbell-rdl", "cable-rdl", "stiff-leg-deadlift", "kettlebell-swing"],
  "seated-cable-row": ["barbell-row-overhand", "barbell-row-underhand", "smith-machine-row-overhand", "smith-machine-row-underhand", "dumbbell-row"],
  "seated-calf-raise": ["seated-calf-raise-adj", "leg-press-calf-raise", "standing-calf-raise", "smith-machine-calf-raise", "barbell-calf-raise", "single-leg-dumbbell-calf-raise", "single-leg-dumbbell-calf-raise-adj", "seated-leg-press-calf-raise"],
  "seated-calf-raise-adj": ["seated-calf-raise", "leg-press-calf-raise", "standing-calf-raise", "smith-machine-calf-raise", "barbell-calf-raise", "single-leg-dumbbell-calf-raise", "single-leg-dumbbell-calf-raise-adj", "seated-leg-press-calf-raise"],
  "seated-leg-press-calf-raise": ["leg-press-calf-raise", "standing-calf-raise", "smith-machine-calf-raise", "barbell-calf-raise", "single-leg-dumbbell-calf-raise", "seated-calf-raise"],
  "side-plank": ["cable-wood-chop"],
  "single-arm-cable-curl": ["cable-curl"],
  "single-arm-cable-press": ["low-cable-fly", "cable-crossover"],
  "single-leg-dumbbell-calf-raise": ["single-leg-dumbbell-calf-raise-adj", "leg-press-calf-raise", "standing-calf-raise", "smith-machine-calf-raise", "barbell-calf-raise", "seated-calf-raise", "seated-calf-raise-adj", "seated-leg-press-calf-raise"],
  "single-leg-dumbbell-calf-raise-adj": ["single-leg-dumbbell-calf-raise", "leg-press-calf-raise", "standing-calf-raise", "smith-machine-calf-raise", "barbell-calf-raise", "seated-calf-raise", "seated-calf-raise-adj", "seated-leg-press-calf-raise"],
  "skull-crusher": ["overhead-cable-extension", "overhead-db-tricep-extension"],
  "smith-machine-bench-press": ["barbell-bench-press", "dumbbell-bench-press"],
  "smith-machine-calf-raise": ["leg-press-calf-raise", "standing-calf-raise", "barbell-calf-raise", "single-leg-dumbbell-calf-raise", "seated-calf-raise", "seated-leg-press-calf-raise"],
  "smith-machine-close-grip-press": ["close-grip-bench-press", "dip"],
  "smith-machine-curl": ["barbell-curl", "mx100-curl", "preacher-curl"],
  "smith-machine-front-squat": ["barbell-back-squat", "smith-machine-squat", "front-squat", "heavy-back-squat", "goblet-squat", "kettlebell-goblet-squat"],
  "smith-machine-hip-thrust": ["hip-thrust", "dumbbell-hip-thrust", "banded-hip-thrust"],
  "smith-machine-lunge": ["barbell-lunge", "dumbbell-lunge", "bulgarian-split-squat"],
  "smith-machine-ohp": ["overhead-press", "dumbbell-shoulder-press"],
  "smith-machine-rdl": ["romanian-deadlift", "dumbbell-rdl", "cable-rdl", "stiff-leg-deadlift", "kettlebell-swing"],
  "smith-machine-row-overhand": ["barbell-row-overhand", "barbell-row-underhand", "smith-machine-row-underhand", "seated-cable-row", "dumbbell-row"],
  "smith-machine-row-underhand": ["barbell-row-overhand", "barbell-row-underhand", "smith-machine-row-overhand", "seated-cable-row", "dumbbell-row"],
  "smith-machine-shrug": ["barbell-shrug", "dumbbell-shrug", "cable-shrug"],
  "smith-machine-squat": ["barbell-back-squat", "front-squat", "smith-machine-front-squat", "heavy-back-squat", "goblet-squat", "kettlebell-goblet-squat"],
  "standard-leg-press": ["wide-stance-leg-press", "toes-in-leg-press", "narrow-low-feet-leg-press", "high-feet-leg-press"],
  "standing-calf-raise": ["leg-press-calf-raise", "smith-machine-calf-raise", "barbell-calf-raise", "single-leg-dumbbell-calf-raise", "seated-calf-raise", "seated-leg-press-calf-raise"],
  "stiff-leg-deadlift": ["romanian-deadlift", "smith-machine-rdl", "dumbbell-rdl", "cable-rdl", "kettlebell-swing"],
  "straight-arm-pulldown": ["lat-pulldown", "pull-up", "chin-up"],
  "sumo-deadlift": ["conventional-deadlift", "romanian-deadlift"],
  "toes-in-leg-press": ["wide-stance-leg-press", "narrow-low-feet-leg-press", "high-feet-leg-press", "standard-leg-press"],
  "tricep-pushdown": ["band-tricep-pushdown"],
  "wide-stance-leg-press": ["toes-in-leg-press", "narrow-low-feet-leg-press", "high-feet-leg-press", "standard-leg-press"],
  "cable-lateral-raise": ["lateral-raise", "lateral-raise-adj", "kettlebell-lateral-raise", "leaning-lateral-raise", "leaning-lateral-raise-adj"],
  "kettlebell-lateral-raise": ["lateral-raise", "lateral-raise-adj", "cable-lateral-raise", "leaning-lateral-raise", "leaning-lateral-raise-adj"],
  "leaning-lateral-raise": ["leaning-lateral-raise-adj", "lateral-raise", "lateral-raise-adj", "cable-lateral-raise", "kettlebell-lateral-raise"],
  "leaning-lateral-raise-adj": ["leaning-lateral-raise", "lateral-raise", "lateral-raise-adj", "cable-lateral-raise", "kettlebell-lateral-raise"],
  "side-bend": ["side-bend-adj", "russian-twist", "cable-oblique-twist"],
  "side-bend-adj": ["side-bend", "russian-twist", "cable-oblique-twist"],
  "russian-twist": ["bicycle-crunch", "cable-oblique-twist", "side-bend", "side-bend-adj"],
  "bicycle-crunch": ["russian-twist", "cable-oblique-twist"],
  "cable-oblique-twist": ["russian-twist", "bicycle-crunch", "side-bend", "side-bend-adj", "pallof-press"],
  "pallof-press": ["pallof-press-band", "dead-bug", "cable-oblique-twist"],
  "pallof-press-band": ["pallof-press", "dead-bug"],
  "dead-bug": ["pallof-press", "pallof-press-band"],
  "hanging-knee-raise": ["reverse-crunch", "ab-wheel-rollout", "cable-crunch", "decline-sit-up"],
  "reverse-crunch": ["hanging-knee-raise", "ab-wheel-rollout", "cable-crunch", "decline-sit-up"],
  "nordic-curl": ["lying-leg-curl", "seated-leg-curl", "good-morning", "single-leg-lying-curl"],
  "good-morning": ["romanian-deadlift", "stiff-leg-deadlift", "nordic-curl"],
  "seated-leg-curl": ["lying-leg-curl", "single-leg-lying-curl", "nordic-curl"],
  "single-leg-lying-curl": ["lying-leg-curl", "seated-leg-curl", "nordic-curl"],
  "cyclist-squat": ["sissy-squat", "barbell-back-squat", "smith-machine-squat", "front-squat"],
  "sissy-squat": ["cyclist-squat", "barbell-back-squat"],
  "seated-calf-raise-machine": ["seated-calf-raise", "seated-leg-press-calf-raise"],
  "donkey-calf-raise": ["standing-calf-raise", "barbell-calf-raise", "leg-press-calf-raise", "single-leg-dumbbell-calf-raise", "single-leg-dumbbell-calf-raise-adj"],
  "zottman-curl": ["zottman-curl-adj", "reverse-curl", "reverse-curl-cable", "hammer-curl", "hammer-curl-adj"],
  "zottman-curl-adj": ["zottman-curl", "reverse-curl", "reverse-curl-cable", "hammer-curl", "hammer-curl-adj"],
  "reverse-curl": ["reverse-curl-cable", "zottman-curl", "zottman-curl-adj", "barbell-curl", "hammer-curl", "hammer-curl-adj"],
  "reverse-curl-cable": ["reverse-curl", "zottman-curl", "zottman-curl-adj", "barbell-curl", "cable-curl"]
};
const EXERCISES = EXERCISE_DB;

// -- Alternatives map -----------------------------------------------------
const ALTERNATIVES = {
  // Squat -> Leg Press
  "bb-squat": "lp-press",
  "lp-press": "bb-squat",
  // Deadlift -> RDL
  "bb-deadlift": "bb-rdl",
  "bb-rdl": "rh-hyper",
  // Barbell OHP -> Dumbbell Shoulder Press
  "bb-ohp": "db-shoulder",
  "db-shoulder": "cb-lateral",
  // Pull-Up -> Lat Pulldown
  "bw-pullup": "cb-latpull",
  "cb-latpull": "bw-pullup",
  // Pull-up variation chains
  "bw-pullup-close": "bw-neutralclose",
  "bw-neutralwide": "bw-pullup",
  "bw-fatbar": "bw-pullup",
  "bw-weighted-pu": "bw-pullup",
  // Barbell Bench -> Dumbbell Bench
  "bb-bench": "db-press",
  "db-press": "bd-fly",
  // Barbell Row -> Cable Row
  "bb-row": "cb-seatedrow",
  "cb-seatedrow": "db-row",
  // Barbell Curl -> Cable Curl
  "bb-curl": "pc-curl",
  "pc-curl": "db-curl",
  // Leg Curl -> Reverse Hyper
  "le-curl": "rh-hyper",
  "rh-hyper": "bb-rdl",
  // Hip Thrust -> Banded Hip Thrust
  "bb-hip": "rb-hip"
};

// -- Preset workout splits -------------------------------------------------
const PRESET_WORKOUTS = [{
  id: "strength",
  name: "Strength",
  Icon: Weight,
  tag: "Powerlifting focus",
  exercises: ["barbell-back-squat", "barbell-bench-press", "conventional-deadlift", "overhead-press", "barbell-row-overhand"]
}, {
  id: "hypertrophy",
  name: "Hypertrophy",
  Icon: TrendingUp,
  tag: "Volume focus",
  exercises: ["incline-dumbbell-press", "lat-pulldown", "seated-cable-row", "wide-stance-leg-press", "lateral-raise", "tricep-pushdown", "hammer-curl"]
}, {
  id: "chest-tris",
  name: "Chest & Tris",
  Icon: Dumbbell,
  tag: "Bro split",
  exercises: ["barbell-bench-press", "incline-dumbbell-press", "pec-deck-fly", "cable-crossover", "tricep-pushdown", "overhead-cable-extension", "close-grip-bench-press"]
}, {
  id: "back-bis",
  name: "Back & Bis",
  Icon: Layers,
  tag: "Bro split",
  exercises: ["conventional-deadlift", "barbell-row-overhand", "lat-pulldown", "seated-cable-row", "face-pull-2", "barbell-curl", "preacher-curl", "hammer-curl"]
}, {
  id: "shoulders",
  name: "Shoulders",
  Icon: ArrowUp,
  tag: "Bro split",
  exercises: ["overhead-press", "lateral-raise", "front-raise", "face-pull-2", "dumbbell-shoulder-press", "barbell-shrug", "rear-delt-pec-deck-2"]
}, {
  id: "arms",
  name: "Arms",
  Icon: Dumbbell,
  tag: "Bro split",
  exercises: ["barbell-curl", "preacher-curl", "hammer-curl", "concentration-curl", "tricep-pushdown", "overhead-cable-extension", "tricep-kickback"]
}, {
  id: "legs",
  name: "Legs",
  Icon: Activity,
  tag: "Full leg day",
  exercises: ["barbell-back-squat", "wide-stance-leg-press", "leg-extension", "lying-leg-curl", "hip-thrust", "reverse-hyperextension", "leg-press-calf-raise", "hip-abduction"]
}, {
  id: "push",
  name: "Push",
  Icon: ArrowUp,
  tag: "Chest / Shoulders / Tris",
  exercises: ["barbell-bench-press", "incline-dumbbell-press", "overhead-press", "lateral-raise", "tricep-pushdown", "cable-crossover", "front-raise"]
}, {
  id: "pull",
  name: "Pull",
  Icon: RotateCcw,
  tag: "Back / Bis",
  exercises: ["conventional-deadlift", "lat-pulldown", "barbell-row-overhand", "seated-cable-row", "face-pull-2", "barbell-curl", "hammer-curl"]
}, {
  id: "upper",
  name: "Upper",
  Icon: Layers,
  tag: "Push + pull",
  exercises: ["barbell-bench-press", "barbell-row-overhand", "overhead-press", "lat-pulldown", "lateral-raise", "tricep-pushdown", "barbell-curl"]
}, {
  id: "lower",
  name: "Lower",
  Icon: Activity,
  tag: "Legs & glutes",
  exercises: ["barbell-back-squat", "standard-leg-press", "lying-leg-curl", "leg-extension", "hip-thrust", "reverse-hyperextension", "leg-press-calf-raise"]
}, {
  id: "fullbody",
  name: "Full Body",
  Icon: Flame,
  tag: "All muscle groups",
  exercises: ["conventional-deadlift", "barbell-bench-press", "barbell-row-overhand", "standard-leg-press", "dumbbell-shoulder-press", "lat-pulldown", "plank"]
}, {
  id: "circuit",
  name: "Circuit",
  Icon: Zap,
  tag: "High intensity",
  exercises: ["kettlebell-swing", "goblet-squat", "push-up", "seated-cable-row", "lateral-band-walk", "ab-wheel-rollout"]
}, {
  id: "core",
  name: "Core",
  Icon: Wind,
  tag: "Abs & stability",
  exercises: ["ab-wheel-rollout", "cable-crunch", "plank", "cable-wood-chop", "decline-sit-up"]
}];

// -- WORKOUT PLANS (structured multi-week programs) ------------------------
const PLAN_TEMPLATES = [{
  id: "phul-12wk",
  name: "PHUL",
  fullName: "Power Hypertrophy Upper Lower",
  author: "Brandon Campbell",
  goal: "powerbuilding",
  goalLabel: "Strength + Muscle",
  duration: 12,
  daysPerWeek: 4,
  level: "Intermediate",
  levelDetail: "Best for 1-3 years experience",
  description: "Combine heavy strength work (2 power days) with volume for muscle growth (2 hypertrophy days). Each muscle trained twice per week.",
  principles: ["Power days: heavy 3-5 rep sets on compound lifts", "Hypertrophy days: 8-15 rep sets for volume", "Each muscle group trained twice per week", "Double progression: reps first, then weight"],
  days: [{
    id: "upper-power",
    name: "Upper Power",
    focus: "Strength",
    muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
    exercises: [{
      id: "barbell-bench-press",
      sets: 3,
      repsLow: 3,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "barbell-row-overhand",
      sets: 3,
      repsLow: 3,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "incline-dumbbell-press",
      sets: 3,
      repsLow: 6,
      repsHigh: 10
    }, {
      id: "pull-up",
      sets: 3,
      repsLow: 6,
      repsHigh: 10
    }, {
      id: "overhead-press",
      sets: 3,
      repsLow: 5,
      repsHigh: 8,
      isMainLift: true
    }, {
      id: "barbell-curl",
      sets: 3,
      repsLow: 6,
      repsHigh: 10
    }, {
      id: "skull-crusher",
      sets: 3,
      repsLow: 6,
      repsHigh: 10
    }]
  }, {
    id: "lower-power",
    name: "Lower Power",
    focus: "Strength",
    muscles: ["Quads", "Hamstrings", "Glutes", "Calves"],
    exercises: [{
      id: "barbell-back-squat",
      sets: 3,
      repsLow: 3,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "conventional-deadlift",
      sets: 3,
      repsLow: 3,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "high-feet-leg-press",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "lying-leg-curl",
      sets: 3,
      repsLow: 6,
      repsHigh: 10
    }, {
      id: "standing-calf-raise",
      sets: 4,
      repsLow: 6,
      repsHigh: 10
    }]
  }, {
    id: "upper-hyp",
    name: "Upper Hypertrophy",
    focus: "Muscle",
    muscles: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
    exercises: [{
      id: "incline-dumbbell-press",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "seated-cable-row",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "cable-crossover",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }, {
      id: "face-pull",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }, {
      id: "overhead-db-tricep-extension",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "hammer-curl",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "lateral-raise",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }]
  }, {
    id: "lower-hyp",
    name: "Lower Hypertrophy",
    focus: "Muscle",
    muscles: ["Quads", "Hamstrings", "Glutes", "Calves"],
    exercises: [{
      id: "front-squat",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "dumbbell-lunge",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "leg-extension",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "romanian-deadlift",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "seated-leg-curl",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "seated-calf-raise",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }]
  }],
  progression: {
    type: "double-progression",
    summary: "Add reps first, then weight",
    detail: "Start at the bottom of each rep range. Add 1 rep per set each session. When you hit the top of the range on all sets, add weight next session (5lb upper body / 10lb lower body) and reset to bottom of range."
  },
  swapPolicy: "hybrid",
  deload: {
    afterWeeks: 6,
    note: "Optional deload at week 7. Reduce weight to 60% for that week, then resume normal progression at week 8."
  },
  sources: [{
    url: "https://www.muscleandstrength.com/workouts/phul-workout",
    label: "Muscle & Strength"
  }, {
    url: "https://liftvault.com/programs/strength/phul-spreadsheet/",
    label: "Lift Vault"
  }, {
    url: "https://legionathletics.com/phul-workout/",
    label: "Legion"
  }]
}, {
  id: "starting-strength-12wk",
  name: "Starting Strength",
  fullName: "Starting Strength",
  author: "Mark Rippetoe",
  goal: "strength",
  goalLabel: "Get Strong (Novice)",
  duration: 12,
  daysPerWeek: 3,
  level: "Beginner",
  levelDetail: "Best for 0-1 years of structured training",
  description: "Alternating full-body A/B workouts built around the squat, bench, press, and deadlift. Linear progression -- add weight almost every session.",
  principles: ["3 days/week, alternating Workout A and Workout B", "Squat every session -- the main driver of the program", "Add weight every session until you stall", "Power Clean substituted with Pull-Up for home-gym practicality"],
  days: [{
    id: "workout-a",
    name: "Workout A",
    focus: "Strength",
    muscles: ["Quads", "Chest", "Hamstrings", "Back"],
    exercises: [{
      id: "barbell-back-squat",
      sets: 3,
      repsLow: 5,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "barbell-bench-press",
      sets: 3,
      repsLow: 5,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "conventional-deadlift",
      sets: 1,
      repsLow: 5,
      repsHigh: 5,
      isMainLift: true
    }]
  }, {
    id: "workout-b",
    name: "Workout B",
    focus: "Strength",
    muscles: ["Quads", "Shoulders", "Back"],
    exercises: [{
      id: "barbell-back-squat",
      sets: 3,
      repsLow: 5,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "overhead-press",
      sets: 3,
      repsLow: 5,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "pull-up",
      sets: 3,
      repsLow: 5,
      repsHigh: 8
    }]
  }],
  progression: {
    type: "linear",
    summary: "Add 5lb every session until you stall",
    detail: "Add 5lb to squat every session, 2.5-5lb to bench/press/deadlift each session they're trained. When a lift stalls for 2-3 sessions in a row, back off 10% and build back up, or switch to a slower progression model."
  },
  swapPolicy: "hybrid",
  deload: {
    afterWeeks: 0,
    note: "No scheduled deload -- linear progression naturally slows as weights get heavier. Back off 10% on any lift that stalls 2-3 sessions running."
  },
  sources: [{
    url: "https://startingstrength.com/",
    label: "Starting Strength"
  }, {
    url: "https://gym-mikolo.com/blogs/home-gym/starting-strength-vs-5-3-1-vs-stronglifts-5x5-which-program-is-right-for-you",
    label: "Program Comparison"
  }]
}, {
  id: "531-bbb-16wk",
  name: "5/3/1 BBB",
  fullName: "5/3/1: Boring But Big",
  author: "Jim Wendler",
  goal: "strength",
  goalLabel: "Get Strong (Intermediate)",
  duration: 16,
  daysPerWeek: 4,
  level: "Intermediate",
  levelDetail: "Best for lifters who've stalled on linear progression",
  description: "One main lift per day with a heavy top set, followed by 5x10 'Boring But Big' volume work. Runs in 4-week cycles with a built-in deload.",
  principles: ["One main lift per session: Squat, Bench, Deadlift, OHP", "Top set is a heavy AMRAP (as many reps as possible)", "5x10 BBB volume work on the same lift builds size", "4-week cycles: 3 building weeks + 1 deload week"],
  days: [{
    id: "squat-day",
    name: "Squat Day",
    focus: "Strength",
    muscles: ["Quads", "Hamstrings", "Glutes"],
    exercises: [{
      id: "barbell-back-squat",
      sets: 3,
      repsLow: 3,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "barbell-back-squat",
      sets: 5,
      repsLow: 10,
      repsHigh: 10
    }, {
      id: "lying-leg-curl",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "plank",
      sets: 3,
      repsLow: 30,
      repsHigh: 60
    }]
  }, {
    id: "bench-day",
    name: "Bench Day",
    focus: "Strength",
    muscles: ["Chest", "Triceps", "Back"],
    exercises: [{
      id: "barbell-bench-press",
      sets: 3,
      repsLow: 3,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "barbell-bench-press",
      sets: 5,
      repsLow: 10,
      repsHigh: 10
    }, {
      id: "barbell-row-overhand",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "tricep-pushdown",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }]
  }, {
    id: "deadlift-day",
    name: "Deadlift Day",
    focus: "Strength",
    muscles: ["Hamstrings", "Glutes", "Back"],
    exercises: [{
      id: "conventional-deadlift",
      sets: 3,
      repsLow: 3,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "good-morning",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }, {
      id: "hanging-leg-raise",
      sets: 3,
      repsLow: 8,
      repsHigh: 15
    }]
  }, {
    id: "ohp-day",
    name: "OHP Day",
    focus: "Strength",
    muscles: ["Shoulders", "Triceps", "Biceps"],
    exercises: [{
      id: "overhead-press",
      sets: 3,
      repsLow: 3,
      repsHigh: 5,
      isMainLift: true
    }, {
      id: "overhead-press",
      sets: 5,
      repsLow: 10,
      repsHigh: 10
    }, {
      id: "chin-up",
      sets: 3,
      repsLow: 6,
      repsHigh: 10
    }, {
      id: "barbell-curl",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }]
  }],
  progression: {
    type: "percentage-cycle",
    summary: "Training max % cycles, +5/10lb per cycle",
    detail: "Top set uses ~85-95% of your training max (90% of true 1RM) for an AMRAP set. BBB sets stay at a fixed lighter percentage for volume. After each 4-week cycle (3 weeks building + 1 deload), add 5lb to upper body lifts and 10lb to lower body lifts to your training max."
  },
  swapPolicy: "hybrid",
  deload: {
    afterWeeks: 3,
    note: "Every 4th week is a built-in deload: drop to ~40-60% of training max for all sets to recover before the next cycle."
  },
  sources: [{
    url: "https://www.jimwendler.com/",
    label: "5/3/1 Official"
  }, {
    url: "https://www.boostcamp.app/blogs/531-program-guide-app",
    label: "Boostcamp Guide"
  }]
}, {
  id: "nippard-ppl-10wk",
  name: "Nippard PPL",
  fullName: "Ultimate Push Pull Legs",
  author: "Jeff Nippard",
  goal: "hypertrophy",
  goalLabel: "Build Muscle (Maximal)",
  duration: 10,
  daysPerWeek: 6,
  level: "Intermediate/Advanced",
  levelDetail: "Best for lifters ready for 6 days/week",
  description: "Push/Pull/Legs run twice per week for maximum muscle growth. High weekly volume per muscle group, science-based exercise selection.",
  principles: ["6 days/week: Push, Pull, Legs, Push, Pull, Legs", "Each muscle group trained twice per week", "Add weight or a rep whenever you hit the top of the rep range", "Exercise substitutions built in for equipment flexibility"],
  days: [{
    id: "push-a",
    name: "Push A",
    focus: "Hypertrophy",
    muscles: ["Chest", "Shoulders", "Triceps"],
    exercises: [{
      id: "barbell-bench-press",
      sets: 4,
      repsLow: 6,
      repsHigh: 8,
      isMainLift: true
    }, {
      id: "overhead-press",
      sets: 3,
      repsLow: 8,
      repsHigh: 10
    }, {
      id: "incline-dumbbell-press",
      sets: 3,
      repsLow: 10,
      repsHigh: 12
    }, {
      id: "lateral-raise",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }, {
      id: "tricep-pushdown",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }]
  }, {
    id: "pull-a",
    name: "Pull A",
    focus: "Hypertrophy",
    muscles: ["Back", "Biceps"],
    exercises: [{
      id: "conventional-deadlift",
      sets: 2,
      repsLow: 5,
      repsHigh: 6,
      isMainLift: true
    }, {
      id: "barbell-row-overhand",
      sets: 3,
      repsLow: 8,
      repsHigh: 10
    }, {
      id: "lat-pulldown",
      sets: 3,
      repsLow: 10,
      repsHigh: 12
    }, {
      id: "face-pull",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }, {
      id: "barbell-curl",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }]
  }, {
    id: "legs-a",
    name: "Legs A",
    focus: "Hypertrophy",
    muscles: ["Quads", "Hamstrings", "Glutes", "Calves"],
    exercises: [{
      id: "barbell-back-squat",
      sets: 4,
      repsLow: 6,
      repsHigh: 8,
      isMainLift: true
    }, {
      id: "romanian-deadlift",
      sets: 3,
      repsLow: 8,
      repsHigh: 10
    }, {
      id: "standard-leg-press",
      sets: 3,
      repsLow: 10,
      repsHigh: 12
    }, {
      id: "lying-leg-curl",
      sets: 3,
      repsLow: 10,
      repsHigh: 12
    }, {
      id: "standing-calf-raise",
      sets: 4,
      repsLow: 10,
      repsHigh: 15
    }]
  }, {
    id: "push-b",
    name: "Push B",
    focus: "Hypertrophy",
    muscles: ["Shoulders", "Chest", "Triceps"],
    exercises: [{
      id: "incline-barbell-press",
      sets: 4,
      repsLow: 6,
      repsHigh: 8,
      isMainLift: true
    }, {
      id: "dumbbell-shoulder-press",
      sets: 3,
      repsLow: 8,
      repsHigh: 10
    }, {
      id: "cable-crossover",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }, {
      id: "lateral-raise",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }, {
      id: "overhead-db-tricep-extension",
      sets: 3,
      repsLow: 10,
      repsHigh: 12
    }]
  }, {
    id: "pull-b",
    name: "Pull B",
    focus: "Hypertrophy",
    muscles: ["Back", "Biceps"],
    exercises: [{
      id: "chin-up",
      sets: 4,
      repsLow: 6,
      repsHigh: 10,
      isMainLift: true
    }, {
      id: "seated-cable-row",
      sets: 3,
      repsLow: 8,
      repsHigh: 10
    }, {
      id: "straight-arm-pulldown",
      sets: 3,
      repsLow: 10,
      repsHigh: 12
    }, {
      id: "rear-delt-fly",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }, {
      id: "hammer-curl",
      sets: 3,
      repsLow: 8,
      repsHigh: 12
    }]
  }, {
    id: "legs-b",
    name: "Legs B",
    focus: "Hypertrophy",
    muscles: ["Quads", "Hamstrings", "Glutes", "Calves"],
    exercises: [{
      id: "front-squat",
      sets: 4,
      repsLow: 6,
      repsHigh: 8,
      isMainLift: true
    }, {
      id: "bulgarian-split-squat",
      sets: 3,
      repsLow: 8,
      repsHigh: 10
    }, {
      id: "leg-extension",
      sets: 3,
      repsLow: 12,
      repsHigh: 15
    }, {
      id: "seated-leg-curl",
      sets: 3,
      repsLow: 10,
      repsHigh: 12
    }, {
      id: "seated-calf-raise",
      sets: 4,
      repsLow: 10,
      repsHigh: 15
    }]
  }],
  progression: {
    type: "double-progression",
    summary: "Add reps first, then weight",
    detail: "Work within each rep range. When you hit the top of the range for all sets, add weight next session and reset to the bottom of the range."
  },
  swapPolicy: "hybrid",
  deload: {
    afterWeeks: 5,
    note: "Optional deload at week 6. Cut volume by ~40% and stay a few reps shy of failure for the week, then resume."
  },
  sources: [{
    url: "https://jeffnippard.com/products/the-ultimate-push-pull-legs-system",
    label: "Jeff Nippard Ultimate PPL"
  }, {
    url: "https://thefitnessphantom.com/jeff-nippard-push-pull-leg-program-with-pdf",
    label: "Free PPL PDF"
  }, {
    url: "https://liftvault.com/program_goal/hypertrophy/",
    label: "Lift Vault Reviews"
  }]
}, {
  id: "fullbody-3day-12wk",
  name: "Full Body 3-Day",
  fullName: "3-Day Full Body -- Fat Loss",
  author: "General Strength & Conditioning",
  goal: "fat-loss",
  goalLabel: "Lose Fat, Keep Muscle",
  duration: 12,
  daysPerWeek: 3,
  level: "Beginner/Intermediate",
  levelDetail: "Best for time-constrained schedules or fat-loss phases",
  description: "Three non-consecutive full-body days hitting every major muscle group each session. Pair with cardio on off-days for a fat-loss phase.",
  principles: ["3 non-consecutive days/week (e.g. Mon/Wed/Fri)", "Full body every session -- higher frequency per muscle", "Higher rep ranges (10-15) support a calorie deficit", "Cardio on off-days -- tracked separately in Whoop"],
  days: [{
    id: "full-body-a",
    name: "Full Body A",
    focus: "Fat Loss",
    muscles: ["Quads", "Chest", "Back", "Core"],
    exercises: [{
      id: "barbell-back-squat",
      sets: 3,
      repsLow: 10,
      repsHigh: 15,
      isMainLift: true
    }, {
      id: "barbell-bench-press",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "barbell-row-overhand",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "plank",
      sets: 3,
      repsLow: 30,
      repsHigh: 60
    }]
  }, {
    id: "full-body-b",
    name: "Full Body B",
    focus: "Fat Loss",
    muscles: ["Hamstrings", "Shoulders", "Back", "Core"],
    exercises: [{
      id: "romanian-deadlift",
      sets: 3,
      repsLow: 10,
      repsHigh: 15,
      isMainLift: true
    }, {
      id: "overhead-press",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "lat-pulldown",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "bicycle-crunch",
      sets: 3,
      repsLow: 15,
      repsHigh: 20
    }]
  }, {
    id: "full-body-c",
    name: "Full Body C",
    focus: "Fat Loss",
    muscles: ["Quads", "Chest", "Back", "Core"],
    exercises: [{
      id: "goblet-squat",
      sets: 3,
      repsLow: 10,
      repsHigh: 15,
      isMainLift: true
    }, {
      id: "incline-dumbbell-press",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "seated-cable-row",
      sets: 3,
      repsLow: 10,
      repsHigh: 15
    }, {
      id: "hanging-leg-raise",
      sets: 3,
      repsLow: 8,
      repsHigh: 15
    }]
  }],
  progression: {
    type: "double-progression",
    summary: "Add 1 rep per set weekly, then weight",
    detail: "Start at the bottom of each rep range. Add 1 rep per set each week. When you hit the top of the range on all sets, add weight (smallest increment available) and reset to the bottom of the range."
  },
  swapPolicy: "hybrid",
  deload: {
    afterWeeks: 0,
    note: "No scheduled deload -- if fatigue builds up during a deficit, take an extra rest day or drop one accessory exercise for a week."
  },
  sources: [{
    url: "https://loadmuscle.com/blog/full-body-workout-plan",
    label: "LoadMuscle"
  }, {
    url: "https://www.muscleandstrength.com/workouts/beginner-fat-loss-workout",
    label: "Muscle & Strength 8-Week Fat Loss"
  }]
}];
const EQUIPMENT_LIST = ["Power Rack", "MX100 Barbell", "Fixed Dumbbells", "Adjustable Dumbbells (REP x Pepin)", "Adjustable Dumbbells (Snode)", "Kettlebells", "Cable Machine", "Preacher Pad", "Pec Deck", "Thigh Machine", "Leg Ext/Curl", "Leg Press", "Reverse Hyper", "Resistance Bands", "Accessories"];

// -- Dumbbell brands & weights ---------------------------------------------
const DB_BRANDS = [{
  id: "pepin",
  name: "REP x Pepin",
  max: 122.5,
  weights: Array.from({
    length: Math.ceil((122.5 - 5) / 2.5) + 1
  }, (_, i) => Math.round((5 + i * 2.5) * 100) / 100)
}, {
  id: "snode",
  name: "Snode",
  max: 80,
  weights: Array.from({
    length: Math.ceil((80 - 5) / 2.5) + 1
  }, (_, i) => Math.round((5 + i * 2.5) * 100) / 100)
}, {
  id: "fixed",
  name: "Fixed",
  max: 45,
  weights: [15, 25, 45]
}];
// -- Muscle Head Mapping ---------------------------------------------------
// Muscle groups derived from the DB itself - kept in sync automatically
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"];

// Target training frequency per week (2x = optimal for hypertrophy)
const TARGET_FREQUENCY_PER_WEEK = 2;

// Analyzer: given history, returns per-muscle-group status
function analyzeMuscleStatus(history) {
  const now = Date.now();
  const WEEK_MS = 7 * 86400000;
  const status = {};
  MUSCLE_GROUPS.forEach(muscle => {
    // Find all history entries that hit this muscle
    let lastDate = null;
    let sessionsLast14Days = 0;
    let sessionsLast7Days = 0;
    history.forEach(h => {
      const hitsThisMuscle = h.exercises?.some(hEx => {
        // Match on base ID first, then variation base ID
        const dbEx = EXERCISE_DB.find(e => e.id === (hEx.baseId || hEx.id));
        return dbEx?.muscle === muscle;
      });
      if (!hitsThisMuscle) return;
      const daysAgo = (now - h.id) / 86400000;
      if (daysAgo <= 14) sessionsLast14Days++;
      if (daysAgo <= 7) sessionsLast7Days++;
      if (!lastDate || h.id > lastDate) lastDate = h.id;
    });
    const daysSince = lastDate ? Math.floor((now - lastDate) / 86400000) : 999;

    // Priority calculation
    let priority = "green";
    let reason = "";
    if (!lastDate) {
      priority = "red";
      reason = "Not trained in the last month";
    } else if (daysSince >= 10) {
      priority = "red";
      reason = `${daysSince} days since last hit`;
    } else if (daysSince >= 7) {
      priority = "orange";
      reason = `${daysSince} days since last hit`;
    } else if (sessionsLast7Days < 1) {
      priority = "orange";
      reason = "Under target frequency";
    } else if (sessionsLast14Days < TARGET_FREQUENCY_PER_WEEK * 2) {
      priority = "orange";
      reason = `Only ${sessionsLast14Days} sessions in last 14 days`;
    }
    status[muscle] = {
      daysSince,
      sessionsLast7Days,
      sessionsLast14Days,
      priority,
      reason,
      lastDate
    };
  });
  return status;
}

// Get top-N neglected muscles sorted by priority (red first, then by days since)
function getNeglectedMuscles(history, limit = 3) {
  const status = analyzeMuscleStatus(history);
  return Object.entries(status).filter(([, s]) => s.priority !== "green").sort((a, b) => {
    // Red before orange
    if (a[1].priority !== b[1].priority) return a[1].priority === "red" ? -1 : 1;
    return b[1].daysSince - a[1].daysSince;
  }).slice(0, limit).map(([muscle, s]) => ({
    muscle,
    ...s
  }));
}

// Auto-generate a catch-up workout targeting neglected muscles
function generateCatchUpWorkout(history) {
  const neglected = getNeglectedMuscles(history, 4); // up to 4 muscles
  const workout = [];
  neglected.forEach(({
    muscle
  }) => {
    // Get 1-2 exercises per neglected muscle
    // Prefer exercises the user has done before (better weight guesses)
    const familiar = new Set();
    history.forEach(h => h.exercises?.forEach(e => familiar.add(e.baseId || e.id)));

    // Get all exercises for this muscle
    const options = EXERCISE_DB.filter(e => e.muscle === muscle);
    // Prioritize familiar ones
    const sorted = [...options].sort((a, b) => {
      const aFam = familiar.has(a.id) ? 1 : 0;
      const bFam = familiar.has(b.id) ? 1 : 0;
      return bFam - aFam;
    });

    // Pick top 1-2 (pick 2 for large muscles, 1 for small)
    const largeMuscles = ["Chest", "Back", "Quads", "Hamstrings", "Glutes"];
    const count = largeMuscles.includes(muscle) ? 2 : 1;
    const pickedForThisMuscle = new Set();
    for (const opt of sorted) {
      if (workout.some(w => w.id === opt.id)) continue;
      // Don't pick same muscle head twice
      if (pickedForThisMuscle.has(opt.muscleHead)) continue;
      workout.push(opt);
      pickedForThisMuscle.add(opt.muscleHead);
      if (pickedForThisMuscle.size >= count) break;
    }
  });
  return workout;
}

// Epley formula for estimated 1-rep max
function e1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

// Calculate all PRs from history
// Returns map: exerciseId -> { name, muscle, muscleHead, bestWeight, bestReps, bestE1RM, e1RMDate, weightDate, e1RMSet, weightSet, totalSessions }
function calculatePRs(history) {
  const prs = {};
  history.forEach(entry => {
    const entryDate = entry.dateISO ? new Date(entry.dateISO) : new Date(entry.id);
    entry.exercises?.forEach(hEx => {
      const key = hEx.baseId || hEx.id;
      const dbEx = EXERCISE_DB.find(e => e.id === key);
      if (!dbEx) return;
      if (!prs[key]) {
        prs[key] = {
          id: key,
          name: dbEx.name,
          muscle: dbEx.muscle,
          muscleHead: dbEx.muscleHead,
          bestWeight: 0,
          bestReps: 0,
          bestE1RM: 0,
          weightDate: null,
          e1RMDate: null,
          weightSet: null,
          e1RMSet: null,
          totalSessions: 0
        };
      }
      const pr = prs[key];
      pr.totalSessions++;
      hEx.sets?.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps) || 0;
        if (!s.done && w === 0) return; // skip empty sets
        if (w > pr.bestWeight) {
          pr.bestWeight = w;
          pr.bestReps = r;
          pr.weightDate = entryDate;
          pr.weightSet = {
            weight: w,
            reps: r
          };
        }
        const est = e1RM(w, r);
        if (est > pr.bestE1RM) {
          pr.bestE1RM = est;
          pr.e1RMDate = entryDate;
          pr.e1RMSet = {
            weight: w,
            reps: r
          };
        }
      });
    });
  });
  return prs;
}

// Get recent PRs (set in last N days)
function getRecentPRs(history, days = 30) {
  const prs = calculatePRs(history);
  const cutoff = Date.now() - days * 86400000;
  return Object.values(prs).filter(p => p.e1RMDate && p.e1RMDate.getTime() > cutoff).sort((a, b) => b.e1RMDate - a.e1RMDate);
}
const MACHINES = [{
  id: "pec-deck",
  name: "Pec Deck",
  maxStack: 220,
  increment: 11,
  startAt: 11,
  topPlate: 11,
  ratio: 1,
  brand: "Echo Strength"
}, {
  id: "cable-5",
  name: "Cable 5lb",
  maxStack: 300,
  increment: 5,
  startAt: 5,
  ratio: 1,
  brand: "Cable Stack"
}, {
  id: "cable-10",
  name: "Cable 10lb",
  maxStack: 300,
  increment: 10,
  startAt: 10,
  ratio: 1,
  brand: "Cable Stack"
}];

// Map exercise equipment to machine id — cable defaults to 10lb steps (user can switch)
const EQUIPMENT_TO_MACHINE = {
  "Pec Deck": "pec-deck",
  "Cable Machine": "cable-10"
};
const GYMPIN_PLATES = [2.5, 5, 10, 25, 35, 45];
const BAND_LEVELS = ["Light", "Medium", "Heavy", "X-Heavy"];

// ── Cable Attachments ─────────────────────────────────────────────────────────
const CABLE_ATTACHMENTS = [
// LAT BARS
{
  id: "wide-bar",
  name: "Wide Bar",
  category: "Lat Bars",
  note: "Standard lat pulldown, overhand wide grip"
}, {
  id: "neutral-grip-bar",
  name: "Neutral Grip Bar",
  category: "Lat Bars",
  note: "Parallel handles, easier on shoulders/elbows"
}, {
  id: "v-bar",
  name: "V-Bar",
  category: "Lat Bars",
  note: "Cambered ends, close neutral grip"
}, {
  id: "multi-grip-bar",
  name: "Multi-Grip Lat Bar",
  category: "Lat Bars",
  note: "Adjustable width, wide/close/neutral in one"
},
// ROW HANDLES
{
  id: "triangle-handle",
  name: "Triangle Handle",
  category: "Row Handles",
  note: "Two neutral grips, most common row attachment"
}, {
  id: "open-row-handle",
  name: "Open Row Handle",
  category: "Row Handles",
  note: "Wider apart, deeper ROM, doesn't hit stomach"
}, {
  id: "t-bar",
  name: "T-Bar",
  category: "Row Handles",
  note: "Close grip row handle"
}, {
  id: "d-handle",
  name: "D-Handle",
  category: "Row Handles",
  note: "Single arm, most versatile attachment"
}, {
  id: "fat-grip-handle",
  name: "Fat Grip Handle",
  category: "Row Handles",
  note: "2\" thick, single arm, forearm/grip emphasis"
},
// PRESS / BILATERAL
{
  id: "double-swivel-bar",
  name: "Double Swivel Bar (42\")",
  category: "Press / Bilateral",
  note: "Dual-stack bar, natural wrist angle, bilateral"
},
// TRICEP
{
  id: "rope",
  name: "Rope",
  category: "Tricep",
  note: "Full ROM, flare out for deep contraction"
}, {
  id: "straight-bar",
  name: "Straight Bar",
  category: "Tricep",
  note: "Locked position, load heavier than rope"
}, {
  id: "ez-bar",
  name: "EZ / Multi-Grip Bar",
  category: "Tricep",
  note: "Angled grips, easier on wrists"
},
// LOWER BODY
{
  id: "ankle-strap",
  name: "Ankle Strap",
  category: "Lower Body",
  note: "Leg movements, also wrist use for upper body"
}, {
  id: "belt-squat-belt",
  name: "Belt Squat Belt",
  category: "Lower Body",
  note: "Hip-loaded, low pulley squats/lunges"
},
// CORE
{
  id: "ab-strap",
  name: "Ab Strap",
  category: "Core",
  note: "Forearm loops, high pulley cable crunches"
}];

// Research-based default attachment per cable exercise id
const CABLE_ATTACHMENT_DEFAULTS = {
  "lat-pulldown": "wide-bar",
  "straight-arm-pulldown": "straight-bar",
  "seated-cable-row": "triangle-handle",
  "face-pull": "rope",
  "face-pull-2": "rope",
  "cable-shrug": "d-handle",
  "low-cable-fly": "d-handle",
  "single-arm-cable-press": "d-handle",
  "cable-crossover": "d-handle",
  "cable-front-raise": "d-handle",
  "cable-lateral-raise": "d-handle",
  "cable-curl": "straight-bar",
  "single-arm-cable-curl": "d-handle",
  "overhead-cable-extension": "rope",
  "tricep-pushdown": "rope",
  "cable-rdl": "d-handle",
  "cable-pull-through": "rope",
  "cable-glute-kickback": "ankle-strap",
  "cable-hip-abduction": "ankle-strap",
  "cable-crunch": "ab-strap",
  "cable-wood-chop": "d-handle",
  "cable-oblique-twist": "d-handle",
  "pallof-press": "d-handle",
  "reverse-curl-cable": "straight-bar"
};
function today() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}
function totalVolume(exs) {
  return exs.reduce((a, ex) => a + ex.sets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0);
}

// -- Big Plate Toggle -- square, two tap zones, no circle -------------------
function BigPlateToggle({
  count,
  onAdd,
  onRemove
}) {
  const [pressing, setPressing] = useState(null); // "add" | "remove" | null
  const neon = "#00c2ff";
  const active = count > 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 110,
      height: 110,
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: active ? `0 0 0 2.5px ${neon}, 0 0 18px ${neon}66` : "0 1px 4px rgba(0,0,0,0.1)",
      transition: "box-shadow 0.2s",
      flexShrink: 0,
      userSelect: "none",
      WebkitTapHighlightColor: "transparent"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onPointerDown: () => {
      setPressing("add");
      onAdd();
    },
    onPointerUp: () => setPressing(null),
    onPointerLeave: () => setPressing(null),
    style: {
      height: "50%",
      background: pressing === "add" ? neon : "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "background 0.1s",
      borderBottom: `1.5px solid ${active ? neon : "#e5e5ea"}`
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "36",
    height: "36",
    viewBox: "0 0 36 36"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "18",
    y2: "30",
    stroke: pressing === "add" ? "#fff" : active ? neon : "#bbb",
    strokeWidth: "3.5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "18",
    x2: "30",
    y2: "18",
    stroke: pressing === "add" ? "#fff" : active ? neon : "#bbb",
    strokeWidth: "3.5",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("div", {
    onPointerDown: () => {
      setPressing("remove");
      onRemove();
    },
    onPointerUp: () => setPressing(null),
    onPointerLeave: () => setPressing(null),
    style: {
      height: "50%",
      background: pressing === "remove" ? neon : "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "background 0.1s"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "36",
    height: "36",
    viewBox: "0 0 36 36"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "18",
    x2: "30",
    y2: "18",
    stroke: pressing === "remove" ? "#fff" : active ? neon : "#bbb",
    strokeWidth: "3.5",
    strokeLinecap: "round"
  }))));
}

// -- Small Plate Toggle (kept for reference, unused) ------------------------
function PlateToggle({
  count,
  color,
  onAdd,
  onRemove
}) {
  return null; // replaced by BigPlateToggle
}

// -- Weekly Sets Per Muscle ------------------------------------------------
function WeeklyStats({
  history
}) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter(h => h.id >= cutoff);
  if (recent.length === 0) return null;

  // Count sets per muscleId
  const setCounts = {};
  recent.forEach(h => {
    h.exercises.forEach(ex => {
      const mid = ex.muscleId || "other";
      const sets = ex.sets?.length || 0;
      setCounts[mid] = (setCounts[mid] || 0) + sets;
    });
  });

  // Science-backed optimal range: 10-20 sets per muscle per week
  const OPTIMAL_MIN = 10,
    OPTIMAL_MAX = 20;
  const muscles = Object.entries(setCounts).sort((a, b) => b[1] - a[1]);
  if (muscles.length === 0) return null;

  // Time of day breakdown
  const timeBreakdown = {};
  history.filter(h => h.timeLabel).forEach(h => {
    timeBreakdown[h.timeLabel] = (timeBreakdown[h.timeLabel] || 0) + 1;
  });
  const bestTime = Object.entries(timeBreakdown).sort((a, b) => b[1] - a[1])[0];
  const muscleColors = {
    chest: "#0a84ff",
    back: "#30d158",
    shoulders: "#ff9f0a",
    quads: "#ff375f",
    hamstrings: "#bf5af2",
    glutes: "#ff6961",
    biceps: "#00c2ff",
    triceps: "#00c2ff",
    core: "#00E5CC",
    traps: "#30d158"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      border: "1.5px solid #e5e5ea",
      padding: "14px 14px 16px",
      marginBottom: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#000",
      marginBottom: 4
    }
  }, "This Week"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginBottom: 12
    }
  }, recent.length, " workout", recent.length !== 1 ? "s" : "", " . Sets per muscle group"), muscles.map(([mid, count]) => {
    const pct = Math.min(count / OPTIMAL_MAX * 100, 100);
    const color = muscleColors[mid] || "#c7c7cc";
    const status = count < OPTIMAL_MIN ? "Under" : count <= OPTIMAL_MAX ? "Optimal" : "High";
    const statusColor = count < OPTIMAL_MIN ? "#ff3b30" : count <= OPTIMAL_MAX ? "#30d158" : "#ff9f0a";
    return /*#__PURE__*/React.createElement("div", {
      key: mid,
      style: {
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#000",
        textTransform: "capitalize"
      }
    }, mid), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: statusColor,
        background: statusColor + "18",
        borderRadius: 5,
        padding: "1px 6px"
      }
    }, status), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#000",
        fontFamily: "DM Mono,monospace"
      }
    }, count, " sets"))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: "#F0F0F0",
        borderRadius: 3,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        width: `${pct}%`,
        background: color,
        borderRadius: 3,
        transition: "width 0.4s ease"
      }
    })));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#8e8e93",
      textAlign: "right",
      marginTop: 4
    }
  }, "Optimal range: ", OPTIMAL_MIN, "-", OPTIMAL_MAX, " sets/week per muscle"), bestTime && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      paddingTop: 10,
      borderTop: "1px solid #F0F0F0",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "You train most in the"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "#000",
      background: "#F0F0F0",
      borderRadius: 6,
      padding: "2px 8px"
    }
  }, bestTime[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "(", bestTime[1], " session", bestTime[1] !== 1 ? "s" : "", ")")));
}

// -- Muscle Intelligence Panel ---------------------------------------------
function MuscleIntelligence({
  history
}) {
  const status = analyzeMuscleStatus(history);
  const colors = {
    red: "#ff3b30",
    orange: "#ff9f0a",
    green: "#30d158"
  };
  const labels = {
    red: "Overdue",
    orange: "Due soon",
    green: "Fresh"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      border: "1.5px solid #e5e5ea",
      padding: "14px 14px 16px",
      marginBottom: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#000"
    }
  }, "Muscle Intelligence"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 2
    }
  }, "Training frequency . target 2x/week per muscle")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, MUSCLE_GROUPS.map(muscle => {
    const s = status[muscle];
    const c = colors[s.priority];
    const timeText = s.daysSince >= 999 ? "Never trained" : s.daysSince === 0 ? "Trained today" : s.daysSince === 1 ? "Trained yesterday" : `${s.daysSince} days ago`;
    return /*#__PURE__*/React.createElement("div", {
      key: muscle,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "#fafafa",
        borderRadius: 10,
        border: "1px solid #f0f0f0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: c,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 800,
        color: "#fff",
        boxShadow: `0 0 8px ${c}66`
      }
    }, s.sessionsLast14Days), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#000"
      }
    }, muscle), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginTop: 1
      }
    }, timeText, " · ", s.sessionsLast14Days, " session", s.sessionsLast14Days !== 1 ? "s" : "", " last 14 days")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 20,
        background: c + "22",
        color: c,
        flexShrink: 0
      }
    }, labels[s.priority]));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "center",
      marginTop: 12,
      paddingTop: 10,
      borderTop: "1px solid #F0F0F0"
    }
  }, [["#30d158", "Fresh (<7 days, 2+/wk)"], ["#ff9f0a", "Due soon"], ["#ff3b30", "Overdue"]].map(([c, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 10,
      color: "#8e8e93"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: c
    }
  }), l))));
}

// -- PRs Panel ----------------------------------------------------------
function PRsPanel({
  history,
  onOpenChart
}) {
  const [expandedMuscle, setExpandedMuscle] = useState(null);
  const [tab, setTab] = useState("recent"); // recent | all

  const prs = calculatePRs(history);
  const recentPRs = getRecentPRs(history, 30);

  // Group by muscle
  const byMuscle = {};
  Object.values(prs).forEach(p => {
    if (!byMuscle[p.muscle]) byMuscle[p.muscle] = [];
    byMuscle[p.muscle].push(p);
  });
  MUSCLE_GROUPS.forEach(m => {
    if (byMuscle[m]) byMuscle[m].sort((a, b) => b.bestE1RM - a.bestE1RM);
  });
  const fmtDate = d => d ? d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  }) : "--";
  if (Object.keys(prs).length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 16,
        border: "1.5px solid #e5e5ea",
        padding: "18px 16px",
        marginBottom: 16,
        textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "#000",
        marginBottom: 4
      }
    }, "Personal Records"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93"
      }
    }, "Log workouts and PRs will appear here."));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      border: "1.5px solid #e5e5ea",
      padding: "14px 14px 16px",
      marginBottom: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#000"
    }
  }, "Personal Records"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 2
    }
  }, "Best set per exercise . e1RM = estimated 1-rep max")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#00c2ff",
      padding: "3px 8px",
      background: "rgba(0,194,255,0.08)",
      borderRadius: 10
    }
  }, Object.keys(prs).length)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      background: "#F0F0F0",
      borderRadius: 8,
      padding: 3,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab("recent"),
    style: {
      flex: 1,
      padding: "7px 10px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      fontFamily: "Inter,sans-serif",
      background: tab === "recent" ? "#fff" : "transparent",
      color: tab === "recent" ? "#000" : "#8e8e93",
      boxShadow: tab === "recent" ? "0 1px 2px rgba(0,0,0,0.08)" : "none"
    }
  }, "Recent (", recentPRs.length, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab("all"),
    style: {
      flex: 1,
      padding: "7px 10px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      fontFamily: "Inter,sans-serif",
      background: tab === "all" ? "#fff" : "transparent",
      color: tab === "all" ? "#000" : "#8e8e93",
      boxShadow: tab === "all" ? "0 1px 2px rgba(0,0,0,0.08)" : "none"
    }
  }, "All-Time")), tab === "recent" && /*#__PURE__*/React.createElement(React.Fragment, null, recentPRs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "12px",
      fontSize: 12,
      color: "#8e8e93"
    }
  }, "No PRs in the last 30 days. Time to lift heavy.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, recentPRs.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => onOpenChart && onOpenChart(p.id),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: "linear-gradient(90deg, rgba(0,194,255,0.06) 0%, transparent 100%)",
      borderRadius: 10,
      border: "1px solid rgba(0,194,255,0.2)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18
    }
  }, "🏆"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#000"
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 1
    }
  }, p.e1RMSet.weight, "lb × ", p.e1RMSet.reps, " · ", fmtDate(p.e1RMDate))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: "#00c2ff",
      fontFamily: "DM Mono,monospace"
    }
  }, Math.round(p.bestE1RM), "lb"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "#8e8e93",
      fontWeight: 700,
      letterSpacing: "0.05em"
    }
  }, "e1RM")))))), tab === "all" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, MUSCLE_GROUPS.filter(m => byMuscle[m]?.length).map(muscle => {
    const isOpen = expandedMuscle === muscle;
    const exs = byMuscle[muscle];
    const topE1RM = Math.round(exs[0]?.bestE1RM || 0);
    return /*#__PURE__*/React.createElement("div", {
      key: muscle,
      style: {
        border: "1px solid #f0f0f0",
        borderRadius: 10,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setExpandedMuscle(isOpen ? null : muscle),
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        background: "#fafafa",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#000"
      }
    }, muscle), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        padding: "1px 8px",
        background: "#fff",
        borderRadius: 8
      }
    }, exs.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93"
      }
    }, "top ", topE1RM, "lb"), /*#__PURE__*/React.createElement(ChevronDown, {
      size: 14,
      strokeWidth: 2.5,
      color: "#00c2ff",
      style: {
        transform: isOpen ? "rotate(180deg)" : "none",
        transition: "transform 0.2s"
      }
    }))), isOpen && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff"
      }
    }, exs.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      onClick: () => onOpenChart && onOpenChart(p.id),
      style: {
        padding: "10px 12px",
        borderTop: "1px solid #f5f5f7",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#000"
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#8e8e93",
        marginTop: 1
      }
    }, p.totalSessions, " session", p.totalSessions !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: "#00c2ff",
        fontFamily: "DM Mono,monospace"
      }
    }, Math.round(p.bestE1RM), "lb"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#8e8e93",
        fontWeight: 700,
        letterSpacing: "0.05em"
      }
    }, "e1RM"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        marginTop: 6,
        paddingTop: 6,
        borderTop: "1px dashed #f0f0f0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#8e8e93",
        fontWeight: 700,
        letterSpacing: "0.05em"
      }
    }, "BEST WEIGHT"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#000",
        fontFamily: "DM Mono,monospace",
        marginTop: 1
      }
    }, p.weightSet.weight, "lb × ", p.weightSet.reps), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#8e8e93",
        marginTop: 1
      }
    }, fmtDate(p.weightDate))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: "#8e8e93",
        fontWeight: 700,
        letterSpacing: "0.05em"
      }
    }, "BEST e1RM SET"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#000",
        fontFamily: "DM Mono,monospace",
        marginTop: 1
      }
    }, p.e1RMSet.weight, "lb × ", p.e1RMSet.reps), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#8e8e93",
        marginTop: 1
      }
    }, fmtDate(p.e1RMDate))))))));
  })));
}

// -- Plan Schedule View ----------------------------------------------------------
// Shows the 12-week roadmap: which day of each week has which session, plus cardio
function PlanScheduleView({
  plan,
  activePlan,
  scheduleDays,
  cardioDays,
  history
}) {
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"]; // Sun=0
  const dayFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date();
  const todayDow = today.getDay();

  // Sort training days for consistent plan assignment
  const sortedTrainingDays = [...scheduleDays].sort((a, b) => a - b);

  // If user has fewer training days than plan requires, show warning
  const insufficient = sortedTrainingDays.length < plan.daysPerWeek;

  // Get plan session for a given day of week
  // Returns { day, index } or null
  const getPlanSessionForDow = dow => {
    const idx = sortedTrainingDays.indexOf(dow);
    if (idx === -1 || idx >= plan.daysPerWeek) return null;
    return {
      day: plan.days[idx],
      index: idx
    };
  };

  // Short session labels
  const shortLabel = name => {
    const words = name.split(" ");
    return words.map(w => w[0]).join("");
  };

  // Get date for a given week/dow relative to plan start
  const planStart = activePlan ? new Date(activePlan.startedAt) : null;
  const getDateFor = (weekNum, dow) => {
    if (!planStart) return null;
    // Week 1 starts on the plan start date
    const startDow = planStart.getDay();
    const startOfWeek1 = new Date(planStart);
    startOfWeek1.setDate(planStart.getDate() - startDow); // back to Sunday of that week
    const targetDate = new Date(startOfWeek1);
    targetDate.setDate(startOfWeek1.getDate() + (weekNum - 1) * 7 + dow);
    return targetDate;
  };

  // Check if a session was completed (matches by date + workoutType containing plan/day info)
  const isSessionDone = (weekNum, dow) => {
    if (!activePlan) return false;
    const date = getDateFor(weekNum, dow);
    if (!date) return false;
    const dateStr = date.toDateString();
    return history.some(h => {
      const hDate = h.dateISO ? new Date(h.dateISO) : new Date(h.id);
      return hDate.toDateString() === dateStr && h.type && h.type.startsWith(plan.name);
    });
  };
  const isCardioDone = (weekNum, dow) => {
    if (!activePlan) return false;
    const date = getDateFor(weekNum, dow);
    if (!date) return false;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    // Would need cardioLog access here; skip for now, just show scheduled
    return false;
  };
  const isToday = (weekNum, dow) => {
    if (!activePlan) return false;
    const date = getDateFor(weekNum, dow);
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };
  const isCurrentWeek = weekNum => {
    return activePlan && weekNum === activePlan.currentWeek;
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#000",
      borderRadius: 14,
      padding: "14px 12px",
      border: "1.5px solid #1c1c1e",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 4px",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, "Full Schedule"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 2
    }
  }, plan.duration, " weeks · Sessions on your training days · Cardio overlay")), insufficient && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff9e6",
      border: "1px solid #ffd580",
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 10,
      fontSize: 11,
      color: "#000",
      lineHeight: 1.4
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Heads up:"), " This plan needs ", plan.daysPerWeek, " training days/week but you have ", sortedTrainingDays.length, " set. Update schedule in Calendar tab."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "36px repeat(7, 1fr)",
      gap: 3,
      padding: "0 4px",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", null), dayLabels.map((label, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: "center",
      fontSize: 9,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.04em"
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, Array.from({
    length: plan.duration
  }, (_, wIdx) => {
    const weekNum = wIdx + 1;
    const highlight = isCurrentWeek(weekNum);
    return /*#__PURE__*/React.createElement("div", {
      key: weekNum,
      style: {
        display: "grid",
        gridTemplateColumns: "36px repeat(7, 1fr)",
        gap: 3,
        padding: "3px 4px",
        borderRadius: 6,
        background: highlight ? "rgba(0,194,255,0.12)" : "transparent",
        border: highlight ? "1px solid rgba(0,194,255,0.35)" : "1px solid transparent"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        color: highlight ? "#00c2ff" : "#8e8e93",
        fontFamily: "DM Mono,monospace"
      }
    }, "W", weekNum), dayLabels.map((_, dow) => {
      const session = getPlanSessionForDow(dow);
      const isCardio = cardioDays.includes(dow);
      const cellIsToday = isToday(weekNum, dow);
      const done = isSessionDone(weekNum, dow);
      let bg, borderColor, textColor, cellType;
      if (session) {
        bg = done ? "rgba(16,185,129,0.12)" : cellIsToday ? "#00c2ff" : "rgba(0,194,255,0.08)";
        borderColor = done ? "#10b981" : cellIsToday ? "#00c2ff" : "rgba(0,194,255,0.3)";
        textColor = done ? "#059669" : cellIsToday ? "#000" : "#00c2ff";
        cellType = done ? "done" : "session";
      } else if (isCardio) {
        bg = "rgba(244,63,94,0.08)";
        borderColor = "rgba(244,63,94,0.35)";
        textColor = "#e11d48";
        cellType = "cardio";
      } else {
        bg = "#1c1c1e";
        borderColor = "#2c2c2e";
        textColor = "#48484a";
        cellType = "rest";
      }
      return /*#__PURE__*/React.createElement("div", {
        key: dow,
        style: {
          aspectRatio: "1",
          borderRadius: 6,
          background: bg,
          border: `1.5px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 800,
          color: textColor,
          fontFamily: "DM Mono,monospace",
          letterSpacing: "0.02em",
          boxShadow: cellIsToday ? "0 0 6px rgba(0,194,255,0.4)" : "none"
        }
      }, cellType === "cardio" ? /*#__PURE__*/React.createElement(HeartPulse, {
        size: 11,
        strokeWidth: 2.5,
        color: textColor
      }) : cellType === "done" ? "✓" : cellType === "session" ? shortLabel(session.day.name) : "·");
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap",
      marginTop: 12,
      paddingTop: 10,
      borderTop: "1px solid #1c1c1e",
      fontSize: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: "rgba(0,194,255,0.08)",
      border: "1.5px solid rgba(0,194,255,0.3)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8e8e93",
      fontWeight: 600
    }
  }, "Session")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: "rgba(16,185,129,0.12)",
      border: "1.5px solid #10b981"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8e8e93",
      fontWeight: 600
    }
  }, "Done")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: "rgba(244,63,94,0.08)",
      border: "1.5px solid rgba(244,63,94,0.35)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8e8e93",
      fontWeight: 600
    }
  }, "Cardio")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: "#00c2ff",
      border: "1.5px solid #00c2ff"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8e8e93",
      fontWeight: 600
    }
  }, "Today"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      paddingTop: 10,
      borderTop: "1px solid #1c1c1e",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6
    }
  }, plan.days.map((day, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontSize: 10,
      color: "#8e8e93"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 800,
      color: "#00c2ff",
      fontFamily: "DM Mono,monospace",
      background: "rgba(0,194,255,0.08)",
      padding: "2px 6px",
      borderRadius: 4,
      minWidth: 22,
      textAlign: "center"
    }
  }, shortLabel(day.name)), /*#__PURE__*/React.createElement("span", null, day.name)))));
}

// -- Progress Chart Modal ----------------------------------------------------------
function ProgressChartModal({
  exerciseId,
  history,
  onClose
}) {
  const [view, setView] = useState("weight"); // weight | volume | e1rm
  const [range, setRange] = useState("3m"); // 1m | 3m | 6m | 1y | all

  const ex = EXERCISE_DB.find(e => e.id === exerciseId);
  if (!ex) return null;

  // Build session data for this exercise
  const sessions = [];
  history.forEach(h => {
    const hEx = h.exercises?.find(e => (e.baseId || e.id) === exerciseId);
    if (!hEx?.sets?.length) return;
    const doneSets = hEx.sets.filter(s => parseFloat(s.weight) > 0);
    if (doneSets.length === 0) return;
    const bestSet = doneSets.reduce((best, s) => {
      const w = parseFloat(s.weight) || 0;
      return w > (parseFloat(best.weight) || 0) ? s : best;
    }, doneSets[0]);
    const bestE1RM = Math.max(...doneSets.map(s => e1RM(parseFloat(s.weight) || 0, parseInt(s.reps) || 0)));
    const volume = doneSets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
    const date = h.dateISO ? new Date(h.dateISO) : new Date(h.id);
    sessions.push({
      date,
      weight: parseFloat(bestSet.weight) || 0,
      reps: parseInt(bestSet.reps) || 0,
      volume,
      e1rm: Math.round(bestE1RM),
      sets: doneSets.length
    });
  });
  sessions.sort((a, b) => a.date - b.date);

  // Filter by range
  const now = Date.now();
  const ranges = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "all": Infinity
  };
  const rangeDays = ranges[range];
  const filtered = rangeDays === Infinity ? sessions : sessions.filter(s => (now - s.date.getTime()) / 86400000 <= rangeDays);
  const W = 640,
    H = 260,
    padL = 40,
    padR = 20,
    padT = 20,
    padB = 34;
  const chartW = W - padL - padR,
    chartH = H - padT - padB;
  const valKey = view === "weight" ? "weight" : view === "volume" ? "volume" : "e1rm";
  const values = filtered.map(s => s[valKey]);
  const maxV = values.length ? Math.max(...values) : 1;
  const minV = values.length ? Math.min(...values) : 0;
  const yRange = maxV - minV || 1;
  const yPad = yRange * 0.15;
  const yMin = Math.max(0, minV - yPad);
  const yMax = maxV + yPad;
  const yRangePadded = yMax - yMin || 1;
  const x = i => filtered.length <= 1 ? padL + chartW / 2 : padL + i / (filtered.length - 1) * chartW;
  const y = v => padT + chartH - (v - yMin) / yRangePadded * chartH;
  const path = filtered.map((s, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(s[valKey])}`).join(" ");
  const fillPath = filtered.length > 1 ? `${path} L${x(filtered.length - 1)},${padT + chartH} L${x(0)},${padT + chartH} Z` : "";
  const yTicks = 4;
  const tickValues = Array.from({
    length: yTicks + 1
  }, (_, i) => yMin + yRangePadded / yTicks * i);
  const firstV = filtered[0]?.[valKey] || 0;
  const lastV = filtered[filtered.length - 1]?.[valKey] || 0;
  const change = lastV - firstV;
  const changePct = firstV > 0 ? (change / firstV * 100).toFixed(1) : 0;
  const bestV = Math.max(...values, 0);
  const bestSession = filtered.find(s => s[valKey] === bestV);
  const unit = "lb";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 2000,
      display: "flex",
      alignItems: "stretch",
      justifyContent: "stretch"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#F0F0F0",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      padding: "14px 16px",
      borderBottom: "1px solid #e5e5ea",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      fontSize: 20,
      color: "#00c2ff",
      cursor: "pointer",
      padding: 0,
      fontWeight: 400,
      lineHeight: 1
    }
  }, "‹"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#000"
    }
  }, ex.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 1
    }
  }, ex.muscle, " · ", ex.muscleHead))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "14px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, sessions.length < 2 ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: "30px 20px",
      textAlign: "center",
      border: "1.5px solid #e5e5ea"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "#8e8e93"
    }
  }, "Not enough data yet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#c7c7cc",
      marginTop: 6
    }
  }, "Log this exercise at least twice to see progress.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      background: "#fff",
      borderRadius: 10,
      padding: 3,
      border: "1px solid #e5e5ea"
    }
  }, [["weight", "Weight"], ["volume", "Volume"], ["e1rm", "e1RM"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setView(k),
    style: {
      flex: 1,
      padding: "8px 12px",
      borderRadius: 7,
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      fontFamily: "Inter,sans-serif",
      background: view === k ? "#000" : "transparent",
      color: view === k ? "#00c2ff" : "#8e8e93",
      transition: "all 0.15s"
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      justifyContent: "space-between"
    }
  }, [["1m", "1M"], ["3m", "3M"], ["6m", "6M"], ["1y", "1Y"], ["all", "All"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setRange(k),
    style: {
      flex: 1,
      padding: "6px 4px",
      borderRadius: 7,
      border: range === k ? "1.5px solid #00c2ff" : "1.5px solid #e5e5ea",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "DM Mono,monospace",
      background: "#fff",
      color: range === k ? "#00c2ff" : "#8e8e93",
      boxShadow: range === k ? "0 0 8px rgba(0,194,255,0.15)" : "none",
      transition: "all 0.15s"
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: "14px 12px",
      border: "1.5px solid #e5e5ea",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, filtered.length < 2 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "30px 10px",
      textAlign: "center",
      fontSize: 12,
      color: "#8e8e93"
    }
  }, "Not enough data in this range.") : /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    viewBox: `0 0 ${W} ${H}`,
    style: {
      display: "block",
      overflow: "visible"
    }
  }, tickValues.map((tv, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("line", {
    x1: padL,
    y1: y(tv),
    x2: W - padR,
    y2: y(tv),
    stroke: "#f0f0f0",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    x: padL - 6,
    y: y(tv) + 3,
    fontSize: "9",
    fill: "#8e8e93",
    textAnchor: "end",
    fontFamily: "DM Mono,monospace"
  }, Math.round(tv)))), /*#__PURE__*/React.createElement("path", {
    d: fillPath,
    fill: "rgba(0,194,255,0.08)"
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: "#00c2ff",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), filtered.map((s, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: x(i),
    cy: y(s[valKey]),
    r: "3.5",
    fill: "#00c2ff",
    stroke: "#fff",
    strokeWidth: "1.5"
  })), filtered.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("text", {
    x: x(0),
    y: H - 10,
    fontSize: "9",
    fill: "#8e8e93",
    textAnchor: "start"
  }, filtered[0].date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })), filtered.length > 2 && /*#__PURE__*/React.createElement("text", {
    x: x(Math.floor(filtered.length / 2)),
    y: H - 10,
    fontSize: "9",
    fill: "#8e8e93",
    textAnchor: "middle"
  }, filtered[Math.floor(filtered.length / 2)].date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })), filtered.length > 1 && /*#__PURE__*/React.createElement("text", {
    x: x(filtered.length - 1),
    y: H - 10,
    fontSize: "9",
    fill: "#8e8e93",
    textAnchor: "end"
  }, filtered[filtered.length - 1].date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      padding: "14px 14px",
      border: "1.5px solid #e5e5ea",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, "Starting"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: "#000",
      fontFamily: "DM Mono,monospace",
      marginTop: 2
    }
  }, Math.round(firstV), unit)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, "Current"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: "#000",
      fontFamily: "DM Mono,monospace",
      marginTop: 2
    }
  }, Math.round(lastV), unit)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, "Change"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: change >= 0 ? "#34c759" : "#ff3b30",
      fontFamily: "DM Mono,monospace",
      marginTop: 2
    }
  }, change >= 0 ? "+" : "", Math.round(change), unit), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: change >= 0 ? "#34c759" : "#ff3b30",
      fontWeight: 600
    }
  }, change >= 0 ? "+" : "", changePct, "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, "Best"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: "#00c2ff",
      fontFamily: "DM Mono,monospace",
      marginTop: 2
    }
  }, Math.round(bestV), unit), bestSession && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#8e8e93"
    }
  }, bestSession.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #e5e5ea",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      borderBottom: "1px solid #f0f0f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "#000"
    }
  }, "Recent Sessions"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, filtered.length, " total")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      padding: "8px 14px",
      background: "#fafafa",
      fontSize: 9,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("div", null, "Date"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, "Best"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, "Volume"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, "e1RM")), filtered.slice().reverse().slice(0, 10).map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr 1fr",
      padding: "9px 14px",
      borderTop: "1px solid #f5f5f7",
      fontSize: 11,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#000",
      fontWeight: 600
    }
  }, s.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      fontFamily: "DM Mono,monospace",
      color: "#000",
      fontWeight: 700
    }
  }, s.weight, "×", s.reps), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      fontFamily: "DM Mono,monospace",
      color: "#8e8e93"
    }
  }, Math.round(s.volume).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      fontFamily: "DM Mono,monospace",
      color: "#00c2ff",
      fontWeight: 700
    }
  }, s.e1rm))))))));
}

// -- Volume Chart ----------------------------------------------------------
function VolumeChart({
  history
}) {
  const [view, setView] = useState("volume"); // volume | workouts
  const [range, setRange] = useState(8); // last N workouts

  if (history.length < 2) return null;
  const recent = [...history].slice(-range);

  // Build data points
  const points = recent.map((h, i) => ({
    label: h.date.split(",")[0],
    // "Mon" etc
    volume: Math.round(h.volume || 0),
    workouts: 1,
    idx: i
  }));
  const values = points.map(p => view === "volume" ? p.volume : p.workouts);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range2 = maxVal - minVal || 1;
  const W = 320,
    H = 120,
    PAD = {
      t: 10,
      r: 10,
      b: 30,
      l: 40
    };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const x = i => PAD.l + i / (points.length - 1) * chartW;
  const y = v => PAD.t + chartH - (v - minVal) / range2 * chartH;

  // Build SVG path
  const path = points.map((p, i) => {
    const px = x(i),
      py = y(values[i]);
    return i === 0 ? `M${px},${py}` : `L${px},${py}`;
  }).join(" ");

  // Fill path
  const fill = `${path} L${x(points.length - 1)},${PAD.t + chartH} L${x(0)},${PAD.t + chartH} Z`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 16,
      border: "1.5px solid #e5e5ea",
      padding: "14px 14px 10px",
      marginBottom: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#000"
    }
  }, "Training Volume"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 1
    }
  }, "Last ", points.length, " workouts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, [4, 8, 16].map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    onClick: () => setRange(r),
    style: {
      padding: "4px 10px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: range === r ? "#00c2ff" : "#e5e5ea",
      background: range === r ? "#000" : "#fff",
      color: range === r ? "#fff" : "#8e8e93",
      fontSize: 11,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif"
    }
  }, r)))), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    viewBox: `0 0 ${W} ${H}`,
    style: {
      overflow: "visible"
    }
  }, [0, 0.25, 0.5, 0.75, 1].map(t => {
    const yv = PAD.t + chartH * (1 - t);
    const val = Math.round(minVal + range2 * t);
    return /*#__PURE__*/React.createElement("g", {
      key: t
    }, /*#__PURE__*/React.createElement("line", {
      x1: PAD.l,
      y1: yv,
      x2: W - PAD.r,
      y2: yv,
      stroke: "#F0F0F0",
      strokeWidth: "1"
    }), /*#__PURE__*/React.createElement("text", {
      x: PAD.l - 4,
      y: yv + 4,
      textAnchor: "end",
      fontSize: "9",
      fill: "#c7c7cc"
    }, view === "volume" ? val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val : val));
  }), /*#__PURE__*/React.createElement("path", {
    d: fill,
    fill: "rgba(0,194,255,0.08)"
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: "#00c2ff",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), points.map((p, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("circle", {
    cx: x(i),
    cy: y(values[i]),
    r: "4",
    fill: "#00c2ff",
    stroke: "#fff",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("text", {
    x: x(i),
    y: PAD.t + chartH + 16,
    textAnchor: "middle",
    fontSize: "9",
    fill: "#8e8e93"
  }, p.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      marginTop: 8,
      paddingTop: 10,
      borderTop: "1px solid #F0F0F0"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: "#000",
      fontFamily: "DM Mono,monospace"
    }
  }, Math.round(values.reduce((a, b) => a + b, 0) / values.length).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#8e8e93"
    }
  }, "avg per session")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: "#00c2ff",
      fontFamily: "DM Mono,monospace"
    }
  }, Math.max(...values).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#8e8e93"
    }
  }, "best session")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: "#000",
      fontFamily: "DM Mono,monospace"
    }
  }, values.reduce((a, b) => a + b, 0).toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#8e8e93"
    }
  }, "total lb moved"))));
}

// -- Saved Workout Card ----------------------------------------------------
function SavedWorkoutCard({
  workout,
  onLoad,
  onDelete
}) {
  const [expanded, setExpanded] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #e5e5ea",
      marginBottom: 8,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      cursor: "pointer"
    },
    onClick: () => setExpanded(e => !e)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#000",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, workout.name), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 13,
    strokeWidth: 2.5,
    color: "#8e8e93",
    style: {
      flexShrink: 0,
      transform: expanded ? "rotate(180deg)" : "none",
      transition: "transform 0.2s"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 3,
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", null, workout.date), /*#__PURE__*/React.createElement("span", null, "."), /*#__PURE__*/React.createElement("span", null, workout.exerciseList.length, " exercises"), workout.source === "imported" && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#00c2ff",
      fontWeight: 700,
      fontSize: 10,
      background: "rgba(0,194,255,0.1)",
      borderRadius: 4,
      padding: "1px 5px"
    }
  }, "IMPORTED"))), /*#__PURE__*/React.createElement("button", {
    onClick: onLoad,
    style: {
      flexShrink: 0,
      background: "#000",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "8px 16px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      boxShadow: "0 0 0 1.5px #00c2ff, 0 0 8px rgba(0,194,255,0.25)"
    }
  }, "Load")), expanded && /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid #F0F0F0",
      padding: "8px 14px 12px"
    }
  }, workout.exerciseList.map((ex, i) => /*#__PURE__*/React.createElement("div", {
    key: ex.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 0",
      borderBottom: i < workout.exerciseList.length - 1 ? "1px solid #F0F0F0" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "#F0F0F0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#8e8e93"
    }
  }, i + 1)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#000",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, ex.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 1
    }
  }, ex.sets.length, " sets", ex.sets[0]?.reps ? ` . ${ex.sets.map(s => s.reps).filter(Boolean).join("-")} reps` : "")))), /*#__PURE__*/React.createElement("button", {
    onClick: onDelete,
    style: {
      marginTop: 10,
      background: "none",
      border: "1px solid #e5e5ea",
      borderRadius: 8,
      padding: "6px 12px",
      fontSize: 11,
      color: "#c7c7cc",
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      width: "100%"
    }
  }, "Remove this workout")));
}
function youtubeUrl(exerciseName) {
  const query = encodeURIComponent(`${exerciseName} exercise jeff nippard`);
  return `https://www.youtube.com/results?search_query=${query}`;
}
function App() {
  const [tab, setTab] = useState("freddy");
  const [plusSheetOpen, setPlusSheetOpen] = useState(false);
  const contentRef = useRef(null);
  // Scroll to top on tab change - scroll BOTH contentRef and window/document
  // because on mobile, the actual scroll container is often <html>/<body>, not .content
  useLayoutEffect(() => {
    const scrollAllToTop = () => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollAllToTop();
    requestAnimationFrame(scrollAllToTop);
    const t = setTimeout(scrollAllToTop, 60);
    return () => clearTimeout(t);
  }, [tab]);
  const [splash, setSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setSplashFading(true), 2400);
    const t2 = setTimeout(() => setSplash(false), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const [workoutType, setWorkoutType] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem("locked_workout_draft") || "null");
      return d?.workoutType || null;
    } catch (e) {
      return null;
    }
  });
  const [workoutName, setWorkoutName] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem("locked_workout_draft") || "null");
      return d?.workoutName || "";
    } catch (e) {
      return "";
    }
  });
  const [exercises, setExercises] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem("locked_workout_draft") || "null");
      return d?.exercises || [];
    } catch (e) {
      return [];
    }
  });
  const [sessionNote, setSessionNote] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem("locked_workout_draft") || "null");
      return d?.sessionNote || "";
    } catch (e) {
      return "";
    }
  });
  const [sessionNoteOpen, setSessionNoteOpen] = useState(false);
  // Auto-save draft to localStorage whenever workout name/exercises change
  useEffect(() => {
    if (workoutType && workoutName) {
      try {
        localStorage.setItem("locked_workout_draft", JSON.stringify({
          workoutType,
          workoutName,
          exercises,
          sessionNote,
          savedAt: Date.now()
        }));
      } catch (e) {}
    }
  }, [workoutType, workoutName, exercises, sessionNote]);

  // Track exercise count to detect "fresh load" vs "in-session changes"
  const prevExercisesLen = useRef(0);
  useLayoutEffect(() => {
    // Only fire when: on session tab AND exercises went from empty to non-empty (fresh load)
    if (tab === "myworkout" && prevExercisesLen.current === 0 && exercises.length > 0) {
      const scrollAllToTop = () => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };
      scrollAllToTop();
      requestAnimationFrame(scrollAllToTop);
      // Multiple checkpoints to catch late layout shifts (card animations, image loads)
      const timers = [50, 150, 300, 500, 800].map(ms => setTimeout(scrollAllToTop, ms));
      prevExercisesLen.current = exercises.length;
      return () => timers.forEach(clearTimeout);
    }
    prevExercisesLen.current = exercises.length;
  }, [tab, exercises.length]);
  const [history, setHistory] = useLocalStorage("locked_history", []);
  const [activePlan, setActivePlan] = useLocalStorage("locked_active_plan", null);
  // activePlan structure: { planId, startedAt, currentWeek: 1-N, currentDayIndex: 0-3, completedSessions: [] }
  const [scheduleDays, setScheduleDays] = useLocalStorage("locked_schedule", [2, 3, 4, 6, 0]);
  const [cardioDays, setCardioDays] = useLocalStorage("locked_cardio_days", [1, 5]);
  const [cardioLog, setCardioLog] = useLocalStorage("locked_cardio_log", {});
  const [recoveryLog, setRecoveryLog] = useLocalStorage("locked_recovery", {});
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth()
    };
  });
  const [calSelected, setCalSelected] = useState(null);
  const [savedWorkouts, setSavedWorkouts] = useLocalStorage("locked_saved_workouts", []);
  const [showPicker, setShowPicker] = useState(false);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [preferences, setPreferences] = useLocalStorage("locked_preferences", {});
  const togglePref = (from, to) => setPreferences(p => p[from] === to ? (() => {
    const n = {
      ...p
    };
    delete n[from];
    return n;
  })() : {
    ...p,
    [from]: to
  });
  const [pickerView, setPickerView] = useState("muscle");
  const [filterEquip, setFilterEquip] = useState(null);
  const [pickerStep, setPickerStep] = useState(1);
  const [pickerMuscle, setPickerMuscle] = useState(null);
  const [pickerEquip, setPickerEquip] = useState(null);
  const [pickerExercise, setPickerExercise] = useState(null);
  // Picker state
  const [search, setSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState(null);
  const [filterGroup, setFilterGroup] = useState(null);
  const [pendingIds, setPendingIds] = useState([]);
  // Custom exercise
  const [customName, setCustomName] = useState("");
  const [customEquip, setCustomEquip] = useState("Accessories");
  const [customMuscle, setCustomMuscle] = useState("Chest");
  const [customMuscleId, setCustomMuscleId] = useState("chest");
  const [customExercises, setCustomExercises] = useLocalStorage("locked_custom_exercises", []);
  const [exerciseNotes, setExerciseNotes] = useLocalStorage("locked_exercise_notes", {});
  const [removeConfirm, setRemoveConfirm] = useState(null); // exerciseId being confirmed for removal
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryExpanded, setLibraryExpanded] = useState(null); // exercise ID currently expanded
  const [libraryFilterSection, setLibraryFilterSection] = useState(null);
  const [libraryFilterMuscle, setLibraryFilterMuscle] = useState(null);
  const [historyMonthOpen, setHistoryMonthOpen] = useState({});
  const [highlightHistoryId, setHighlightHistoryId] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [progressChartExId, setProgressChartExId] = useState(null);
  const [supersetPickerExId, setSupersetPickerExId] = useState(null);
  const [plansBrowseOpen, setPlansBrowseOpen] = useState(false);
  const [planDetailId, setPlanDetailId] = useState(null);
  const [planCancelConfirm, setPlanCancelConfirm] = useState(false); // "link this exercise with..."
  // Plate calculator
  const [plateOpen, setPlateOpen] = useState(false);
  const [bwSheetTarget, setBwSheetTarget] = useState(null); // {exId, setIdx}
  const [bwAdded, setBwAdded] = useState(0);
  const [plateTarget, setPlateTarget] = useState(null);
  const [plateCounts, setPlateCounts] = useState({});
  const [selectedBar, setSelectedBar] = useState("Olympic Bar");
  const [loadMode, setLoadMode] = useState("both");
  const [selectedPlate, setSelectedPlate] = useState(45);
  const [plateBand, setPlateBand] = useState(null);
  const [bodyWeight, setBodyWeight] = useLocalStorage("locked_bodyweight", 185);
  const [smithBarWeight, setSmithBarWeight] = useLocalStorage("locked_smith_bar", 15);
  const BARS = [{
    name: "Olympic",
    weight: 45
  }, {
    name: "Trap",
    weight: 55
  }, {
    name: "Swiss",
    weight: 35
  }, {
    name: "SSB",
    weight: 60
  }, {
    name: "Cambered",
    weight: 45
  }, {
    name: "Smith",
    weight: smithBarWeight
  }, {
    name: "MX100",
    weight: 0
  }, {
    name: "No Bar",
    weight: 0
  }];
  const PLATE_SIZES = [{
    weight: 45,
    color: "#1a4fa8",
    textColor: "#fff",
    label: "45"
  }, {
    weight: 35,
    color: "#c8a800",
    textColor: "#fff",
    label: "35"
  }, {
    weight: 25,
    color: "#1a7a2a",
    textColor: "#fff",
    label: "25"
  }, {
    weight: 15,
    color: "#7a1a1a",
    textColor: "#fff",
    label: "15"
  }, {
    weight: 10,
    color: "#d4d4d4",
    textColor: "#111",
    label: "10"
  }, {
    weight: 5,
    color: "#c0392b",
    textColor: "#fff",
    label: "5"
  }, {
    weight: 2.5,
    color: "#2980b9",
    textColor: "#fff",
    label: "2.5"
  }, {
    weight: 1.25,
    color: "#888",
    textColor: "#fff",
    label: "1.25"
  }];
  const barWeight = BARS.find(b => b.name === selectedBar)?.weight || 0;
  const plateTotal = Object.entries(plateCounts).reduce((sum, [w, count]) => {
    return sum + parseFloat(w) * count;
  }, 0);
  const totalWeight = barWeight + plateTotal;
  const adjustPlate = (weight, delta) => {
    const increment = delta > 0 ? loadMode === "both" ? 2 : 1 : loadMode === "both" ? -2 : -1;
    setPlateCounts(prev => {
      const cur = prev[weight] || 0;
      const next = Math.max(0, cur + increment);
      if (next === 0) {
        const n = {
          ...prev
        };
        delete n[weight];
        return n;
      }
      return {
        ...prev,
        [weight]: next
      };
    });
  };
  const switchCalculator = type => {
    const target = plateTarget || stackTarget || dbTarget;
    if (!target) return;
    const {
      exId,
      setIdx
    } = target;
    const ex = exercises.find(e => e.id === exId);
    const currentWeight = ex?.sets[setIdx]?.weight || "";
    // Save preference for this exercise
    setCalcPrefs(p => ({
      ...p,
      [exId]: type
    }));
    // Close all
    setPlateOpen(false);
    setStackOpen(false);
    setDbOpen(false);
    setMx100Open(false);
    setCalcSwitchOpen(false);
    setTimeout(() => {
      if (type === "plate") openPlateCalc(exId, setIdx, currentWeight);
      if (type === "stack") openStackCalc(exId, setIdx, currentWeight, ex?.equipment);
      if (type === "dumbbell") openDumbbellPicker(exId, setIdx, currentWeight);
      if (type === "mx100") openMX100Picker(exId, setIdx, currentWeight);
      if (type === "kettlebell") openPlateCalc(exId, setIdx, currentWeight);
    }, 100);
  };
  const openPlateCalc = (exId, setIdx, currentWeight) => {
    const ex = exercises.find(e => e.id === exId);
    // Cable/machine exercises don't use a bar — default to No Bar
    const noBAREquipment = ["Cable Machine", "Pec Deck", "Leg Press", "Leg Extension", "Leg Curl", "Inner/Outer Thigh", "Reverse Hyper", "Pec Deck"];
    if (ex && noBAREquipment.includes(ex.equipment) && !ex.sets[setIdx]?.barName) {
      setSelectedBar("No Bar");
    }

    // Scan back for the nearest set that has saved plate data
    let savedCounts = null;
    let savedBar = null;
    for (let i = setIdx; i >= 0; i--) {
      if (ex?.sets[i]?.plateCounts) {
        savedCounts = ex.sets[i].plateCounts;
        savedBar = ex.sets[i].barName || selectedBar;
        break;
      }
    }
    if (savedCounts) {
      setPlateCounts({
        ...savedCounts
      });
      if (savedBar) setSelectedBar(savedBar);
    } else {
      setPlateCounts({});
    }

    // Last set weight for display
    let prevSetWeight = null;
    if (ex) {
      for (let i = setIdx - 1; i >= 0; i--) {
        if (ex.sets[i]?.weight) {
          prevSetWeight = ex.sets[i].weight;
          break;
        }
      }
    }
    setSelectedPlate(45);
    setPlateTarget({
      exId,
      setIdx,
      prevSetWeight
    });
    setPlateOpen(true);
  };
  const applyPlateWeight = () => {
    if (!plateTarget) return;
    const {
      exId,
      setIdx
    } = plateTarget;
    setExercises(p => p.map(ex => ex.id !== exId ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => i !== setIdx ? s : {
        ...s,
        weight: String(totalWeight),
        plateCounts: {
          ...plateCounts
        },
        barName: selectedBar,
        plateBand: plateBand || undefined
      })
    }));
    setPlateBand(null);
    setPlateOpen(false);
  };
  const plateBreakdown = () => {
    const parts = [];
    if (barWeight > 0) parts.push(`Bar: ${barWeight}lb`);
    PLATE_SIZES.forEach(p => {
      const count = plateCounts[p.weight];
      if (count) {
        const sides = loadMode === "both" ? "each side" : "one side";
        const added = count * p.weight * (loadMode === "both" ? 2 : 1);
        parts.push(`${count}x${p.weight}lb ${sides} (+${added}lb)`);
      }
    });
    return parts.join("\n") || "Bar only";
  };

  // -- Stack Calculator ------------------------------------------------------
  const openStackCalc = (exId, setIdx, currentWeight, equipment) => {
    const machineId = EQUIPMENT_TO_MACHINE[equipment];
    const ex = exercises.find(e => e.id === exId);
    let prevSetWeight = null;
    if (ex) {
      for (let i = setIdx - 1; i >= 0; i--) {
        if (ex.sets[i]?.weight) {
          prevSetWeight = ex.sets[i].weight;
          break;
        }
      }
    }
    const saved = ex?.sets[setIdx]?.stackConfig;
    const fallbackBase = parseFloat(currentWeight) || 0;
    const resolvedMachineId = saved?.machine === "cable" ? "cable-10" : saved?.machine || machineId || "cable-10";
    setStackMachine(resolvedMachineId);
    setStackBase(saved?.base != null ? saved.base : fallbackBase);
    setStackTop5(saved?.top5 || false);
    setSnodeMag(saved?.snodeMag || 0);
    setGymPinPlate(saved?.gymPin || null);
    setBandLevel(saved?.band || null);
    setStackTarget({
      exId,
      setIdx,
      prevSetWeight
    });
    setStackOpen(true);
  };
  const openDumbbellPicker = (exId, setIdx, currentWeight) => {
    const ex = exercises.find(e => e.id === exId);
    let prevSetWeight = null;
    if (ex) {
      for (let i = setIdx - 1; i >= 0; i--) {
        if (ex.sets[i]?.weight) {
          prevSetWeight = ex.sets[i].weight;
          break;
        }
      }
    }
    setDbTarget({
      exId,
      setIdx,
      prevSetWeight,
      currentWeight
    });
    setDbOpen(true);
  };
  const applyDumbbellWeight = w => {
    if (!dbTarget) return;
    const {
      exId,
      setIdx
    } = dbTarget;
    setExercises(p => p.map(ex => ex.id !== exId ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => i !== setIdx ? s : {
        ...s,
        weight: String(w)
      })
    }));
    setDbOpen(false);
    showToast(`${w}lb set`);
  };
  const applyStackWeight = () => {
    if (!stackTarget) return;
    const {
      exId,
      setIdx
    } = stackTarget;
    setExercises(p => p.map(ex => ex.id !== exId ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => i !== setIdx ? s : {
        ...s,
        weight: String(stackSelectedWeight),
        stackConfig: {
          machine: stackMachine,
          base: stackBase,
          top5: stackTop5,
          snodeMag,
          gymPin: gymPinPlate,
          band: bandLevel
        }
      })
    }));
    setStackOpen(false);
  };

  // Workout duration timer
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const durationRef = useRef(null);
  useEffect(() => {
    if (workoutStartTime) {
      durationRef.current = setInterval(() => {
        setWorkoutElapsed(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    } else {
      clearInterval(durationRef.current);
      setWorkoutElapsed(0);
    }
    return () => clearInterval(durationRef.current);
  }, [workoutStartTime]);
  function fmtDuration(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor(secs % 3600 / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  const [restSeconds, setRestSeconds] = useState(0);
  const [restDuration, setRestDuration] = useState(90);
  const [restActive, setRestActive] = useState(false);
  const timerRef = useRef(null);
  const playRestDone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 150, 300].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = i === 2 ? 880 : 660;
        gain.gain.setValueAtTime(1.0, ctx.currentTime + delay / 1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.5);
        osc.start(ctx.currentTime + delay / 1000);
        osc.stop(ctx.currentTime + delay / 1000 + 0.3);
      });
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
  };
  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => {
    if (restActive) {
      timerRef.current = setInterval(() => {
        setRestSeconds(s => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            setRestActive(false);
            playRestDone();
            showToast(" Rest complete -- go!");
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [restActive]);
  const startRest = () => {
    setRestSeconds(restDuration);
    setRestActive(true);
  };
  const skipRest = () => {
    clearInterval(timerRef.current);
    setRestActive(false);
    setRestSeconds(0);
  };
  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Get the current attachment for a cable exercise (pref > default > null)
  const getAttachment = exId => {
    const baseId = exId?.split("-v")[0]; // strip variation suffix
    const attachId = attachmentPrefs[baseId] || CABLE_ATTACHMENT_DEFAULTS[baseId];
    return CABLE_ATTACHMENTS.find(a => a.id === attachId) || null;
  };
  const setAttachmentPref = (exId, attachId) => {
    const baseId = exId?.split("-v")[0];
    setAttachmentPrefs(p => ({
      ...p,
      [baseId]: attachId
    }));
  };

  // State for attachment picker sheet
  const [attachmentSheetExId, setAttachmentSheetExId] = useState(null);
  const [lastTouchedId, setLastTouchedId] = useState(null);
  const [lastTouchedTime, setLastTouchedTime] = useState(0);
  const [linkingExId, setLinkingExId] = useState(null); // exercise being re-linked via import
  const touchExercise = exId => {
    setLastTouchedId(exId);
    setLastTouchedTime(Date.now());
  };
  useEffect(() => {
    if (!lastTouchedId) return;
    const timer = setTimeout(() => {
      setLastTouchedId(null);
    }, 60000);
    return () => clearTimeout(timer);
  }, [lastTouchedId, lastTouchedTime]);
  function lastSets(exId) {
    for (let i = history.length - 1; i >= 0; i--) {
      const f = history[i].exercises.find(e => e.id === exId);
      if (f) return f.sets;
    }
    return null;
  }
  function lastSessionData(exId) {
    // Returns full last session info for an exercise
    for (let i = history.length - 1; i >= 0; i--) {
      const f = history[i].exercises.find(e => e.id === exId);
      if (f) return {
        sets: f.sets,
        date: history[i].date,
        type: history[i].type
      };
    }
    return null;
  }
  function personalRecord(exId) {
    // Find all-time best weight x reps for exercise
    let bestWeight = 0,
      bestReps = 0,
      bestDate = null;
    history.forEach(h => {
      const ex = h.exercises.find(e => e.id === exId);
      if (!ex) return;
      ex.sets.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        if (w > bestWeight) {
          bestWeight = w;
          bestReps = parseInt(s.reps) || 0;
          bestDate = h.date;
        }
      });
    });
    return bestWeight > 0 ? {
      weight: bestWeight,
      reps: bestReps,
      date: bestDate
    } : null;
  }
  function lastWeightLabel(exId) {
    const data = lastSessionData(exId);
    if (!data?.sets) return null;
    const best = data.sets.reduce((b, s) => parseFloat(s.weight) > parseFloat(b.weight) ? s : b, data.sets[0]);
    return best?.weight ? `${best.weight}lb x ${best.reps}` : null;
  }
  function progressionSuggestion(exId) {
    const data = lastSessionData(exId);
    if (!data?.sets || data.sets.length === 0) return null;
    const best = data.sets.reduce((b, s) => parseFloat(s.weight) > parseFloat(b.weight) ? s : b, data.sets[0]);
    const w = parseFloat(best.weight);
    const r = parseInt(best.reps);
    if (!w || !r) return null;
    const ex = EXERCISES.find(e => e.id === exId);
    const isLower = ex && (ex.group === "Lower" || ex.muscleId === "quads" || ex.muscleId === "hamstrings" || ex.muscleId === "glutes");
    const increment = isLower ? 10 : 5;
    if (r >= 12) return {
      text: `Hit 12+ last time -- try ${w + increment}lb`,
      suggestedWeight: w + increment
    };
    if (r >= 8) return {
      text: `Good last session -- try ${w + increment / 2}lb`,
      suggestedWeight: w + increment / 2
    };
    return {
      text: `Match last: ${w}lb x ${r}`,
      suggestedWeight: w
    };
  }

  // Check if current set is a new PR
  function isNewPR(exId, weight) {
    const pr = personalRecord(exId);
    if (!pr) return weight > 0;
    return parseFloat(weight) > pr.weight;
  }
  function applyProgression(exId, suggestedWeight) {
    setExercises(p => p.map(ex => ex.id !== exId ? ex : {
      ...ex,
      sets: ex.sets.map(s => ({
        ...s,
        weight: String(suggestedWeight)
      }))
    }));
  }
  const loadPreset = preset => {
    // Build new exercises FIRST before any state changes
    const exIds = preset.exercises.map(id => preferences[id] || id);
    const newExs = exIds.map(id => {
      const ex = EXERCISE_DB.find(e => e.id === id) || (customExercises || []).find(e => e.id === id);
      if (!ex) return null;
      const prev = lastSets(id);
      const initSets = prev ? prev.map(s => ({
        ...s,
        done: false
      })) : [{
        weight: "",
        reps: "",
        done: false
      }];
      return {
        ...ex,
        sets: initSets
      };
    }).filter(Boolean);
    if (newExs.length === 0) {
      showToast(`No exercises found for ${preset.name}`);
      return;
    }
    setWorkoutType(preset.id);
    setWorkoutName(preset.name);
    setExercises(newExs);
    // Cards start collapsed for easier navigation
    setExpanded({});
    setWorkoutStartTime(Date.now());
    setTab("session");
    // Force scroll to top after render
    setTimeout(() => {
      if (contentRef.current) contentRef.current.scrollTo({
        top: 0,
        behavior: "instant"
      });
    }, 50);
    showToast(`${preset.name} loaded -- ${newExs.length} exercises`);
  };

  // -- PLAN FUNCTIONS ---------------------------------------------------
  const startPlan = planId => {
    const plan = PLAN_TEMPLATES.find(p => p.id === planId);
    if (!plan) return;
    setActivePlan({
      planId,
      startedAt: new Date().toISOString(),
      currentWeek: 1,
      currentDayIndex: 0,
      completedSessions: []
    });
    setPlansBrowseOpen(false);
    setPlanDetailId(null);
    showToast(`${plan.name} started! Week 1, Day 1.`);
  };
  const cancelPlan = () => {
    setActivePlan(null);
    setPlanCancelConfirm(false);
    showToast("Plan cancelled");
  };
  const loadPlanSession = () => {
    if (!activePlan) return;
    const plan = PLAN_TEMPLATES.find(p => p.id === activePlan.planId);
    if (!plan) return;
    const day = plan.days[activePlan.currentDayIndex];
    if (!day) return;

    // Build exercises from prescribed template
    const newExs = day.exercises.map(prescription => {
      const ex = EXERCISE_DB.find(e => e.id === prescription.id);
      if (!ex) return null;
      const prev = lastSets(prescription.id);
      // Build N sets prescribed by the plan
      const initSets = Array.from({
        length: prescription.sets
      }, (_, i) => {
        const prevSet = prev?.[i];
        return {
          weight: prevSet?.weight || "",
          reps: "",
          done: false,
          targetRepsLow: prescription.repsLow,
          targetRepsHigh: prescription.repsHigh
        };
      });
      return {
        ...ex,
        sets: initSets,
        planTargetReps: `${prescription.repsLow}-${prescription.repsHigh}`,
        isMainLift: !!prescription.isMainLift
      };
    }).filter(Boolean);
    if (newExs.length === 0) {
      showToast(`No exercises found for ${day.name}`);
      return;
    }
    setWorkoutType(`plan:${plan.id}:${day.id}`);
    setWorkoutName(`${plan.name} · W${activePlan.currentWeek} · ${day.name}`);
    setExercises(newExs);
    setExpanded({});
    setWorkoutStartTime(Date.now());
    setTab("session");
    setTimeout(() => {
      if (contentRef.current) contentRef.current.scrollTop = 0;
      window.scrollTo(0, 0);
    }, 50);
    showToast(`${day.name} loaded -- ${newExs.length} exercises`);
  };
  const advancePlan = () => {
    if (!activePlan) return;
    const plan = PLAN_TEMPLATES.find(p => p.id === activePlan.planId);
    if (!plan) return;
    let newDayIndex = activePlan.currentDayIndex + 1;
    let newWeek = activePlan.currentWeek;
    if (newDayIndex >= plan.days.length) {
      newDayIndex = 0;
      newWeek += 1;
    }
    if (newWeek > plan.duration) {
      // Plan complete!
      showToast(`${plan.name} complete! ${plan.duration} weeks done.`);
      setActivePlan(null);
      return;
    }
    setActivePlan({
      ...activePlan,
      currentWeek: newWeek,
      currentDayIndex: newDayIndex
    });
  };
  const loadSaved = saved => {
    const newExs = saved.exerciseList.map(ex => {
      const prev = lastSets(ex.id);
      const initSets = prev ? prev.map(s => ({
        ...s,
        done: false
      })) : ex.sets.map(s => ({
        ...s,
        done: false,
        weight: ""
      }));
      return {
        ...ex,
        sets: initSets
      };
    });
    setExercises(newExs);
    newExs.forEach(ex => setExpanded(p => ({
      ...p,
      [ex.id]: false
    })));
    setWorkoutType("saved");
    setWorkoutName(saved.name);
    setWorkoutStartTime(Date.now());
    setRecoveryRating(null);
    setRecoveryOpen(true);
    setTab("session");
    showToast(`"${saved.name}" loaded`);
  };
  const deleteSaved = id => {
    setSavedWorkouts(prev => prev.filter(w => w.id !== id));
    showToast("Workout removed");
  };
  const handleWorkoutPhoto = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const cfg = window.__LOCKED_SYNC__;
      if (!cfg?.functionUrl || !cfg?.pin) throw new Error("Sync not configured");
      const resp = await fetch(cfg.functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pin: cfg.pin,
          action: "analyze-photo",
          imageBase64: base64,
          mediaType: file.type || "image/jpeg"
        })
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || "Analysis failed");
      const text = data.data || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch (pe) {
        console.error("Parse error:", pe, clean);
        parsed = {};
      }
      // Edge Function returns array format from analyze-photo prompt
      const items = Array.isArray(parsed) ? parsed : parsed.exercises || [];
      const title = Array.isArray(parsed) ? "Imported Workout" : parsed.title || "Imported Workout";
      const newExs = items.map((item, idx) => {
        if (!item || !item.name) return null;
        const nameLower = item.name.toLowerCase().trim();
        const nameWords = nameLower.split(/[\s\-\/]+/).filter(w => w.length > 2);

        // Strategy 1: exact name match
        let match = EXERCISE_DB.find(ex => (ex.name || "").toLowerCase() === nameLower);

        // Strategy 2: name contains imported name or vice versa (must be substantial overlap)
        if (!match) match = EXERCISE_DB.find(ex => {
          const exLower = (ex.name || "").toLowerCase();
          return exLower.length > 5 && nameLower.includes(exLower) || nameLower.length > 5 && exLower.includes(nameLower);
        });

        // Strategy 3: first two words match exactly in DB exercise name
        if (!match) {
          const first2 = nameWords.slice(0, 2).join(" ");
          if (first2.length > 5) match = EXERCISE_DB.find(ex => (ex.name || "").toLowerCase().startsWith(first2));
        }

        // Strategy 4: word overlap scoring — need 3+ shared words for confidence
        if (!match && nameWords.length >= 3) {
          let bestScore = 0,
            bestMatch = null;
          EXERCISE_DB.forEach(ex => {
            const exWords = (ex.name || "").toLowerCase().split(/[\s\-\/]+/).filter(w => w.length > 2);
            const overlap = nameWords.filter(w => exWords.some(ew => ew === w)).length;
            if (overlap > bestScore && overlap >= 3) {
              bestScore = overlap;
              bestMatch = ex;
            }
          });
          if (bestMatch) match = bestMatch;
        }

        // Strategy 5: key exercise words
        if (!match) {
          const keywords = ["bench press", "squat", "deadlift", "romanian deadlift", "overhead press", "lat pulldown", "leg press", "leg curl", "leg extension", "bicep curl", "hammer curl", "tricep pushdown", "lateral raise", "cable fly", "pec deck", "face pull", "shrug", "pull-up", "chin-up", "dip", "cable row", "cable crunch"];
          for (const kw of keywords) {
            if (nameLower.includes(kw)) {
              match = EXERCISE_DB.find(ex => (ex.name || "").toLowerCase().includes(kw));
              if (match) break;
            }
          }
        }

        // Handle both formats: sets as array [{weight,reps}] or sets as number + reps as string
        let sets;
        if (Array.isArray(item.sets)) {
          sets = item.sets.map(s => ({
            weight: String(s.weight || ""),
            reps: String(s.reps || ""),
            done: false
          }));
        } else {
          const repParts = item.reps ? String(item.reps).split("-") : [];
          sets = Array.from({
            length: item.sets || 3
          }, (_, i) => ({
            weight: "",
            reps: repParts[i] || repParts[0] || "",
            done: false
          }));
        }
        if (match) return {
          ...match,
          sets,
          importedName: item.name
        };
        return {
          id: `import-${idx}-${Date.now()}`,
          name: item.name,
          equipment: "Accessories",
          muscle: "Various",
          muscleHead: "",
          muscleId: "fullbody",
          section: "Full Body",
          calculator: "plate",
          unlinked: true,
          sets
        };
      }).filter(Boolean);
      if (newExs.length === 0) {
        showToast("No exercises found -- try a clearer photo");
        return;
      }

      // Save to library
      const savedEntry = {
        id: Date.now(),
        name: title,
        date: today(),
        source: "imported",
        exerciseList: newExs
      };
      setSavedWorkouts(prev => [savedEntry, ...prev]);

      // Load into active workout
      setExercises(newExs);
      newExs.forEach(ex => setExpanded(p => ({
        ...p,
        [ex.id]: false
      })));
      setWorkoutType("imported");
      setWorkoutName(title);
      setTab("session");
      showToast(`check "${title}" imported`);
    } catch (err) {
      showToast("Import failed -- try again");
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };
  const swapExercise = (exId, targetId) => {
    const altId = targetId || ALTERNATIVES[exId];
    if (!altId) return;
    const altEx = EXERCISES.find(e => e.id === altId);
    if (!altEx) return;
    const prev = lastSets(altId);
    const initSets = prev ? prev.map(s => ({
      ...s,
      done: false
    })) : [{
      weight: "",
      reps: "",
      done: false
    }];
    setExercises(p => p.map(ex => ex.id === exId ? {
      ...altEx,
      sets: initSets
    } : ex));
    setExpanded(p => {
      const n = {
        ...p
      };
      const wasOpen = !!n[exId];
      delete n[exId];
      n[altId] = wasOpen;
      return n;
    });
    showToast(`-> ${altEx.name}`);
  };

  // Equipment weight type config
  const WEIGHT_TYPES = ["Plate Loaded", "Stack Loaded", "Dumbbell", "Kettlebell", "Bodyweight", "Cable", "Bands", "Selectorized"];
  const [equipConfig, setEquipConfig] = useLocalStorage("locked_equip_config", {
    "Power Rack": "Plate Loaded",
    "MX100 Barbell": "Selectorized",
    "Fixed Dumbbells": "Dumbbell",
    "Adjustable Dumbbells (REP x Pepin)": "Dumbbell",
    "Adjustable Dumbbells (Snode)": "Dumbbell",
    "Kettlebells": "Kettlebell",
    "Cable Machine": "Cable",
    "Preacher Pad": "Plate Loaded",
    "Pec Deck": "Stack Loaded",
    "Thigh Machine": "Plate Loaded",
    "Leg Ext/Curl": "Plate Loaded",
    "Leg Press": "Plate Loaded",
    "Reverse Hyper": "Plate Loaded",
    "Resistance Bands": "Bands",
    "Accessories": "Bodyweight"
  });
  const [calcPrefs, setCalcPrefs] = useLocalStorage("locked_calc_prefs", {});
  const [attachmentPrefs, setAttachmentPrefs] = useLocalStorage("locked_attachment_prefs", {});
  // Warm up state
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [warmupSets, setWarmupSets] = useState([]);
  const [warmupDone, setWarmupDone] = useState(false);
  // Custom workout builder
  const [buildOpen, setBuildOpen] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [workoutsExpanded, setWorkoutsExpanded] = useState(true);
  const [equipEditTarget, setEquipEditTarget] = useState(null);
  const [mx100Open, setMx100Open] = useState(false);
  const [mx100Target, setMx100Target] = useState(null);
  const MX100_WEIGHTS = [28, 36, 44, 52, 60, 68, 76, 84, 92, 100]; // Dial 1-10

  const openMX100Picker = (exId, setIdx, currentWeight) => {
    const ex = exercises.find(e => e.id === exId);
    let prevSetWeight = null;
    if (ex) for (let i = setIdx - 1; i >= 0; i--) {
      if (ex.sets[i]?.weight) {
        prevSetWeight = ex.sets[i].weight;
        break;
      }
    }
    setMx100Target({
      exId,
      setIdx,
      prevSetWeight
    });
    setMx100Open(true);
  };
  const [calcSwitchOpen, setCalcSwitchOpen] = useState(false);
  const [swapSheet, setSwapSheet] = useState(null);
  const [swapExpandedId, setSwapExpandedId] = useState(null);
  const [equipSheet, setEquipSheet] = useState(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryRating, setRecoveryRating] = useState(null);
  const [importing, setImporting] = useState(false);
  const importRef = useRef();
  // Dumbbell picker
  const [dbOpen, setDbOpen] = useState(false);
  const [dbTarget, setDbTarget] = useState(null); // {exId, setIdx, prevSetWeight}
  const [dbBrand, setDbBrand] = useState("pepin");
  const [dbSide, setDbSide] = useState("both");

  // Stack calculator
  const [stackOpen, setStackOpen] = useState(false);
  const [stackTarget, setStackTarget] = useState(null);
  const [stackMachine, setStackMachine] = useState("pec-deck");
  const [stackBase, setStackBase] = useState(0);
  const [stackTop5, setStackTop5] = useState(false);
  const [snodeMag, setSnodeMag] = useState(0);
  const [gymPinPlate, setGymPinPlate] = useState(null);
  const [bandLevel, setBandLevel] = useState(null);

  // Generate warm up based on current workout
  const generateWarmup = () => {
    const sets = [];
    // General warm up
    sets.push({
      id: "wu-0",
      name: "Light Cardio / Mobility",
      weight: "",
      reps: "3 min",
      done: false,
      isGeneral: true
    });
    // Muscle activation based on primary muscles
    const muscles = [...new Set(exercises.map(e => e.muscleId))];
    if (muscles.includes("chest") || muscles.includes("shoulders") || muscles.includes("triceps")) {
      sets.push({
        id: "wu-1",
        name: "Band Pull-Apart",
        weight: "Light band",
        reps: "15",
        done: false,
        isGeneral: true
      });
      sets.push({
        id: "wu-2",
        name: "Arm Circles",
        weight: "",
        reps: "10 each",
        done: false,
        isGeneral: true
      });
    }
    if (muscles.includes("back") || muscles.includes("biceps")) {
      sets.push({
        id: "wu-3",
        name: "Band Face Pull",
        weight: "Light band",
        reps: "15",
        done: false,
        isGeneral: true
      });
    }
    if (muscles.includes("quads") || muscles.includes("hamstrings") || muscles.includes("glutes")) {
      sets.push({
        id: "wu-4",
        name: "Hip Circle",
        weight: "",
        reps: "10 each",
        done: false,
        isGeneral: true
      });
      sets.push({
        id: "wu-5",
        name: "Bodyweight Squat",
        weight: "",
        reps: "12",
        done: false,
        isGeneral: true
      });
    }
    if (muscles.includes("core")) {
      sets.push({
        id: "wu-6",
        name: "Dead Bug",
        weight: "",
        reps: "10",
        done: false,
        isGeneral: true
      });
    }
    // Feeder sets for first barbell/heavy exercise
    const firstHeavy = exercises.find(e => ["Power Rack", "Dumbbells"].includes(e.equipment));
    if (firstHeavy) {
      const lastW = parseFloat(lastWeightLabel(firstHeavy.id)) || 0;
      if (lastW > 0) {
        sets.push({
          id: "wu-7",
          name: `${firstHeavy.name} -- Feeder 1`,
          weight: String(Math.round(lastW * 0.4 / 5) * 5),
          reps: "8",
          done: false,
          isFeeder: true
        });
        sets.push({
          id: "wu-8",
          name: `${firstHeavy.name} -- Feeder 2`,
          weight: String(Math.round(lastW * 0.6 / 5) * 5),
          reps: "5",
          done: false,
          isFeeder: true
        });
        sets.push({
          id: "wu-9",
          name: `${firstHeavy.name} -- Feeder 3`,
          weight: String(Math.round(lastW * 0.8 / 5) * 5),
          reps: "3",
          done: false,
          isFeeder: true
        });
      }
    }
    setWarmupSets(sets);
    setWarmupOpen(true);
    setWarmupDone(false);
  };
  const saveAsMyWorkout = () => {
    const entry = {
      id: Date.now(),
      name: workoutName || "My Workout",
      date: today(),
      source: "custom",
      exerciseList: exercises
    };
    setSavedWorkouts(prev => [entry, ...prev]);
    showToast(`check "${entry.name}" saved to My Workouts`);
  };
  const togglePending = id => setPendingIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const openPicker = () => {
    setPendingIds([]);
    setSearch("");
    setFilterMuscle(null);
    setFilterGroup(null);
    setFilterEquip(null);
    setPickerView("muscle");
    setPickerStep(1);
    setPickerMuscle(null);
    setPickerEquip(null);
    setPickerExercise(null);
    setShowPicker(true);
  };
  const addCustomExercise = () => {
    if (!customName.trim()) return;
    const ex = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      equipment: customEquip,
      primaryMuscle: customMuscle,
      secondaryMuscle: "",
      muscleId: customMuscleId,
      group: "Custom",
      note: "Custom exercise",
      isCustom: true
    };
    setCustomExercises(prev => [...prev, ex]);
    setCustomName("");
    setPickerView("muscle");
    showToast(`check "${ex.name}" added`);
  };
  const confirmAdd = () => {
    const allExercises = [...EXERCISE_DB, ...(customExercises || [])];
    const varExes = window._varExercises || {};
    const toAdd = pendingIds.filter(id => !exercises.find(a => a.id === id)).map(id => varExes[id] || allExercises.find(ex => ex.id === id)).filter(Boolean);
    // Research-based set defaults: compound = 3-4 sets, isolation = 3 sets, bodyweight = 3 sets
    const defaultSetCount = ex => {
      const compound = ["Power Rack", "Smith Machine", "Leg Press", "Cable Machine"];
      const isCompound = compound.includes(ex.equipment) && !["curl", "raise", "extension", "pushdown", "pulldown", "fly", "crossover", "shrug", "face pull"].some(k => (ex.name || "").toLowerCase().includes(k));
      return isCompound ? 4 : 3;
    };

    // If linking (replacing an unlinked imported exercise), swap in-place
    if (linkingExId && toAdd.length > 0) {
      const replacement = toAdd[0];
      setExercises(p => p.map(ex => {
        if (ex.id !== linkingExId) return ex;
        // Keep the original sets (reps/weight from import), swap identity
        return {
          ...replacement,
          sets: ex.sets,
          importedName: ex.name
        };
      }));
      setShowPicker(false);
      setPendingIds([]);
      setLinkingExId(null);
      window._varExercises = {};
      setPickerStep(1);
      setPickerMuscle(null);
      setPickerEquip(null);
      setPickerExercise(null);
      showToast(`Linked → ${replacement.name}`);
      return;
    }
    const newExs = toAdd.map(ex => {
      const prev = lastSets(ex.id);
      if (prev) return {
        ...ex,
        sets: prev.map(s => ({
          ...s,
          done: false
        }))
      };
      const count = defaultSetCount(ex);
      const initSets = Array.from({
        length: count
      }, () => ({
        weight: "",
        reps: "",
        done: false
      }));
      return {
        ...ex,
        sets: initSets
      };
    });
    setExercises(p => [...p, ...newExs]);
    setShowPicker(false);
    setPendingIds([]);
    setLinkingExId(null);
    window._varExercises = {};
    setPickerStep(1);
    setPickerMuscle(null);
    setPickerEquip(null);
    setPickerExercise(null);
    showToast(`Added ${newExs.length} exercise${newExs.length !== 1 ? "s" : ""}`);
  };
  const updateSet = (exId, si, field, val) => {
    touchExercise(exId);
    setExercises(p => p.map(ex => ex.id !== exId ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => i !== si ? s : {
        ...s,
        [field]: val
      })
    }));
  };
  const addSet = exId => {
    setExercises(p => p.map(ex => {
      if (ex.id !== exId) return ex;
      if (ex.sets.length >= 8) {
        showToast("Max 8 sets");
        return ex;
      }
      const last = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [...ex.sets, {
          weight: last?.weight || "",
          reps: "",
          done: false,
          plateCounts: last?.plateCounts ? {
            ...last.plateCounts
          } : undefined,
          barName: last?.barName
        }]
      };
    }));
  };
  const toggleDone = (exId, si) => {
    touchExercise(exId);
    const ex = exercises.find(e => e.id === exId);
    const set = ex?.sets[si];
    const wasDone = set?.done;
    setExercises(p => p.map(ex => ex.id !== exId ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => i !== si ? s : {
        ...s,
        done: !s.done
      })
    }));
    if (!wasDone) {
      if (set?.weight && isNewPR(exId, set.weight)) {
        showToast(`New PR! ${set.weight}lb on ${ex?.name}`);
      }
      startRest();
      setExpanded(p => ({
        ...p,
        [exId]: true
      }));
    }
  };
  const finishWorkout = () => {
    if (!workoutType || exercises.length === 0) return;
    const now = new Date();
    const timeOfDay = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    const hour = now.getHours();
    const timeLabel = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 21 ? "Evening" : "Night";
    const duration = workoutElapsed;
    const entry = {
      id: Date.now(),
      date: today(),
      dateISO: now.toISOString(),
      type: workoutName || PRESET_WORKOUTS.find(t => t.id === workoutType)?.name || workoutType,
      exercises,
      volume: totalVolume(exercises),
      duration,
      timeOfDay,
      timeLabel,
      hour,
      recovery: recoveryRating,
      note: sessionNote.trim() || null
    };
    setHistory(p => [...p, entry]);
    // If this was a plan session, advance the plan
    if (workoutType && workoutType.startsWith("plan:") && activePlan) {
      advancePlan();
    }
    setExercises([]);
    setWorkoutType(null);
    setWorkoutName("");
    setWorkoutStartTime(null);
    setWarmupDone(false);
    setSessionNote("");
    setSessionNoteOpen(false);
    try {
      localStorage.removeItem("locked_workout_draft");
    } catch (e) {}
    setTab("activity");
    showToast(`check Workout saved . ${fmtDuration(duration)}`);
  };

  // Filtered exercises
  const ALL_EXERCISES_LIST = [...EXERCISES, ...customExercises];
  const filtered = ALL_EXERCISES_LIST.filter(ex => {
    const s = (search || "").toLowerCase();
    const matchSearch = !search || (ex.name || "").toLowerCase().includes(s) || (ex.primaryMuscle || ex.muscle || "").toLowerCase().includes(s) || (ex.equipment || "").toLowerCase().includes(s);
    const matchMuscle = !filterMuscle || ex.muscleId === filterMuscle;
    const matchGroup = !filterGroup || ex.group === filterGroup;
    const matchEquip = !filterEquip || ex.equipment === filterEquip;
    return matchSearch && matchMuscle && matchGroup && matchEquip;
  });

  // Alphabetical grouping
  const alphaGroups = {};
  filtered.forEach(ex => {
    const letter = ex.name[0].toUpperCase();
    if (!alphaGroups[letter]) alphaGroups[letter] = [];
    alphaGroups[letter].push(ex);
  });
  const sortedLetters = Object.keys(alphaGroups).sort();

  // Equipment grouping -- group exercises by equipment piece
  const equipGroups = {};
  ALL_EXERCISES_LIST.forEach(ex => {
    if (!equipGroups[ex.equipment]) equipGroups[ex.equipment] = [];
    equipGroups[ex.equipment].push(ex);
  });
  const equipKeys = Object.keys(equipGroups).sort();
  const groups = [...new Set(ALL_EXERCISES_LIST.map(e => e.group))];
  const gymGroups = groups.map(g => ({
    group: g,
    exs: ALL_EXERCISES_LIST.filter(e => e.group === g)
  }));

  // Stack calculator computed values
  const stackMachineConfig = MACHINES.find(m => m.id === stackMachine) || MACHINES[0];
  const stackRatio = stackMachineConfig.ratio;
  const stackTopPlateWeight = stackMachineConfig.topPlate || 5;
  const stackSelectedWeight = stackBase + (stackTop5 ? stackTopPlateWeight : 0) + snodeMag + (gymPinPlate || 0);
  const stackEffective = stackRatio === 2 ? stackSelectedWeight / 2 : stackSelectedWeight;
  // Main stack increments for the machine
  const stackIncrement = stackMachineConfig.increment || 10;
  const stackStart = stackMachineConfig.startAt || stackIncrement;
  const stackIncrements = Array.from({
    length: Math.floor((stackMachineConfig.maxStack - stackStart) / stackIncrement) + 1
  }, (_, i) => stackStart + i * stackIncrement);
  const TABS = ["freddy", "library", "session", "activity", "mi"];
  const swipeStart = useRef(null);
  const handleTouchStart = e => {
    swipeStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = e => {
    if (swipeStart.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) < 100) return;
    const cur = TABS.indexOf(tab);
    if (dx < 0 && cur < TABS.length - 1) {
      setTab(TABS[cur + 1]);
    } else if (dx > 0 && cur > 0) {
      setTab(TABS[cur - 1]);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("style", null, css), toast && /*#__PURE__*/React.createElement("div", {
    className: "toast"
  }, toast), splash && /*#__PURE__*/React.createElement("div", {
    className: `splash ${splashFading ? "fade-out" : ""}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "splash-lock"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "72",
    height: "72",
    viewBox: "0 0 72 72",
    className: "neon-ring"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "34",
    width: "44",
    height: "30",
    rx: "6",
    fill: "none",
    stroke: "#00c2ff",
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 34V26a14 14 0 0 1 28 0v8",
    fill: "none",
    stroke: "#00c2ff",
    strokeWidth: "3",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "36",
    cy: "50",
    r: "4",
    fill: "#00c2ff"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "36",
    y1: "54",
    x2: "36",
    y2: "58",
    stroke: "#00c2ff",
    strokeWidth: "3",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "splash-logo"
  }, "Locked"), /*#__PURE__*/React.createElement("div", {
    className: "splash-tagline"
  }, "Lock in . Lift heavy . Repeat"), /*#__PURE__*/React.createElement("div", {
    className: "splash-bar"
  })), /*#__PURE__*/React.createElement("div", {
    className: "header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "header-logo"
  }, "Locked"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://claude.ai",
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      background: "#000",
      color: "#fff",
      border: "1.5px solid #00c2ff",
      borderRadius: 20,
      padding: "4px 10px",
      fontSize: 11,
      fontWeight: 700,
      textDecoration: "none",
      fontFamily: "Inter,sans-serif",
      boxShadow: "0 0 8px rgba(0,194,255,0.3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, "*"), " Claude"), /*#__PURE__*/React.createElement("div", {
    className: "header-date"
  }, today()))), restActive && /*#__PURE__*/React.createElement("div", {
    className: "rest-timer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rest-timer-label"
  }, "REST"), /*#__PURE__*/React.createElement("div", {
    className: "rest-timer-display"
  }, fmtTime(restSeconds)), /*#__PURE__*/React.createElement("button", {
    className: "rest-timer-skip",
    onClick: skipRest
  }, "Skip ", '>')), restActive && tab === "session" && /*#__PURE__*/React.createElement("div", {
    onClick: skipRest,
    style: {
      position: "fixed",
      bottom: 90,
      right: 16,
      zIndex: 500,
      width: 68,
      height: 68,
      borderRadius: "50%",
      background: "#000",
      border: "3px solid #00c2ff",
      boxShadow: "0 0 0 3px rgba(0,194,255,0.3), 0 4px 20px rgba(0,0,0,0.4)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      animation: "restPulse 1s ease-in-out infinite"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#00c2ff",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      lineHeight: 1
    }
  }, "REST"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 700,
      color: "#fff",
      fontFamily: "DM Mono,monospace",
      lineHeight: 1.2
    }
  }, fmtTime(restSeconds)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: "#8e8e93",
      marginTop: 1
    }
  }, "tap skip")), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === "freddy" ? "active" : ""}`,
    onClick: () => setTab("freddy")
  }, /*#__PURE__*/React.createElement(User, {
    size: 18,
    strokeWidth: 2
  }), /*#__PURE__*/React.createElement("span", null, "Freddy")), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === "library" ? "active" : ""}`,
    onClick: () => setTab("library")
  }, /*#__PURE__*/React.createElement(ClipboardList, {
    size: 18,
    strokeWidth: 2
  }), /*#__PURE__*/React.createElement("span", null, "Library")), /*#__PURE__*/React.createElement("button", {
    className: "tab-center-btn",
    onClick: () => {
      if (exercises.length > 0) {
        setTab("session");
      } else {
        setPlusSheetOpen(true);
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: `tab-center-icon${exercises.length > 0 ? " session-active" : ""}`
  }, exercises.length > 0 ? /*#__PURE__*/React.createElement(Dumbbell, {
    size: 22,
    strokeWidth: 2.5,
    color: "#fff"
  }) : /*#__PURE__*/React.createElement(Plus, {
    size: 24,
    strokeWidth: 2.5,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", {
    className: "tab-center-label"
  }, exercises.length > 0 ? "Session" : "")), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === "activity" ? "active" : ""}`,
    onClick: () => setTab("activity")
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 18,
    strokeWidth: 2
  }), /*#__PURE__*/React.createElement("span", null, "Activity")), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === "mi" ? "active" : ""}`,
    onClick: () => setTab("mi")
  }, /*#__PURE__*/React.createElement(Target, {
    size: 18,
    strokeWidth: 2
  }), /*#__PURE__*/React.createElement("span", null, "M.I."))), plusSheetOpen && /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-overlay",
    onClick: () => setPlusSheetOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-handle"
  }), /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-title"
  }, "Start a Workout"), /*#__PURE__*/React.createElement("button", {
    className: "plus-sheet-btn",
    onClick: () => {
      setPlusSheetOpen(false);
      setTab("freddy");
      // scroll to preset section — handled by freddy tab rendering
      setTimeout(() => {
        window.__openPresets && window.__openPresets();
      }, 100);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-icon"
  }, /*#__PURE__*/React.createElement(ClipboardList, {
    size: 18,
    color: "#00c2ff"
  })), /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-label"
  }, "Start Preset Workout"), /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-sub"
  }, "Choose from your saved plans & routines"))), /*#__PURE__*/React.createElement("button", {
    className: "plus-sheet-btn",
    onClick: () => {
      setPlusSheetOpen(false);
      // trigger import flow
      setTimeout(() => {
        window.__openImport && window.__openImport();
      }, 100);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-icon"
  }, /*#__PURE__*/React.createElement(Upload, {
    size: 18,
    color: "#30d158"
  })), /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-label"
  }, "Import Trainer Workout"), /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-sub"
  }, "Photo or text import"))), /*#__PURE__*/React.createElement("button", {
    className: "plus-sheet-btn",
    onClick: () => {
      setPlusSheetOpen(false);
      setTab("mi");
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-icon"
  }, /*#__PURE__*/React.createElement(Target, {
    size: 18,
    color: "#af52de"
  })), /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-label"
  }, "M.I. Catch-Up Workout"), /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-sub"
  }, "AI-suggested based on recovery"))), /*#__PURE__*/React.createElement("button", {
    className: "plus-sheet-btn",
    onClick: () => {
      setPlusSheetOpen(false);
      // start a blank custom workout
      setWorkoutType("custom");
      setWorkoutName("Custom Workout");
      setExercises([]);
      setWorkoutStartTime(Date.now());
      setWarmupDone(false);
      setTab("session");
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-icon"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 18,
    color: "#ff9f0a"
  })), /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-label"
  }, "Create Custom Workout"), /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-sub"
  }, "Build your own from scratch"))), /*#__PURE__*/React.createElement("button", {
    className: "plus-sheet-btn",
    onClick: () => {
      setPlusSheetOpen(false);
      setTab("library");
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-icon"
  }, /*#__PURE__*/React.createElement(Layers, {
    size: 18,
    color: "#ff6b6b"
  })), /*#__PURE__*/React.createElement("div", {
    className: "plus-sheet-btn-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-label"
  }, "Start Training Program"), /*#__PURE__*/React.createElement("span", {
    className: "plus-sheet-btn-sub"
  }, "Follow a structured multi-week plan"))))), /*#__PURE__*/React.createElement("div", {
    className: "content",
    ref: contentRef,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  }, tab === "freddy" && /*#__PURE__*/React.createElement("div", null, (() => {
    const now = new Date();
    const dayIdx = now.getDay();
    const dateKey = now.toISOString().slice(0, 10);
    const dateDisplay = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
    const isTrainingDay = scheduleDays.includes(dayIdx);
    const isCardioDay = cardioDays.includes(dayIdx);
    const cardioDone = !!cardioLog[dateKey];
    const todayRecovery = recoveryLog[dateKey];
    const todayLogged = history.some(h => h.date === dateKey);

    // Streak calc -- consecutive days with a workout OR cardio
    let streak = 0;
    const daysSet = new Set(history.map(h => h.date));
    const cardioDaysSet = new Set(Object.keys(cardioLog));
    for (let i = 0; i < 90; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (daysSet.has(k) || cardioDaysSet.has(k)) streak++;else if (i > 0) break; // allow today to be empty without breaking streak
    }

    // Last workout for the recap card
    const lastWorkout = history[history.length - 1];

    // Motivational images (rotated by day of year for stability during a session)
    const motivationalImages = ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1517964603305-11c0f6f66012?w=800&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&auto=format&fit=crop&q=60"];
    const motivationalQuotes = [{
      q: "The pain you feel today is the strength you feel tomorrow.",
      a: "Arnold Schwarzenegger"
    }, {
      q: "Everybody wants to be a bodybuilder but nobody wants to lift no heavy-ass weights.",
      a: "Ronnie Coleman"
    }, {
      q: "Strength does not come from winning. Your struggles develop your strengths.",
      a: "Arnold Schwarzenegger"
    }, {
      q: "The last three or four reps is what makes the muscle grow.",
      a: "Arnold Schwarzenegger"
    }, {
      q: "You must do what others don't to achieve what others won't.",
      a: "Anonymous"
    }, {
      q: "Discipline is choosing between what you want now and what you want most.",
      a: "Abraham Lincoln"
    }];
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const heroImg = motivationalImages[dayOfYear % motivationalImages.length];
    const heroQuote = motivationalQuotes[dayOfYear % motivationalQuotes.length];
    const recoveryEmojis = ["", "💀", "😓", "😐", "💪", "⚡"];
    const recoveryLabels = ["", "Dead", "Rough", "OK", "Good", "Fired up"];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#000",
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: 10,
        boxShadow: "0 0 0 2px #00c2ff, 0 0 20px rgba(0,194,255,0.25)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#00c2ff",
        letterSpacing: "0.08em",
        textTransform: "uppercase"
      }
    }, "Today"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: "#fff",
        marginTop: 2,
        letterSpacing: "-0.5px"
      }
    }, dateDisplay), streak > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#00c2ff",
        marginTop: 4,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, "🔥 ", streak, " day streak")), activePlan ? (() => {
      const plan = PLAN_TEMPLATES.find(p => p.id === activePlan.planId);
      if (!plan) return null;
      const day = plan.days[activePlan.currentDayIndex];
      const progressPct = (activePlan.currentWeek - 1) / plan.duration * 100;
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: "linear-gradient(135deg, #000 0%, #1a1a1a 100%)",
          borderRadius: 16,
          padding: "14px 16px",
          marginBottom: 10,
          boxShadow: "0 0 0 1.5px #00c2ff, 0 0 20px rgba(0,194,255,0.25)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: "#00c2ff",
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }
      }, "Active Plan"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 16,
          fontWeight: 800,
          color: "#fff",
          marginTop: 2
        }
      }, plan.name)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#8e8e93",
          textAlign: "right"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          color: "#fff"
        }
      }, "W", activePlan.currentWeek, " / ", plan.duration), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10
        }
      }, "Day ", activePlan.currentDayIndex + 1, " of ", plan.days.length))), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 4,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 2,
          marginBottom: 12,
          overflow: "hidden"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          height: "100%",
          width: `${progressPct}%`,
          background: "#00c2ff",
          borderRadius: 2,
          boxShadow: "0 0 8px rgba(0,194,255,0.6)"
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          background: "rgba(255,255,255,0.05)",
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: "#8e8e93",
          letterSpacing: "0.05em",
          textTransform: "uppercase"
        }
      }, "Next Session"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 700,
          color: "#fff",
          marginTop: 2
        }
      }, day.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#8e8e93",
          marginTop: 2
        }
      }, day.exercises.length, " exercises · Focus: ", day.focus)), /*#__PURE__*/React.createElement("button", {
        onClick: loadPlanSession,
        style: {
          width: "100%",
          padding: "11px",
          background: "#00c2ff",
          color: "#000",
          border: "none",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 800,
          cursor: "pointer",
          fontFamily: "Inter,sans-serif",
          letterSpacing: "0.02em"
        }
      }, "Start Session"), planCancelConfirm ? /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginTop: 10,
          padding: "8px 10px",
          background: "rgba(255,59,48,0.1)",
          borderRadius: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: "#ff3b30",
          fontWeight: 600,
          flex: 1
        }
      }, "End this plan?"), /*#__PURE__*/React.createElement("button", {
        onClick: cancelPlan,
        style: {
          background: "#ff3b30",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "5px 10px",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "Inter,sans-serif"
        }
      }, "Yes, end"), /*#__PURE__*/React.createElement("button", {
        onClick: () => setPlanCancelConfirm(false),
        style: {
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#8e8e93",
          borderRadius: 6,
          padding: "5px 10px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "Inter,sans-serif"
        }
      }, "Cancel")) : /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          marginTop: 10
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setPlanDetailId(activePlan.planId),
        style: {
          flex: 1,
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#8e8e93",
          borderRadius: 8,
          padding: "7px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "Inter,sans-serif"
        }
      }, "View plan"), /*#__PURE__*/React.createElement("button", {
        onClick: () => setPlanCancelConfirm(true),
        style: {
          flex: 1,
          background: "transparent",
          border: "1px solid rgba(255,59,48,0.3)",
          color: "#ff8c85",
          borderRadius: 8,
          padding: "7px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "Inter,sans-serif"
        }
      }, "End plan")), /*#__PURE__*/React.createElement("button", {
        onClick: () => setPlansBrowseOpen(true),
        style: {
          width: "100%",
          background: "transparent",
          border: "none",
          color: "#8e8e93",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "Inter,sans-serif",
          marginTop: 10,
          padding: "4px",
          textDecoration: "underline",
          textUnderlineOffset: 2
        }
      }, "Browse other plans"));
    })() : /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        border: "1.5px dashed #c7c7cc",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#8e8e93",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 6
      }
    }, "Workout Plan"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#000",
        marginBottom: 10,
        fontWeight: 600
      }
    }, "No plan active"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginBottom: 12,
        lineHeight: 1.5
      }
    }, "A structured 12-week plan takes the guesswork out. It knows what to do each day and progresses you week by week."), /*#__PURE__*/React.createElement("button", {
      onClick: () => setPlansBrowseOpen(true),
      style: {
        width: "100%",
        padding: "11px",
        background: "#000",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        boxShadow: "0 0 0 2px #00c2ff, 0 0 12px rgba(0,194,255,0.25)"
      }
    }, "Browse Plans")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#8e8e93",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 8
      }
    }, "Scheduled today"), !isTrainingDay && !isCardioDay && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22
      }
    }, "🌿"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#000"
      }
    }, "Recovery day"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginTop: 1
      }
    }, "No training scheduled. Rest up."))), isTrainingDay && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
        borderBottom: isCardioDay ? "1px solid #F0F0F0" : "none",
        paddingBottom: isCardioDay ? 10 : 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22
      }
    }, "🏋️"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#000"
      }
    }, todayLogged ? "Training done" : "Weight training"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: todayLogged ? "#1a9e3f" : "#8e8e93",
        marginTop: 1,
        fontWeight: 600
      }
    }, todayLogged ? "✓ Logged in history" : "Scheduled workout"), !todayLogged && !activePlan && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginTop: 4,
        lineHeight: 1.4
      }
    }, "Pick a preset, build a custom workout, or import one below to get started."))), isCardioDay && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: isTrainingDay ? "10px 0 6px" : "6px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22
      }
    }, "🏃"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#000"
      }
    }, cardioDone ? "Cardio done" : "Cardio reminder"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: cardioDone ? "#1a9e3f" : "#8e8e93",
        marginTop: 1,
        fontWeight: 600
      }
    }, cardioDone ? "✓ Marked done — details in Whoop" : "Get your cardio in — tracked in Whoop")), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (cardioDone) {
          setCardioLog(p => {
            const n = {
              ...p
            };
            delete n[dateKey];
            return n;
          });
          showToast("Cardio unmarked");
        } else {
          setCardioLog(p => ({
            ...p,
            [dateKey]: {
              time: new Date().toISOString()
            }
          }));
          showToast("Cardio marked done");
        }
      },
      style: {
        background: cardioDone ? "#34c759" : "#fff",
        color: cardioDone ? "#fff" : "#00c2ff",
        border: cardioDone ? "none" : "1.5px solid #00c2ff",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0
      }
    }, cardioDone ? /*#__PURE__*/React.createElement(React.Fragment, null, "✓ Done") : "Mark done"))), (() => {
      const neglected = getNeglectedMuscles(history, 3);
      if (neglected.length === 0) return null;
      const priorityColors = {
        red: "#ff3b30",
        orange: "#ff9f0a"
      };
      const priorityEmoji = {
        red: "🔴",
        orange: "🟠"
      };
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: "#fff",
          borderRadius: 16,
          padding: "14px 16px",
          marginBottom: 10,
          border: "1.5px solid #e5e5ea",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: "#8e8e93",
          letterSpacing: "0.05em",
          textTransform: "uppercase"
        }
      }, "Muscle Focus"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: "#000",
          fontWeight: 600,
          marginTop: 2
        }
      }, "Time to work on these")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: "#ff9f0a",
          padding: "3px 8px",
          background: "rgba(255,159,10,0.1)",
          borderRadius: 10
        }
      }, neglected.length)), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 10
        }
      }, neglected.map(n => /*#__PURE__*/React.createElement("div", {
        key: n.muscle,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: "#fafafa",
          borderRadius: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12
        }
      }, priorityEmoji[n.priority]), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontSize: 13,
          fontWeight: 700,
          color: "#000"
        }
      }, n.muscle), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: priorityColors[n.priority],
          fontWeight: 600
        }
      }, n.reason)))), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          const catchUp = generateCatchUpWorkout(history);
          if (catchUp.length === 0) {
            showToast("Not enough data — pick some exercises manually");
            return;
          }
          const newExs = catchUp.map(ex => {
            const prev = lastSets(ex.id);
            const initSets = prev ? prev.map(s => ({
              ...s,
              done: false
            })) : [{
              weight: "",
              reps: "",
              done: false
            }];
            return {
              ...ex,
              sets: initSets
            };
          });
          setWorkoutType("catchup");
          setWorkoutName(`Catch-Up · ${new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
          })}`);
          setExercises(newExs);
          setExpanded({});
          setWorkoutStartTime(Date.now());
          setTab("session");
          setTimeout(() => {
            if (contentRef.current) contentRef.current.scrollTo({
              top: 0,
              behavior: "instant"
            });
          }, 50);
          showToast(`Generated: ${catchUp.length} exercises for neglected muscles`);
        },
        style: {
          width: "100%",
          padding: "11px",
          background: "#000",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "Inter,sans-serif",
          boxShadow: "0 0 0 2px #00c2ff, 0 0 12px rgba(0,194,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement(Zap, {
        size: 15,
        strokeWidth: 2.5,
        color: "#00c2ff"
      }), " Generate Catch-Up Workout"));
    })(), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        height: 180,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 10,
        backgroundImage: `url(${heroImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "16px 18px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#fff",
        fontStyle: "italic",
        lineHeight: 1.3
      }
    }, "\"", heroQuote.q, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#00c2ff",
        marginTop: 6,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase"
      }
    }, "— ", heroQuote.a))), lastWorkout && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 16,
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#8e8e93",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 4
      }
    }, "Last workout"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#000"
      }
    }, lastWorkout.type), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginTop: 2
      }
    }, lastWorkout.date, " · ", lastWorkout.exercises?.length || 0, " exercises", lastWorkout.duration && ` · ${fmtDuration(lastWorkout.duration)}`)), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        // Open the month folder containing this workout
        const d = lastWorkout.dateISO ? new Date(lastWorkout.dateISO) : new Date(lastWorkout.id);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        setHistoryMonthOpen(p => ({
          ...p,
          [monthKey]: true
        }));
        setHighlightHistoryId(lastWorkout.id);
        setTab("activity");
        // Scroll to the workout after render
        setTimeout(() => {
          const el = document.querySelector(`[data-history-id="${lastWorkout.id}"]`);
          if (el) {
            el.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
          // Clear highlight after animation
          setTimeout(() => setHighlightHistoryId(null), 3000);
        }, 200);
      },
      style: {
        background: "none",
        border: "1.5px solid #e5e5ea",
        color: "#00c2ff",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif"
      }
    }, "View"))));
  })(), /*#__PURE__*/React.createElement("input", {
    ref: importRef,
    type: "file",
    accept: "image/*",
    onChange: handleWorkoutPhoto,
    style: {
      display: "none"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => importRef.current.click(),
    disabled: importing,
    style: {
      width: "100%",
      padding: "14px 16px",
      marginBottom: 8,
      background: importing ? "#F0F0F0" : "#000",
      color: importing ? "#8e8e93" : "#fff",
      border: "none",
      borderRadius: 14,
      cursor: importing ? "default" : "pointer",
      fontFamily: "Inter,sans-serif",
      fontSize: 14,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      boxShadow: importing ? "none" : "0 0 0 2px #00c2ff, 0 0 16px rgba(0,194,255,0.3)",
      transition: "all 0.2s"
    }
  }, importing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 16,
      height: 16,
      border: "2px solid #c7c7cc",
      borderTopColor: "#00c2ff",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite"
    }
  }), " Reading workout...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Camera, {
    size: 18,
    strokeWidth: 2.5
  }), " Import from Photo")), showNameInput ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #00c2ff",
      padding: "14px 16px",
      marginBottom: 16,
      boxShadow: "0 0 0 1px #00c2ff, 0 0 12px rgba(0,194,255,0.15)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#000",
      marginBottom: 10
    }
  }, "Name your workout"), /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    value: newWorkoutName,
    onFocus: e => e.target.select(),
    onChange: e => setNewWorkoutName(e.target.value),
    placeholder: "e.g. Monday Push, Heavy Day...",
    style: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      border: "1.5px solid #e5e5ea",
      fontSize: 14,
      fontFamily: "Inter,sans-serif",
      outline: "none",
      marginBottom: 10,
      boxSizing: "border-box"
    },
    onKeyDown: e => {
      if (e.key === "Enter" && newWorkoutName.trim()) {
        setWorkoutType("custom");
        setWorkoutName(newWorkoutName.trim());
        setExercises([]);
        setShowNameInput(false);
        setNewWorkoutName("");
        setTab("session");
        setTimeout(() => openPicker(), 100);
      }
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowNameInput(false);
      setNewWorkoutName("");
    },
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid #e5e5ea",
      background: "#fff",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      color: "#8e8e93"
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (!newWorkoutName.trim()) return;
      setWorkoutType("custom");
      setWorkoutName(newWorkoutName.trim());
      setExercises([]);
      setShowNameInput(false);
      setNewWorkoutName("");
      setTab("session");
      setTimeout(() => openPicker(), 100);
    },
    style: {
      flex: 2,
      padding: "10px",
      borderRadius: 10,
      border: "none",
      background: "#000",
      color: "#fff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      boxShadow: "0 0 0 1.5px #00c2ff"
    }
  }, "Start Building"))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const d = new Date();
      const dateName = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      setNewWorkoutName(dateName);
      setShowNameInput(true);
    },
    style: {
      width: "100%",
      padding: "14px 16px",
      marginBottom: 16,
      background: "#fff",
      color: "#000",
      border: "1.5px solid #e5e5ea",
      borderRadius: 14,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      fontSize: 14,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      transition: "all 0.2s"
    }
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 18,
    strokeWidth: 2.5
  }), " Create Workout"), savedWorkouts.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setWorkoutsExpanded(e => !e),
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      cursor: "pointer",
      marginBottom: workoutsExpanded ? 8 : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-label",
    style: {
      margin: 0
    }
  }, "My Workouts (", savedWorkouts.length, ")"), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 16,
    strokeWidth: 2.5,
    color: "#8e8e93",
    style: {
      transform: workoutsExpanded ? "rotate(180deg)" : "none",
      transition: "transform 0.2s"
    }
  })), workoutsExpanded && /*#__PURE__*/React.createElement(React.Fragment, null, savedWorkouts.length >= 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: workoutSearch,
    onChange: e => setWorkoutSearch(e.target.value),
    placeholder: "Search workouts...",
    style: {
      width: "100%",
      padding: "9px 14px 9px 36px",
      borderRadius: 10,
      border: "1.5px solid #e5e5ea",
      fontSize: 13,
      fontFamily: "Inter,sans-serif",
      outline: "none",
      boxSizing: "border-box",
      background: "#fff"
    }
  }), /*#__PURE__*/React.createElement("svg", {
    style: {
      position: "absolute",
      left: 12,
      top: "50%",
      transform: "translateY(-50%)"
    },
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#8e8e93",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.65",
    y2: "16.65"
  })), workoutSearch && /*#__PURE__*/React.createElement("button", {
    onClick: () => setWorkoutSearch(""),
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#8e8e93",
      fontSize: 16,
      lineHeight: 1
    }
  }, "x")), savedWorkouts.filter(w => !workoutSearch || w.name.toLowerCase().includes(workoutSearch.toLowerCase())).map(w => /*#__PURE__*/React.createElement(SavedWorkoutCard, {
    key: w.id,
    workout: w,
    onLoad: () => loadSaved(w),
    onDelete: () => {
      if (window.confirm(`Remove "${w.name}" from your library?\n\nThis can't be undone.`)) deleteSaved(w.id);
    }
  })), workoutSearch && savedWorkouts.filter(w => w.name.toLowerCase().includes(workoutSearch.toLowerCase())).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0",
      fontSize: 13,
      color: "#8e8e93"
    }
  }, "No workouts matching \"", workoutSearch, "\""))), /*#__PURE__*/React.createElement("div", {
    className: "section-label"
  }, "Presets"), /*#__PURE__*/React.createElement("div", {
    className: "type-grid"
  }, PRESET_WORKOUTS.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: `type-card ${workoutType === p.id ? "selected" : ""}`,
    onClick: () => loadPreset(p)
  }, /*#__PURE__*/React.createElement("div", {
    className: "type-icon"
  }, /*#__PURE__*/React.createElement(p.Icon, {
    size: 22,
    strokeWidth: 2.5,
    color: workoutType === p.id ? "#00c2ff" : "#000"
  })), /*#__PURE__*/React.createElement("div", {
    className: "type-name"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "type-tag"
  }, p.tag)))), exercises.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #00c2ff",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      cursor: "pointer",
      boxShadow: "0 0 0 1px #00c2ff, 0 0 12px rgba(0,194,255,0.15)"
    },
    onClick: () => setTab("session")
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#00c2ff"
    }
  }, "Workout in progress"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      marginTop: 2
    }
  }, workoutName, " . ", exercises.length, " exercises")), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 16,
    strokeWidth: 2.5,
    color: "#00c2ff",
    style: {
      transform: "rotate(-90deg)"
    }
  }))), tab === "session" && /*#__PURE__*/React.createElement(React.Fragment, null, exercises.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty-icon"
  }, /*#__PURE__*/React.createElement(Dumbbell, {
    size: 36,
    strokeWidth: 1.5,
    color: "#c7c7cc"
  })), "No session in progress", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12
    }
  }, "Tap ", /*#__PURE__*/React.createElement("strong", null, "+"), " below to start a workout"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: "auto",
      padding: "12px 24px"
    },
    onClick: () => setPlusSheetOpen(true)
  }, "Start Workout"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 700,
      color: "#000"
    }
  }, workoutName || "My Workout"), workoutStartTime && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      marginTop: 2,
      fontFamily: "DM Mono,monospace"
    }
  }, fmtDuration(workoutElapsed))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 4,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, "Rest"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      background: "#fff",
      border: "1.5px solid #e5e5ea",
      borderRadius: 8,
      padding: 2,
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
    }
  }, [60, 90, 120, 180].map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => {
      setRestDuration(s);
      showToast(`Rest -> ${fmtTime(s)}`);
    },
    style: {
      padding: "4px 8px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 700,
      fontFamily: "DM Mono,monospace",
      background: restDuration === s ? "#000" : "transparent",
      color: restDuration === s ? "#00c2ff" : "#8e8e93",
      transition: "all 0.15s"
    }
  }, fmtTime(s)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 12,
      border: "1.5px solid #e5e5ea",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setSessionNoteOpen(!sessionNoteOpen),
    style: {
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      cursor: "pointer",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#8e8e93",
      letterSpacing: "0.05em",
      textTransform: "uppercase"
    }
  }, "Session Note"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: sessionNote ? "#000" : "#c7c7cc",
      marginTop: 2,
      fontStyle: sessionNote ? "normal" : "italic",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, sessionNote || "How does today feel?")), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 14,
    strokeWidth: 2.5,
    color: "#00c2ff",
    style: {
      transform: sessionNoteOpen ? "rotate(180deg)" : "none",
      transition: "transform 0.2s",
      flexShrink: 0
    }
  })), sessionNoteOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 14px 12px",
      borderTop: "1px solid #F0F0F0"
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    value: sessionNote,
    onChange: e => setSessionNote(e.target.value),
    placeholder: "Energy, mood, tightness, anything worth remembering...",
    rows: 3,
    style: {
      width: "100%",
      border: "1px solid #e5e5ea",
      borderRadius: 8,
      padding: "8px 10px",
      fontSize: 13,
      fontFamily: "Inter,sans-serif",
      resize: "none",
      marginTop: 10,
      boxSizing: "border-box",
      outline: "none",
      color: "#000"
    },
    onFocus: e => e.target.style.borderColor = "#00c2ff",
    onBlur: e => e.target.style.borderColor = "#e5e5ea"
  }))), !warmupDone ? /*#__PURE__*/React.createElement("button", {
    onClick: generateWarmup,
    style: {
      width: "100%",
      padding: "12px",
      borderRadius: 12,
      border: "1.5px solid #00c2ff",
      background: "#fff",
      color: "#00c2ff",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      boxShadow: "0 0 8px rgba(0,194,255,0.3)"
    }
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 15,
    strokeWidth: 2.5,
    color: "#00c2ff"
  }), " Warm Up") : /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 12px",
      borderRadius: 10,
      background: "#fff",
      border: "1px solid #00c2ff",
      fontSize: 12,
      fontWeight: 600,
      color: "#00c2ff",
      textAlign: "center",
      boxShadow: "0 0 8px rgba(0,194,255,0.3)"
    }
  }, "check Warm up complete -- let's go!"), exercises.map((ex, exIdx) => {
    const lw = lastWeightLabel(ex.id);
    const open = expanded[ex.id];
    const ExIcon = EX_ICON[ex.equipment] || Dumbbell;
    const progression = progressionSuggestion(ex.id);
    const pr = personalRecord(ex.id);
    const isGlowing = lastTouchedId === ex.id;
    return /*#__PURE__*/React.createElement("div", {
      key: isGlowing ? ex.id + "-g-" + lastTouchedTime : ex.id,
      className: "exercise-card",
      "data-card-id": ex.id,
      style: {
        ...(ex.supersetGroup ? {
          borderColor: "#00c2ff",
          boxShadow: "0 0 0 1px #00c2ff, 0 1px 6px rgba(0,194,255,0.15)"
        } : {}),
        ...(isGlowing ? {
          animation: "cardGlow 60s ease-out forwards"
        } : {})
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-header",
      onClick: () => {
        const wasOpen = open;
        setExpanded(p => ({
          ...p,
          [ex.id]: !wasOpen
        }));
        if (!wasOpen) {
          // Yield to React render, then scroll
          setTimeout(() => {
            const cardEl = document.querySelector(`[data-card-id="${CSS.escape(ex.id)}"]`);
            if (cardEl) cardEl.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }, 0);
        }
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, ex.supersetGroup && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#000",
        color: "#00c2ff",
        fontSize: 10,
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: 5,
        letterSpacing: "0.05em",
        border: "1.5px solid #00c2ff",
        boxShadow: "0 0 8px rgba(0,194,255,0.35)",
        flexShrink: 0
      }
    }, ex.supersetGroup, ex.supersetPosition), /*#__PURE__*/React.createElement("div", {
      className: "exercise-name"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#636366",
        fontWeight: 800,
        fontSize: 13,
        marginRight: 6,
        fontFamily: "DM Mono,monospace"
      }
    }, exIdx + 1), ex.isMainLift && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#00c2ff",
        marginRight: 4,
        fontWeight: 800
      }
    }, "★"), ex.name)), /*#__PURE__*/React.createElement("div", {
      className: "exercise-muscle-head"
    }, ex.muscleHead || ex.primaryMuscle, ex.planTargetReps && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 8,
        fontSize: 10,
        fontWeight: 800,
        color: "#00c2ff",
        padding: "2px 8px",
        background: "rgba(0,194,255,0.1)",
        borderRadius: 6,
        letterSpacing: "0.03em",
        fontFamily: "DM Mono,monospace"
      }
    }, "Target: ", ex.sets.length, "×", ex.planTargetReps))), /*#__PURE__*/React.createElement("div", {
      className: `exercise-chevron ${open ? "open" : ""}`
    }, /*#__PURE__*/React.createElement(ChevronDown, {
      size: 18,
      strokeWidth: 3,
      color: "#00c2ff"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "exercise-pills",
      onClick: e => e.stopPropagation()
    }, ex.unlinked ? /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill",
      onClick: e => {
        e.stopPropagation();
        setLinkingExId(ex.id);
        openPicker();
      },
      style: {
        borderColor: "#ff3b30",
        boxShadow: "0 0 8px rgba(255,59,48,0.35)",
        justifyContent: "center",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-label",
      style: {
        color: "#ff3b30"
      }
    }, "Link"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-val",
      style: {
        color: "#ff3b30",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10
      }
    }, /*#__PURE__*/React.createElement(Link, {
      size: 14,
      strokeWidth: 2.5,
      color: "#ff3b30"
    }))) : /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill blue",
      onClick: e => {
        e.stopPropagation();
        setSwapSheet(ex.id);
      },
      style: {
        justifyContent: "center",
        boxShadow: "0 0 8px rgba(0,194,255,0.35)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-label",
      style: {
        color: "#00c2ff"
      }
    }, "Swap"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-val",
      style: {
        color: "#00c2ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(ArrowLeftRight, {
      size: 16,
      strokeWidth: 2.5,
      color: "#00c2ff"
    }))), ex.equipment === "Cable Machine" && (() => {
      const att = getAttachment(ex.baseId || ex.id);
      return /*#__PURE__*/React.createElement("div", {
        className: "exercise-pill",
        onClick: e => {
          e.stopPropagation();
          setAttachmentSheetExId(ex.id);
        },
        style: {
          borderColor: "#ff9f0a",
          boxShadow: "0 0 8px rgba(255,159,10,0.35)",
          cursor: "pointer",
          minWidth: 0,
          flex: 1.5
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "exercise-pill-label",
        style: {
          color: "#ff9f0a"
        }
      }, "Attachment"), /*#__PURE__*/React.createElement("div", {
        className: "exercise-pill-val",
        style: {
          color: "#ff9f0a",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: 10
        }
      }, att ? att.name : "Set preference"));
    })(), /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill",
      style: {
        borderColor: "#000",
        cursor: EQUIPMENT_ALTERNATIVES[ex.baseId || ex.id]?.length ? "pointer" : "default"
      },
      onClick: e => {
        e.stopPropagation();
        if (EQUIPMENT_ALTERNATIVES[ex.baseId || ex.id]?.length) setEquipSheet(ex.id);
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-label",
      style: {
        color: "#000"
      }
    }, "Setup"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-val",
      style: {
        color: "#000"
      }
    }, ex.equipment || "—")), /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill green",
      style: {
        boxShadow: "0 0 8px rgba(0,255,136,0.4)"
      },
      onClick: e => {
        e.stopPropagation();
        const prev = lastSets(ex.id);
        if (!prev) return showToast("No previous sets found");
        setExercises(p => p.map(e => e.id !== ex.id ? e : {
          ...e,
          sets: prev.map(s => ({
            ...s,
            done: false
          }))
        }));
        showToast("Last session sets loaded");
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-label",
      style: {
        color: "#00c76b"
      }
    }, "Last"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-val",
      style: {
        color: "#00c76b"
      }
    }, lastSets(ex.id)?.length || "—")), /*#__PURE__*/React.createElement("a", {
      href: youtubeUrl(ex.name),
      target: "_blank",
      rel: "noopener noreferrer",
      onClick: e => e.stopPropagation(),
      className: "exercise-pill",
      style: {
        textDecoration: "none",
        borderColor: "#ff0844",
        background: "#fff",
        boxShadow: "0 0 8px rgba(255,8,68,0.35)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-label",
      style: {
        color: "#ff0844"
      }
    }, "Video"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-pill-val",
      style: {
        color: "#ff0844",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement(Youtube, {
      size: 11,
      strokeWidth: 2,
      color: "#ff0844"
    }), "Demo"))), /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-row",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-chip"
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-label"
    }, "Rest"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-val"
    }, fmtTime(restDuration))), /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-chip"
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-label"
    }, "PR"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-val"
    }, pr ? `${pr.weight}lb` : "—")), /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-chip"
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-label"
    }, "Set 1 Last"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-val"
    }, lastSets(ex.id)?.[0]?.weight ? `${lastSets(ex.id)[0].weight}lb` : "—")), /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-chip"
    }, /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-label"
    }, "Best Last"), /*#__PURE__*/React.createElement("div", {
      className: "exercise-info-val"
    }, lw ? lw.replace("lb x ", " x ") : "—")))), /*#__PURE__*/React.createElement("div", {
      className: `sets-area-wrapper ${open ? "open" : ""}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "sets-area"
    }, (() => {
      const trend = [];
      for (let i = history.length - 1; i >= 0 && trend.length < 8; i--) {
        const hEx = history[i].exercises.find(e => e.id === ex.id);
        if (hEx?.sets?.length) {
          const best = Math.max(...hEx.sets.map(s => parseFloat(s.weight) || 0));
          if (best > 0) trend.unshift({
            w: best,
            date: history[i].date
          });
        }
      }
      if (trend.length < 2) return null;
      const maxW = Math.max(...trend.map(t => t.w));
      const minW = Math.min(...trend.map(t => t.w));
      const range = maxW - minW || 1;
      const W = 280,
        H = 64,
        padX = 10,
        padTop = 14,
        padBottom = 8;
      const x = i => padX + i / (trend.length - 1) * (W - padX * 2);
      const y = v => H - padBottom - (v - minW) / range * (H - padTop - padBottom);
      const path = trend.map((t, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(t.w)}`).join(" ");
      const fillPath = `${path} L${x(trend.length - 1)},${H} L${x(0)},${H} Z`;
      const diff = trend[trend.length - 1].w - trend[0].w;
      const pct = trend[0].w > 0 ? (diff / trend[0].w * 100).toFixed(1) : 0;
      const lastX = x(trend.length - 1);
      const lastY = y(trend[trend.length - 1].w);
      // Position label above if there's room, otherwise below
      const labelAbove = lastY > padTop + 12;
      return /*#__PURE__*/React.createElement("div", {
        onClick: e => {
          e.stopPropagation();
          setProgressChartExId(ex.baseId || ex.id);
        },
        style: {
          background: "#f9f9f9",
          borderRadius: 8,
          padding: "10px 12px",
          marginBottom: 8,
          border: "1px solid #f0f0f0",
          cursor: "pointer"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: "#8e8e93",
          textTransform: "uppercase",
          letterSpacing: "0.06em"
        }
      }, "Weight Trend · Last ", trend.length, " sessions · Tap to expand"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: diff >= 0 ? "#34c759" : "#ff3b30",
          whiteSpace: "nowrap"
        }
      }, diff >= 0 ? "+" : "", diff, "lb (", pct, "%)")), /*#__PURE__*/React.createElement("svg", {
        width: "100%",
        viewBox: `0 0 ${W} ${H}`,
        style: {
          overflow: "visible",
          display: "block"
        }
      }, /*#__PURE__*/React.createElement("path", {
        d: fillPath,
        fill: "rgba(0,194,255,0.08)"
      }), /*#__PURE__*/React.createElement("path", {
        d: path,
        fill: "none",
        stroke: "#00c2ff",
        strokeWidth: "1.5",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }), trend.map((t, i) => /*#__PURE__*/React.createElement("circle", {
        key: i,
        cx: x(i),
        cy: y(t.w),
        r: "3",
        fill: "#00c2ff",
        stroke: "#fff",
        strokeWidth: "1.5"
      })), /*#__PURE__*/React.createElement("text", {
        x: lastX,
        y: labelAbove ? lastY - 7 : lastY + 14,
        fontSize: "10",
        fill: "#00c2ff",
        fontWeight: "700",
        textAnchor: trend.length > 1 ? "end" : "middle"
      }, trend[trend.length - 1].w, "lb")));
    })(), progression && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(52,199,89,0.08)",
        border: "1.5px solid rgba(52,199,89,0.3)",
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement(TrendingUp, {
      size: 14,
      strokeWidth: 2.5,
      color: "#34c759",
      style: {
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 13,
        fontWeight: 600,
        color: "#1a9e3f"
      }
    }, progression.text), /*#__PURE__*/React.createElement("button", {
      style: {
        background: "#34c759",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "7px 16px",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        flexShrink: 0
      },
      onClick: () => {
        setExercises(p => p.map(e => e.id !== ex.id ? e : {
          ...e,
          sets: e.sets.map(s => ({
            ...s,
            weight: String(progression.suggestedWeight)
          }))
        }));
        showToast(`Applied ${progression.suggestedWeight}lb to all sets`);
      }
    }, "Apply")), ex.bench && ex.bench !== "N/A" && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#00c2ff",
        fontWeight: 600,
        padding: "2px 0 4px",
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(Lightbulb, {
      size: 11,
      strokeWidth: 2.5
    }), ex.bench), ["bw-pullup", "bw-pullup-close", "bw-chinup", "bw-neutralwide", "bw-neutralclose", "bw-angled", "bw-fatbar", "bw-fatbar-under", "bw-weighted-pu", "bw-eccentric-pu", "bw-lsit-pu", "bw-scapular"].includes(ex.id) && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        background: "#f9f9f9",
        borderRadius: 8,
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        fontWeight: 600
      }
    }, "Body weight:"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: bodyWeight,
      onChange: e => setBodyWeight(parseFloat(e.target.value) || 0),
      style: {
        width: 60,
        padding: "4px 8px",
        borderRadius: 6,
        border: "1.5px solid #e5e5ea",
        fontSize: 13,
        fontFamily: "DM Mono,monospace",
        fontWeight: 700,
        textAlign: "center",
        outline: "none"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#8e8e93"
      }
    }, "lb")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
        padding: "6px 10px",
        background: "#f9f9f9",
        borderRadius: 8,
        border: "1px solid #f0f0f0"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement(Target, {
      size: 12,
      strokeWidth: 2.5,
      color: "#8e8e93"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        flexShrink: 0
      }
    }, "Target Reps"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "e.g. 8-12",
      value: ex.targetRepRange || "",
      onChange: e => {
        const val = e.target.value;
        const parsed = val.match(/^(\d+)\s*[-\u2013]\s*(\d+)$/);
        setExercises(p => p.map(x => x.id !== ex.id ? x : {
          ...x,
          targetRepRange: val,
          sets: x.sets.map(s => ({
            ...s,
            targetRepsLow: parsed ? parseInt(parsed[1]) : null,
            targetRepsHigh: parsed ? parseInt(parsed[2]) : null
          }))
        }));
      },
      style: {
        flex: 1,
        border: "none",
        background: "transparent",
        fontSize: 13,
        fontFamily: "DM Mono,monospace",
        fontWeight: 700,
        color: "#00c2ff",
        outline: "none",
        textAlign: "center",
        minWidth: 0
      }
    }), ex.targetRepRange ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: "#8e8e93",
        whiteSpace: "nowrap"
      }
    }, (() => {
      const p = ex.targetRepRange.match(/^(\d+)\s*[-\u2013]\s*(\d+)$/);
      return p ? "in range = green" : "invalid format";
    })()) : null), /*#__PURE__*/React.createElement("div", {
      className: "sets-header"
    }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null, "WEIGHT LB"), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: "center"
      }
    }, "LB"), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: "center"
      }
    }, "REPS"), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: "center"
      }
    }, "REPS"), /*#__PURE__*/React.createElement("span", null)), ex.planTargetReps && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "6px 10px",
        marginBottom: 6,
        background: "rgba(0,194,255,0.04)",
        borderRadius: 6,
        fontSize: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#8e8e93",
        fontWeight: 600
      }
    }, "Target: ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#00c2ff",
        fontWeight: 800,
        fontFamily: "DM Mono,monospace"
      }
    }, ex.planTargetReps, " reps")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#ff3b30",
        fontWeight: 600
      }
    }, "· under"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#1a9e3f",
        fontWeight: 600
      }
    }, "· in range"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#00c2ff",
        fontWeight: 600
      }
    }, "· over"))), ex.sets.map((set, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("div", {
      className: "set-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "set-num"
    }, i + 1), /*#__PURE__*/React.createElement("div", {
      className: "set-input",
      style: {
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none"
      },
      onClick: () => {
        const pref = calcPrefs[ex.id];
        if (pref === "stack") return openStackCalc(ex.id, i, set.weight, ex.equipment);
        if (pref === "dumbbell") return openDumbbellPicker(ex.id, i, set.weight);
        if (pref === "plate") return openPlateCalc(ex.id, i, set.weight);
        if (pref === "mx100") return openMX100Picker(ex.id, i, set.weight);
        if (ex.calculator === "bodyweight") {
          setBwAdded(0);
          setBwSheetTarget({
            exId: ex.id,
            setIdx: i
          });
          return;
        }
        if (ex.equipment === "MX100 Barbell" || ex.equipment === "Adjustable Barbell") return openMX100Picker(ex.id, i, set.weight);
        if (EQUIPMENT_TO_MACHINE[ex.equipment]) openStackCalc(ex.id, i, set.weight, ex.equipment);else if (ex.equipment === "Dumbbells" || ex.equipment === "Adjustable Dumbbells" || ex.equipment === "Fixed Dumbbells") openDumbbellPicker(ex.id, i, set.weight);else openPlateCalc(ex.id, i, set.weight);
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: set.weight ? "#000" : "#c7c7cc"
      }
    }, set.weight || "0")), /*#__PURE__*/React.createElement("div", {
      className: "set-last"
    }, lastSets(ex.id)?.[i]?.weight || "—"), /*#__PURE__*/React.createElement("div", {
      className: "set-last"
    }, lastSets(ex.id)?.[i]?.reps || "—"), /*#__PURE__*/React.createElement("input", {
      className: "set-input",
      type: "number",
      inputMode: "numeric",
      placeholder: "",
      maxLength: 3,
      value: set.reps,
      style: (() => {
        const baseStyle = {
          textAlign: "center",
          padding: "6px 4px",
          fontSize: 16,
          fontWeight: 700
        };
        if (!set.targetRepsLow || !set.reps) return baseStyle;
        const r = parseInt(set.reps);
        if (isNaN(r) || r === 0) return baseStyle;
        if (r >= set.targetRepsLow && r <= set.targetRepsHigh) {
          return {
            ...baseStyle,
            borderColor: "#34c759",
            background: "#f0faf3",
            color: "#1a9e3f"
          };
        }
        if (r < set.targetRepsLow) {
          return {
            ...baseStyle,
            borderColor: "#ff3b30",
            background: "#fff5f5",
            color: "#ff3b30"
          };
        }
        // Above target range
        return {
          ...baseStyle,
          borderColor: "#00c2ff",
          background: "#f0f9ff",
          color: "#00c2ff"
        };
      })(),
      onChange: e => {
        const v = e.target.value.slice(0, 3);
        updateSet(ex.id, i, "reps", v);
      },
      onKeyDown: e => {
        if (e.key === "Enter") {
          e.preventDefault();
          const inputs = document.querySelectorAll(".set-input[type='number']");
          const idx = [...inputs].indexOf(e.target);
          if (idx >= 0 && idx < inputs.length - 1) inputs[idx + 1].focus();else e.target.blur();
        }
      }
    }), /*#__PURE__*/React.createElement("button", {
      key: `${ex.id}-${i}-${set.done ? "done" : "pending"}`,
      onClick: () => toggleDone(ex.id, i),
      className: set.done ? "set-done-bounce" : "",
      style: {
        width: 30,
        height: 30,
        borderRadius: "50%",
        flexShrink: 0,
        cursor: "pointer",
        border: set.done ? "none" : "2px solid #c7c7cc",
        background: set.done ? "#34c759" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        color: "#fff",
        fontWeight: 700,
        padding: 0,
        justifySelf: "end"
      }
    }, set.done ? "✓" : "")), (set.stackConfig?.band || set.plateBand) && /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: 30,
        marginTop: 2,
        marginBottom: 2,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(0,194,255,0.08)",
        border: "1px solid rgba(0,194,255,0.25)",
        borderRadius: 6,
        padding: "3px 8px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#00c2ff",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em"
      }
    }, "Band"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#000",
        fontWeight: 600
      }
    }, set.stackConfig?.band || set.plateBand)), (set.drops || []).map((drop, di) => /*#__PURE__*/React.createElement("div", {
      key: `drop-${di}`,
      style: {
        display: "grid",
        gridTemplateColumns: "18px minmax(52px,1.5fr) minmax(36px,1fr) minmax(36px,1fr) minmax(46px,1.2fr) 30px",
        gap: 6,
        alignItems: "center",
        marginLeft: 20,
        marginTop: 4,
        padding: "4px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: "#af52de",
        letterSpacing: "0.04em"
      }
    }, "↓", di + 1), /*#__PURE__*/React.createElement("input", {
      type: "number",
      inputMode: "decimal",
      placeholder: "wt",
      value: drop.weight,
      onChange: e => {
        setExercises(p => p.map(x => x.id !== ex.id ? x : {
          ...x,
          sets: x.sets.map((s, si) => si !== i ? s : {
            ...s,
            drops: s.drops.map((d, ddi) => ddi !== di ? d : {
              ...d,
              weight: e.target.value
            })
          })
        }));
      },
      style: {
        background: "#faf5ff",
        border: "1px solid #e0c9f5",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "DM Mono,monospace",
        textAlign: "center",
        color: "#000",
        outline: "none",
        width: "100%",
        boxSizing: "border-box"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#c7c7cc",
        textAlign: "center"
      }
    }, "—"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#c7c7cc",
        textAlign: "center"
      }
    }, "—"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      inputMode: "numeric",
      placeholder: "reps",
      maxLength: 3,
      value: drop.reps,
      onChange: e => {
        const v = e.target.value.slice(0, 3);
        setExercises(p => p.map(x => x.id !== ex.id ? x : {
          ...x,
          sets: x.sets.map((s, si) => si !== i ? s : {
            ...s,
            drops: s.drops.map((d, ddi) => ddi !== di ? d : {
              ...d,
              reps: v
            })
          })
        }));
      },
      style: {
        background: "#fff",
        border: "1px solid #e5e5ea",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "DM Mono,monospace",
        textAlign: "center",
        color: "#000",
        outline: "none",
        width: "100%",
        boxSizing: "border-box"
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setExercises(p => p.map(x => x.id !== ex.id ? x : {
          ...x,
          sets: x.sets.map((s, si) => si !== i ? s : {
            ...s,
            drops: s.drops.map((d, ddi) => ddi !== di ? d : {
              ...d,
              done: !d.done
            })
          })
        }));
        if (!drop.done) startRest();
      },
      style: {
        width: 22,
        height: 22,
        borderRadius: "50%",
        flexShrink: 0,
        cursor: "pointer",
        border: drop.done ? "none" : "2px solid #c7c7cc",
        background: drop.done ? "#af52de" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        color: "#fff",
        fontWeight: 700,
        justifySelf: "end",
        padding: 0
      }
    }, drop.done ? "✓" : ""))), set.done && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginLeft: 20,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        // Suggest 20% less than last weight
        const lastW = set.drops && set.drops.length > 0 ? parseFloat(set.drops[set.drops.length - 1].weight) : parseFloat(set.weight);
        const suggested = lastW ? Math.max(5, Math.round(lastW * 0.8 / 5) * 5) : "";
        setExercises(p => p.map(x => x.id !== ex.id ? x : {
          ...x,
          sets: x.sets.map((s, si) => si !== i ? s : {
            ...s,
            drops: [...(s.drops || []), {
              weight: String(suggested),
              reps: "",
              done: false
            }]
          })
        }));
      },
      style: {
        background: "transparent",
        border: "1px dashed #af52de",
        color: "#af52de",
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12
      }
    }, "↓"), " drop")))), /*#__PURE__*/React.createElement("button", {
      className: "add-set-btn",
      onClick: () => addSet(ex.id)
    }, "+ set"), restActive && /*#__PURE__*/React.createElement("div", {
      className: "card-rest-timer"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }
    }, "Rest"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        fontWeight: 800,
        fontFamily: "DM Mono,monospace",
        color: "#000",
        letterSpacing: "-1px"
      }
    }, fmtTime(restSeconds)), /*#__PURE__*/React.createElement("button", {
      onClick: skipRest,
      style: {
        background: "#000",
        color: "#fff",
        border: "none",
        borderRadius: 7,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        boxShadow: "0 0 0 1.5px #00c2ff"
      }
    }, "Skip")), /*#__PURE__*/React.createElement("textarea", {
      className: "exercise-notes",
      placeholder: "Notes for this exercise (saved permanently)...",
      value: exerciseNotes[ex.id] || "",
      onChange: e => setExerciseNotes(p => ({
        ...p,
        [ex.id]: e.target.value
      })),
      onClick: e => e.stopPropagation(),
      rows: 2
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 14
      }
    }, removeConfirm === ex.id ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        justifyContent: "center",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#ff3b30",
        fontWeight: 600
      }
    }, "Remove \"", ex.name, "\"?"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setExercises(p => p.filter(x => x.id !== ex.id));
        setRemoveConfirm(null);
        showToast(`Removed ${ex.name}`);
      },
      style: {
        background: "#ff3b30",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "4px 12px",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif"
      }
    }, "Yes, remove"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setRemoveConfirm(null),
      style: {
        background: "none",
        border: "1.5px solid #e5e5ea",
        color: "#8e8e93",
        borderRadius: 6,
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif"
      }
    }, "Cancel")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        if (ex.supersetGroup) {
          const groupToRemove = ex.supersetGroup;
          setExercises(p => p.map(x => x.supersetGroup === groupToRemove ? {
            ...x,
            supersetGroup: null,
            supersetPosition: null
          } : x));
          showToast(`Superset ${groupToRemove} unlinked`);
        } else {
          setSupersetPickerExId(ex.id);
        }
      },
      style: {
        background: "none",
        border: "none",
        color: ex.supersetGroup ? "#00c2ff" : "#c7c7cc",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        padding: "4px 8px",
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(Link, {
      size: 11,
      strokeWidth: 2.5
    }), ex.supersetGroup ? `Unlink superset ${ex.supersetGroup}` : "Link as superset"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setRemoveConfirm(ex.id),
      style: {
        background: "none",
        border: "none",
        color: "#c7c7cc",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        padding: "4px 8px"
      }
    }, "Remove exercise"))))));
  }), /*#__PURE__*/React.createElement("button", {
    className: "add-exercise-btn",
    onClick: openPicker
  }, "+ Add exercise"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 16
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1.5px solid #e5e5ea",
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: finishWorkout
  }, "Finish Workout"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setExercises([]);
      setWorkoutType(null);
      setWorkoutName("");
      setWorkoutStartTime(null);
      setWarmupDone(false);
      try {
        localStorage.removeItem("locked_workout_draft");
      } catch (e) {}
      setTab("freddy");
      showToast("Workout discarded");
    },
    style: {
      background: "none",
      border: "none",
      color: "#c7c7cc",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      textAlign: "center",
      width: "100%",
      padding: "4px 0"
    }
  }, "Discard workout"))), tab === "freddy" && false && (() => {
    const {
      year,
      month
    } = calMonth;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    // Build logged days map from history
    const loggedMap = {};
    history.forEach(h => {
      const d = new Date(h.id);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      loggedMap[key] = h;
    });

    // Calculate streak -- consecutive training days logged up to today
    let streak = 0;
    const checkDate = new Date(today);
    let streakIterations = 0;
    while (scheduleDays.length > 0 && streakIterations < 365) {
      streakIterations++;
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      const dayOfWeek = checkDate.getDay();
      const isTrainingDay = scheduleDays.includes(dayOfWeek);
      if (isTrainingDay) {
        if (loggedMap[key]) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Missed days = past training days with no workout logged
    const isMissed = date => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const t = new Date(today);
      t.setHours(0, 0, 0, 0);
      if (d >= t) return false; // not past
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return scheduleDays.includes(d.getDay()) && !loggedMap[key];
    };

    // Build calendar cells
    const cells = [];
    // Prev month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrev - i,
        currentMonth: false,
        date: new Date(year, month - 1, daysInPrev - i)
      });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        currentMonth: true,
        date: new Date(year, month, d)
      });
    }
    // Next month padding
    let next = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        day: next++,
        currentMonth: false,
        date: new Date(year, month + 1, next - 1)
      });
    }
    const selectedEntry = calSelected ? loggedMap[calSelected] : null;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16
      }
    }, streak > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg, #000 0%, #1a1a1a 100%)",
        borderRadius: 16,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 0 0 1.5px #ff9500, 0 0 20px rgba(255,149,0,0.25)"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "#ff9500",
        textTransform: "uppercase",
        letterSpacing: "0.08em"
      }
    }, "Streak"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        fontWeight: 800,
        color: "#fff",
        letterSpacing: "-1px",
        lineHeight: 1.1,
        marginTop: 2
      }
    }, streak, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "#8e8e93"
      }
    }, "day", streak !== 1 ? "s" : ""))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 42,
        filter: "drop-shadow(0 0 8px rgba(255,149,0,0.5))"
      }
    }, "🔥")), /*#__PURE__*/React.createElement("div", {
      className: "cal-nav"
    }, /*#__PURE__*/React.createElement("button", {
      className: "cal-nav-btn",
      onClick: () => setCalMonth(({
        year,
        month
      }) => month === 0 ? {
        year: year - 1,
        month: 11
      } : {
        year,
        month: month - 1
      })
    }, /*#__PURE__*/React.createElement(ChevronLeft, {
      size: 16,
      strokeWidth: 2.5,
      color: "#000"
    })), /*#__PURE__*/React.createElement("div", {
      className: "cal-month-label"
    }, monthNames[month], " ", year), /*#__PURE__*/React.createElement("button", {
      className: "cal-nav-btn",
      onClick: () => setCalMonth(({
        year,
        month
      }) => month === 11 ? {
        year: year + 1,
        month: 0
      } : {
        year,
        month: month + 1
      })
    }, /*#__PURE__*/React.createElement(ChevronRight, {
      size: 16,
      strokeWidth: 2.5,
      color: "#000"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 16,
        padding: "14px",
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "cal-grid",
      style: {
        marginBottom: 4
      }
    }, dayNames.map(d => /*#__PURE__*/React.createElement("div", {
      key: d,
      className: "cal-dow"
    }, d))), /*#__PURE__*/React.createElement("div", {
      className: "cal-grid"
    }, cells.map((cell, i) => {
      const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
      const isToday = key === todayStr;
      const isLogged = !!loggedMap[key];
      const isScheduled = scheduleDays.includes(cell.date.getDay());
      const isRecovery = !isScheduled && cell.currentMonth;
      const isCardio = cardioDays.includes(cell.date.getDay()) && cell.currentMonth;
      const isCardioDone = cardioLog[key] && cell.currentMonth;
      const isMissedDay = isMissed(cell.date) && cell.currentMonth;
      const isSelected = calSelected === key;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        className: `cal-day ${!cell.currentMonth ? "other-month" : ""} ${isLogged ? "logged" : ""} ${isMissedDay && !isLogged ? "missed" : ""} ${isScheduled && !isLogged && !isToday && !isMissedDay ? "scheduled" : ""} ${isRecovery && !isLogged && !isToday ? "recovery" : ""} ${isToday ? "today" : ""} ${isCardio && !isCardioDone ? "cardio" : ""} ${isCardioDone ? "cardio-done" : ""}`,
        style: isSelected ? {
          outline: "2.5px solid #7b5ea7",
          outlineOffset: 2
        } : {},
        onClick: () => {
          if (cell.currentMonth) setCalSelected(calSelected === key ? null : key);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "cal-day-num",
        style: {
          color: isToday ? "#fff" : isLogged ? "#fff" : isMissedDay ? "#ff3b30" : "#000"
        }
      }, cell.day), isLogged && /*#__PURE__*/React.createElement("div", {
        className: "cal-dot"
      }));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        justifyContent: "center",
        flexWrap: "wrap",
        background: "#fff",
        borderRadius: 12,
        border: "1.5px solid #e5e5ea",
        padding: "8px 12px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: "#5a8f6e"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#000",
        fontWeight: 600
      }
    }, "Logged")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: "#ff3b30"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#000",
        fontWeight: 600
      }
    }, "Missed")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        border: "1.5px solid #00c2ff"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#8e8e93",
        fontWeight: 600
      }
    }, "Training")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: "#8a63d2"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#8e8e93",
        fontWeight: 600
      }
    }, "Cardio")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: "#000"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#8e8e93",
        fontWeight: 600
      }
    }, "Today"))), calSelected && /*#__PURE__*/React.createElement("div", {
      className: "cal-detail"
    }, selectedEntry ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "cal-detail-date"
    }, new Date(selectedEntry.id).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    })), /*#__PURE__*/React.createElement("div", {
      className: "cal-detail-name"
    }, selectedEntry.type), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        margin: "8px 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "stat"
    }, /*#__PURE__*/React.createElement("div", {
      className: "stat-val"
    }, selectedEntry.exercises.length), /*#__PURE__*/React.createElement("div", {
      className: "stat-key"
    }, "exercises")), /*#__PURE__*/React.createElement("div", {
      className: "stat"
    }, /*#__PURE__*/React.createElement("div", {
      className: "stat-val"
    }, selectedEntry.exercises.reduce((n, e) => n + e.sets.length, 0)), /*#__PURE__*/React.createElement("div", {
      className: "stat-key"
    }, "sets")), /*#__PURE__*/React.createElement("div", {
      className: "stat"
    }, /*#__PURE__*/React.createElement("div", {
      className: "stat-val"
    }, Math.round(selectedEntry.volume).toLocaleString()), /*#__PURE__*/React.createElement("div", {
      className: "stat-key"
    }, "lb volume"))), /*#__PURE__*/React.createElement("div", {
      className: "cal-detail-exlist"
    }, selectedEntry.exercises.map(e => e.name).join(" . ")), selectedEntry.note && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        padding: "10px 12px",
        background: "rgba(0,194,255,0.06)",
        border: "1px solid rgba(0,194,255,0.2)",
        borderRadius: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: "#00c2ff",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 4
      }
    }, "Session Note"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#000",
        lineHeight: 1.5,
        fontStyle: "italic"
      }
    }, "\"", selectedEntry.note, "\""))) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#8e8e93",
        textAlign: "center",
        padding: "8px 0"
      }
    }, scheduleDays.includes(new Date(...calSelected.split("-").map(Number)).getDay()) ? "📅 Training day -- no workout logged yet" : "🟢 Recovery day -- full rest, no weight training"), cardioDays.includes(new Date(...calSelected.split("-").map(Number)).getDay()) && /*#__PURE__*/React.createElement("button", {
      onClick: () => setCardioLog(prev => ({
        ...prev,
        [calSelected]: !prev[calSelected]
      })),
      style: {
        marginTop: 12,
        width: "100%",
        padding: "10px",
        borderRadius: 10,
        border: `1.5px solid ${cardioLog[calSelected] ? "#8a63d2" : "#e5e5ea"}`,
        background: cardioLog[calSelected] ? "#f1ecfb" : "#fff",
        color: cardioLog[calSelected] ? "#8a63d2" : "#8e8e93",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "all 0.15s"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: cardioLog[calSelected] ? "#8a63d2" : "#c7c7cc"
      }
    }), cardioLog[calSelected] ? "Cardio completed check" : "Mark cardio done")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 14,
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setScheduleOpen(!scheduleOpen),
      style: {
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#000"
      }
    }, "Schedule"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginTop: 2
      }
    }, scheduleDays.length, " training · ", cardioDays.length, " cardio days/week")), /*#__PURE__*/React.createElement(ChevronDown, {
      size: 16,
      strokeWidth: 2.5,
      color: "#00c2ff",
      style: {
        transform: scheduleOpen ? "rotate(180deg)" : "none",
        transition: "transform 0.2s"
      }
    })), scheduleOpen && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 16px 14px",
        borderTop: "1px solid #F0F0F0"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "section-label",
      style: {
        marginBottom: 6,
        marginTop: 0
      }
    }, "Training days"), /*#__PURE__*/React.createElement("div", {
      className: "schedule-grid"
    }, dayNames.map((name, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `schedule-day-btn ${scheduleDays.includes(i) ? "on" : ""}`,
      onClick: e => {
        e.stopPropagation();
        setScheduleDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "schedule-day-label"
    }, name))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "section-label",
      style: {
        marginBottom: 6,
        marginTop: 0
      }
    }, "Cardio days"), /*#__PURE__*/React.createElement("div", {
      className: "schedule-grid"
    }, dayNames.map((name, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: e => {
        e.stopPropagation();
        setCardioDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);
      },
      style: {
        aspectRatio: "1",
        borderRadius: 10,
        border: cardioDays.includes(i) ? "2px solid #8a63d2" : "1.5px solid #e5e5ea",
        background: cardioDays.includes(i) ? "#f1ecfb" : "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.15s",
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: cardioDays.includes(i) ? "#8a63d2" : "#8e8e93",
        letterSpacing: "0.04em"
      }
    }, name))))))), activePlan && (() => {
      const plan = PLAN_TEMPLATES.find(p => p.id === activePlan.planId);
      if (!plan) return null;
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "4px 4px 0",
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: "#8e8e93",
          letterSpacing: "0.05em",
          textTransform: "uppercase"
        }
      }, "Schedule from"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 800,
          color: "#00c2ff"
        }
      }, plan.name)), /*#__PURE__*/React.createElement(PlanScheduleView, {
        plan: plan,
        activePlan: activePlan,
        scheduleDays: scheduleDays,
        cardioDays: cardioDays,
        history: history
      }));
    })());
  })(), tab === "activity" && /*#__PURE__*/React.createElement(React.Fragment, null, history.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("div", {
    className: "empty-icon"
  }, /*#__PURE__*/React.createElement(ClipboardList, {
    size: 36,
    strokeWidth: 1.5,
    color: "#c7c7cc"
  })), "Finish your first workout", /*#__PURE__*/React.createElement("br", null), "and it'll appear here.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(WeeklyStats, {
    history: history
  }), /*#__PURE__*/React.createElement(PRsPanel, {
    history: history,
    onOpenChart: setProgressChartExId
  }), /*#__PURE__*/React.createElement(MuscleIntelligence, {
    history: history
  }), (() => {
    // Group by month-year
    const grouped = {};
    [...history].reverse().forEach(entry => {
      // Parse the date -- entry.date is a display string like "Wed, Jul 15"
      // Better: use entry.id timestamp or entry.dateISO if available
      let d;
      if (entry.dateISO) d = new Date(entry.dateISO);else if (typeof entry.id === "number") d = new Date(entry.id);else d = new Date(entry.date + ", " + new Date().getFullYear());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      });
      if (!grouped[key]) grouped[key] = {
        label,
        entries: [],
        sortKey: key
      };
      grouped[key].entries.push(entry);
    });
    const groups = Object.values(grouped).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return groups.map(g => {
      const isOpen = historyMonthOpen[g.sortKey] === true; // default closed
      return /*#__PURE__*/React.createElement("div", {
        key: g.sortKey,
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("div", {
        onClick: () => setHistoryMonthOpen(p => ({
          ...p,
          [g.sortKey]: !isOpen
        })),
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          padding: "10px 14px",
          background: "#fff",
          borderRadius: 12,
          border: "1.5px solid #e5e5ea",
          marginBottom: isOpen ? 8 : 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 800,
          color: "#000"
        }
      }, g.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: "#8e8e93",
          padding: "2px 8px",
          background: "#F0F0F0",
          borderRadius: 10
        }
      }, g.entries.length, " workout", g.entries.length !== 1 ? "s" : "")), /*#__PURE__*/React.createElement(ChevronDown, {
        size: 16,
        strokeWidth: 2.5,
        color: "#00c2ff",
        style: {
          transform: isOpen ? "rotate(180deg)" : "none",
          transition: "transform 0.2s"
        }
      })), isOpen && g.entries.map(entry => /*#__PURE__*/React.createElement("div", {
        key: entry.id,
        className: "history-card",
        "data-history-id": entry.id,
        style: highlightHistoryId === entry.id ? {
          border: "2px solid #00c2ff",
          boxShadow: "0 0 0 4px rgba(0,194,255,0.15), 0 0 20px rgba(0,194,255,0.3)",
          transition: "box-shadow 0.4s"
        } : {
          transition: "box-shadow 0.4s"
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "history-top"
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        className: "history-type"
      }, entry.type), entry.timeOfDay && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#8e8e93",
          marginTop: 2,
          display: "flex",
          alignItems: "center",
          gap: 4
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          background: "#F0F0F0",
          borderRadius: 5,
          padding: "1px 6px",
          fontWeight: 600
        }
      }, entry.timeLabel), /*#__PURE__*/React.createElement("span", null, entry.timeOfDay))), /*#__PURE__*/React.createElement("div", {
        className: "history-date"
      }, entry.date)), /*#__PURE__*/React.createElement("div", {
        className: "history-stats"
      }, /*#__PURE__*/React.createElement("div", {
        className: "stat"
      }, /*#__PURE__*/React.createElement("div", {
        className: "stat-val"
      }, entry.exercises.length), /*#__PURE__*/React.createElement("div", {
        className: "stat-key"
      }, "exercises")), /*#__PURE__*/React.createElement("div", {
        className: "stat"
      }, /*#__PURE__*/React.createElement("div", {
        className: "stat-val"
      }, entry.exercises.reduce((n, e) => n + e.sets.length, 0)), /*#__PURE__*/React.createElement("div", {
        className: "stat-key"
      }, "total sets")), /*#__PURE__*/React.createElement("div", {
        className: "stat"
      }, /*#__PURE__*/React.createElement("div", {
        className: "stat-val"
      }, Math.round(entry.volume).toLocaleString()), /*#__PURE__*/React.createElement("div", {
        className: "stat-key"
      }, "lbs moved")), entry.duration && /*#__PURE__*/React.createElement("div", {
        className: "stat"
      }, /*#__PURE__*/React.createElement("div", {
        className: "stat-val"
      }, fmtDuration(entry.duration)), /*#__PURE__*/React.createElement("div", {
        className: "stat-key"
      }, "duration"))), /*#__PURE__*/React.createElement("div", {
        className: "history-exlist"
      }, entry.exercises.map(e => e.name).join(" . ")), /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 8,
          padding: "8px 10px",
          background: entry.note ? "rgba(0,194,255,0.05)" : "transparent",
          borderRadius: 8,
          border: entry.note ? "1px solid rgba(0,194,255,0.15)" : "1px dashed #e5e5ea"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          fontWeight: 700,
          color: "#8e8e93",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 4
        }
      }, "Session Note"), /*#__PURE__*/React.createElement("textarea", {
        value: entry.note || "",
        onChange: e => {
          const newNote = e.target.value;
          setHistory(p => p.map(h => h.id === entry.id ? {
            ...h,
            note: newNote.trim() || null
          } : h));
        },
        placeholder: "Add a note about how this session felt...",
        rows: entry.note ? Math.min(3, Math.ceil(entry.note.length / 50)) : 1,
        style: {
          width: "100%",
          border: "none",
          background: "transparent",
          fontSize: 12,
          fontFamily: "Inter,sans-serif",
          resize: "none",
          outline: "none",
          color: "#000",
          padding: 0,
          fontStyle: entry.note ? "normal" : "italic",
          boxSizing: "border-box"
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          borderTop: "1px solid #F0F0F0",
          paddingTop: 10,
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setHistory(p => p.filter(h => h.id !== entry.id)),
        style: {
          fontSize: 11,
          color: "#ff3b30",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "Inter,sans-serif",
          fontWeight: 600
        }
      }, "Delete"), /*#__PURE__*/React.createElement("button", {
        className: "export-btn-sm",
        onClick: () => showToast("^ Sent to Google Health")
      }, "Export"))))));
    });
  })())), tab === "library" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "section-label"
  }, "Exercise Library"), /*#__PURE__*/React.createElement("div", {
    onClick: () => setLibraryOpen(true),
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #00c2ff",
      padding: "14px 16px",
      cursor: "pointer",
      boxShadow: "0 0 0 1px #00c2ff, 0 0 12px rgba(0,194,255,0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#000"
    }
  }, "Browse all exercises"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 2
    }
  }, EXERCISE_DB.length, " exercises · muscle heads · equipment · variations")), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 16,
    strokeWidth: 2.5,
    color: "#00c2ff",
    style: {
      transform: "rotate(-90deg)"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "section-label"
  }, "My Preferences"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #e5e5ea",
      padding: "12px 16px",
      marginBottom: 10,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "#8e8e93",
      marginBottom: 10
    }
  }, "BODY & EQUIPMENT"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#000"
    }
  }, "Body Weight"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "Used for pull-up volume tracking")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: bodyWeight,
    onChange: e => setBodyWeight(parseFloat(e.target.value) || 0),
    style: {
      width: 64,
      padding: "6px 8px",
      borderRadius: 8,
      border: "1.5px solid #e5e5ea",
      fontSize: 14,
      fontFamily: "DM Mono,monospace",
      fontWeight: 700,
      textAlign: "center",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "lb"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#000"
    }
  }, "Smith Machine Bar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "Counterbalanced bars are typically 15-20 lbs")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: smithBarWeight,
    onChange: e => setSmithBarWeight(parseFloat(e.target.value) || 0),
    style: {
      width: 64,
      padding: "6px 8px",
      borderRadius: 8,
      border: "1.5px solid #e5e5ea",
      fontSize: 14,
      fontFamily: "DM Mono,monospace",
      fontWeight: 700,
      textAlign: "center",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "lb")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #e5e5ea",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 16px",
      fontSize: 12,
      color: "#8e8e93",
      borderBottom: "1px solid #e5e5ea",
      fontWeight: 600
    }
  }, "Set permanent exercise swaps -- these load automatically in every workout"), Object.entries(ALTERNATIVES).filter(([from]) => EXERCISES.find(e => e.id === from)).map(([from, to]) => {
    const fromEx = EXERCISES.find(e => e.id === from);
    const toEx = EXERCISES.find(e => e.id === to);
    if (!fromEx || !toEx) return null;
    const isPref = preferences[from] === to;
    return /*#__PURE__*/React.createElement("div", {
      key: from,
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid #F0F0F0",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "#000"
      }
    }, fromEx.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginTop: 2
      }
    }, '->', " ", toEx.name)), /*#__PURE__*/React.createElement("button", {
      onClick: () => togglePref(from, to),
      style: {
        flexShrink: 0,
        padding: "6px 14px",
        borderRadius: 20,
        border: "none",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        background: isPref ? "#00c2ff" : "#e5e5ea",
        color: isPref ? "#fff" : "#8e8e93",
        boxShadow: isPref ? "0 0 0 1.5px #00c2ff, 0 0 10px rgba(0,194,255,0.3)" : "none",
        transition: "all 0.15s"
      }
    }, isPref ? "Always use check" : "Always use"));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "section-label"
  }, "Your equipment -- tap type to edit"), /*#__PURE__*/React.createElement("div", {
    className: "equip-list"
  }, EQUIPMENT_LIST.map(e => /*#__PURE__*/React.createElement("div", {
    key: e,
    className: "equip-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "equip-name"
  }, e), /*#__PURE__*/React.createElement("div", {
    className: "equip-type-pill",
    onClick: () => setEquipEditTarget(e)
  }, equipConfig[e] || "Tap to set", " ", '>')))), /*#__PURE__*/React.createElement("div", {
    className: "section-label"
  }, "Exercise library (", EXERCISES.length, " movements)"), gymGroups.map(({
    group,
    exs
  }) => /*#__PURE__*/React.createElement("div", {
    key: group
  }, /*#__PURE__*/React.createElement("div", {
    className: "ex-group-title"
  }, group, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#8e8e93",
      fontWeight: 400,
      fontSize: 11
    }
  }, "(", exs.length, ")")), exs.map(ex => /*#__PURE__*/React.createElement("div", {
    key: ex.id,
    className: "ex-row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", null, ex.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#00c2ff",
      marginTop: 2
    }
  }, ex.equipment)), /*#__PURE__*/React.createElement("div", {
    className: "ex-row-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ex-row-muscle"
  }, ex.primaryMuscle)))))), /*#__PURE__*/React.createElement("div", {
    className: "section-label",
    style: {
      marginTop: 24
    }
  }, "Cable Attachment Preferences"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #e5e5ea",
      padding: "14px 16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      lineHeight: 1.5,
      marginBottom: 12
    }
  }, "Your preferred attachment per cable exercise. Set once in-session — saves here automatically. Tap any to change."), EXERCISE_DB.filter(e => e.equipment === "Cable Machine").map(ex => {
    const att = getAttachment(ex.id);
    const isDefault = !attachmentPrefs[ex.id];
    return /*#__PURE__*/React.createElement("div", {
      key: ex.id,
      onClick: () => setAttachmentSheetExId(ex.id),
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #f5f5f5",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "#000",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, ex.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93"
      }
    }, ex.muscleHead)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        marginLeft: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: isDefault ? "#c7c7cc" : "#ff9f0a",
        padding: "2px 8px",
        background: isDefault ? "#f5f5f5" : "rgba(255,159,10,0.1)",
        borderRadius: 6
      }
    }, att?.name || "—"), /*#__PURE__*/React.createElement(ChevronDown, {
      size: 12,
      strokeWidth: 2.5,
      color: "#c7c7cc",
      style: {
        transform: "rotate(-90deg)"
      }
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "section-label",
    style: {
      marginTop: 24
    }
  }, "Backup & Restore"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1.5px solid #e5e5ea",
      padding: "14px 16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      lineHeight: 1.5,
      marginBottom: 12
    }
  }, "Export all your data (history, workouts, preferences, equipment) to a JSON file. Save it anywhere -- Google Drive, email, etc. Import to restore."), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const LOCKED_KEYS = ["locked_history", "locked_schedule", "locked_cardio_days", "locked_cardio_log", "locked_recovery", "locked_saved_workouts", "locked_preferences", "locked_custom_exercises", "locked_exercise_notes", "locked_bodyweight", "locked_smith_bar", "locked_equip_config", "locked_calc_prefs", "locked_attachment_prefs", "locked_active_plan"];
      const backup = {
        app: "Locked",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        data: {}
      };
      LOCKED_KEYS.forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw !== null) {
          try {
            backup.data[k] = JSON.parse(raw);
          } catch {
            backup.data[k] = raw;
          }
        }
      });
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `locked-backup-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Backup downloaded");
    },
    style: {
      width: "100%",
      padding: "12px",
      background: "#000",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      boxShadow: "0 0 0 2px #00c2ff, 0 0 12px rgba(0,194,255,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Download, {
    size: 15,
    strokeWidth: 2.5,
    color: "#00c2ff"
  }), " Export backup (JSON)"), /*#__PURE__*/React.createElement("label", {
    style: {
      width: "100%",
      padding: "12px",
      background: "#fff",
      color: "#000",
      border: "1.5px solid #e5e5ea",
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Upload, {
    size: 15,
    strokeWidth: 2.5,
    color: "#000"
  }), " Import backup", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".json,application/json",
    style: {
      display: "none"
    },
    onChange: e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const backup = JSON.parse(ev.target.result);
          if (!backup.data || typeof backup.data !== "object") {
            showToast("Invalid backup file");
            return;
          }
          const keys = Object.keys(backup.data);
          if (keys.length === 0) {
            showToast("Backup is empty");
            return;
          }
          if (!window.confirm(`Import will REPLACE all current data with ${keys.length} keys from the backup.\n\nExported: ${backup.exportedAt || "unknown date"}\n\nContinue?`)) return;
          keys.forEach(k => {
            localStorage.setItem(k, typeof backup.data[k] === "string" ? backup.data[k] : JSON.stringify(backup.data[k]));
          });
          showToast("Backup restored -- reloading app...");
          setTimeout(() => window.location.reload(), 1200);
        } catch (err) {
          showToast("Could not read file");
          console.error(err);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#c7c7cc",
      marginTop: 10,
      textAlign: "center",
      lineHeight: 1.4
    }
  }, "Import replaces all current data. Export first if you want to keep it."))), tab === "mi" && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 320,
      gap: 16,
      paddingTop: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: "50%",
      background: "#f2f2f7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Target, {
    size: 32,
    strokeWidth: 1.5,
    color: "#af52de"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      color: "#1c1c1e",
      fontFamily: "Inter,sans-serif"
    }
  }, "M.I. — Muscle Intelligence"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#8e8e93",
      marginTop: 6,
      fontFamily: "Inter,sans-serif",
      maxWidth: 260,
      lineHeight: 1.5
    }
  }, "Recovery wheel, volume tracker, PR history & AI suggestions — coming in Phase 3")), /*#__PURE__*/React.createElement("button", {
    style: {
      padding: "12px 24px",
      borderRadius: 12,
      background: "#af52de",
      color: "#fff",
      border: "none",
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "Inter,sans-serif",
      cursor: "pointer"
    },
    onClick: () => setPlusSheetOpen(true)
  }, "Start a Workout"))), plansBrowseOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "#F0F0F0",
      zIndex: 1900,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      padding: "14px 16px",
      borderBottom: "1px solid #e5e5ea",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlansBrowseOpen(false),
    style: {
      background: "none",
      border: "none",
      fontSize: 22,
      color: "#00c2ff",
      cursor: "pointer",
      padding: 0,
      fontWeight: 400,
      lineHeight: 1
    }
  }, "‹"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: "#000"
    }
  }, "Workout Plans"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93",
      marginTop: 1
    }
  }, "Structured programs with progression built in"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "14px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, PLAN_TEMPLATES.map(plan => /*#__PURE__*/React.createElement("div", {
    key: plan.id,
    onClick: () => setPlanDetailId(plan.id),
    style: {
      background: "#fff",
      borderRadius: 16,
      padding: "16px",
      border: "1.5px solid #e5e5ea",
      cursor: "pointer",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 800,
      color: "#000"
    }
  }, plan.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      marginTop: 2
    }
  }, plan.fullName)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#00c2ff",
      padding: "3px 8px",
      background: "rgba(0,194,255,0.1)",
      borderRadius: 10,
      whiteSpace: "nowrap",
      flexShrink: 0
    }
  }, plan.goalLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#000",
      padding: "3px 8px",
      background: "#F0F0F0",
      borderRadius: 8
    }
  }, plan.duration, " weeks"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#000",
      padding: "3px 8px",
      background: "#F0F0F0",
      borderRadius: 8
    }
  }, plan.daysPerWeek, " days/week"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#000",
      padding: "3px 8px",
      background: "#F0F0F0",
      borderRadius: 8
    }
  }, plan.level)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      lineHeight: 1.5
    }
  }, plan.description), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#00c2ff",
      fontWeight: 700,
      marginTop: 10,
      textAlign: "right"
    }
  }, "View details ›"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#c7c7cc",
      textAlign: "center",
      padding: "14px 0"
    }
  }, "More plans coming soon"))), planDetailId && (() => {
    const plan = PLAN_TEMPLATES.find(p => p.id === planDetailId);
    if (!plan) return null;
    const canStart = !activePlan;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "#F0F0F0",
        zIndex: 1950,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        padding: "14px 16px",
        borderBottom: "1px solid #e5e5ea",
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setPlanDetailId(null),
      style: {
        background: "none",
        border: "none",
        fontSize: 22,
        color: "#00c2ff",
        cursor: "pointer",
        padding: 0,
        fontWeight: 400,
        lineHeight: 1
      }
    }, "‹"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 800,
        color: "#000"
      }
    }, plan.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginTop: 1
      }
    }, plan.fullName))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 100
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginBottom: 10,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        padding: "4px 10px",
        background: "#000",
        borderRadius: 8
      }
    }, plan.goalLabel), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#000",
        padding: "4px 10px",
        background: "#F0F0F0",
        borderRadius: 8
      }
    }, plan.duration, " weeks"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#000",
        padding: "4px 10px",
        background: "#F0F0F0",
        borderRadius: 8
      }
    }, plan.daysPerWeek, " days/week"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#000",
        padding: "4px 10px",
        background: "#F0F0F0",
        borderRadius: 8
      }
    }, plan.level)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#000",
        lineHeight: 1.55,
        marginBottom: 8
      }
    }, plan.description), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        fontStyle: "italic"
      }
    }, "Created by ", plan.author, " · ", plan.levelDetail)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 8
      }
    }, "Key Principles"), plan.principles.map((p, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 8,
        fontSize: 12,
        color: "#000",
        lineHeight: 1.5,
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#00c2ff",
        fontWeight: 700
      }
    }, "·"), /*#__PURE__*/React.createElement("span", null, p)))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 10
      }
    }, "Weekly Structure"), plan.days.map((day, di) => /*#__PURE__*/React.createElement("div", {
      key: day.id,
      style: {
        padding: "10px 0",
        borderTop: di > 0 ? "1px solid #F0F0F0" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#000"
      }
    }, "Day ", di + 1, ": ", day.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: day.focus === "Strength" ? "#ff3b30" : "#00c2ff",
        padding: "2px 8px",
        background: day.focus === "Strength" ? "rgba(255,59,48,0.08)" : "rgba(0,194,255,0.08)",
        borderRadius: 8
      }
    }, day.focus)), day.exercises.map((ex, ei) => {
      const exData = EXERCISE_DB.find(e => e.id === ex.id);
      if (!exData) return null;
      return /*#__PURE__*/React.createElement("div", {
        key: ei,
        style: {
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 0",
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#000"
        }
      }, ex.isMainLift && /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#00c2ff",
          marginRight: 4,
          fontWeight: 700
        }
      }, "★"), exData.name), /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#8e8e93",
          fontFamily: "DM Mono,monospace",
          fontWeight: 700
        }
      }, ex.sets, " × ", ex.repsLow, "-", ex.repsHigh));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#8e8e93",
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid #F0F0F0"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#00c2ff",
        fontWeight: 700
      }
    }, "★"), " = main lift (locked). Others swappable.")), /*#__PURE__*/React.createElement(PlanScheduleView, {
      plan: plan,
      activePlan: activePlan && activePlan.planId === plan.id ? activePlan : null,
      scheduleDays: scheduleDays,
      cardioDays: cardioDays,
      history: history
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 6
      }
    }, "Progression"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#000",
        marginBottom: 6
      }
    }, plan.progression.summary), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#000",
        lineHeight: 1.5
      }
    }, plan.progression.detail), plan.deload && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        padding: "10px 12px",
        background: "#f9f9f9",
        borderRadius: 8,
        fontSize: 11,
        color: "#8e8e93",
        lineHeight: 1.4
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: "#000"
      }
    }, "Deload:"), " ", plan.deload.note)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        border: "1.5px solid #e5e5ea",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 8
      }
    }, "Sources"), plan.sources.map((s, i) => /*#__PURE__*/React.createElement("a", {
      key: i,
      href: s.url,
      target: "_blank",
      rel: "noopener noreferrer",
      style: {
        display: "block",
        fontSize: 12,
        color: "#00c2ff",
        padding: "4px 0",
        textDecoration: "none"
      }
    }, "→ ", s.label)))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        padding: "12px 16px",
        borderTop: "1px solid #e5e5ea",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.05)"
      }
    }, canStart ? /*#__PURE__*/React.createElement("button", {
      onClick: () => startPlan(plan.id),
      style: {
        width: "100%",
        padding: "14px",
        background: "#000",
        color: "#fff",
        border: "none",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        boxShadow: "0 0 0 2px #00c2ff, 0 0 16px rgba(0,194,255,0.3)",
        letterSpacing: "0.02em"
      }
    }, "Start This Plan") : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#8e8e93",
        textAlign: "center",
        padding: "8px"
      }
    }, "You already have an active plan. End it from the Active Plan card on your dashboard to start a new one.")));
  })(), progressChartExId && /*#__PURE__*/React.createElement(ProgressChartModal, {
    exerciseId: progressChartExId,
    history: history,
    onClose: () => setProgressChartExId(null)
  }), supersetPickerExId && (() => {
    const currentEx = exercises.find(x => x.id === supersetPickerExId);
    const candidates = exercises.filter(x => x.id !== supersetPickerExId && !x.supersetGroup);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      },
      onClick: () => setSupersetPickerExId(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        width: "100%",
        maxWidth: 700,
        borderRadius: "20px 20px 0 0",
        padding: "18px 16px 24px",
        maxHeight: "70vh",
        overflowY: "auto"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        background: "#e5e5ea",
        borderRadius: 2,
        margin: "0 auto 14px"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "#000",
        marginBottom: 4
      }
    }, "Link \"", currentEx?.name, "\" with..."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginBottom: 14
      }
    }, "Both exercises will be grouped as a superset. Do each set of both back-to-back with minimal rest between."), candidates.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "20px",
        textAlign: "center",
        fontSize: 13,
        color: "#8e8e93"
      }
    }, "No other unlinked exercises in this workout. Add another exercise first.") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, candidates.map(cand => /*#__PURE__*/React.createElement("div", {
      key: cand.id,
      onClick: () => {
        // Find next available group letter
        const usedGroups = new Set(exercises.map(x => x.supersetGroup).filter(Boolean));
        let groupLetter = "A";
        while (usedGroups.has(groupLetter)) {
          groupLetter = String.fromCharCode(groupLetter.charCodeAt(0) + 1);
        }
        setExercises(p => p.map(x => {
          if (x.id === supersetPickerExId) return {
            ...x,
            supersetGroup: groupLetter,
            supersetPosition: 1
          };
          if (x.id === cand.id) return {
            ...x,
            supersetGroup: groupLetter,
            supersetPosition: 2
          };
          return x;
        }));
        showToast(`Superset ${groupLetter} created`);
        setSupersetPickerExId(null);
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        background: "#fafafa",
        borderRadius: 10,
        cursor: "pointer",
        border: "1px solid #f0f0f0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#000"
      }
    }, cand.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93",
        marginTop: 1
      }
    }, cand.muscleHead || cand.muscle)), /*#__PURE__*/React.createElement(Link, {
      size: 14,
      strokeWidth: 2.5,
      color: "#00c2ff"
    })))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSupersetPickerExId(null),
      style: {
        width: "100%",
        padding: "10px",
        background: "#F0F0F0",
        color: "#8e8e93",
        border: "none",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        marginTop: 12
      }
    }, "Cancel")));
  })(), attachmentSheetExId && (() => {
    const ex = exercises.find(e => e.id === attachmentSheetExId);
    if (!ex) return null;
    const baseId = (ex.baseId || ex.id).split("-v")[0];
    const currentAtt = getAttachment(baseId);
    const isDefault = !attachmentPrefs[baseId];
    const categories = [...new Set(CABLE_ATTACHMENTS.map(a => a.category))];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 250,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      },
      onClick: () => setAttachmentSheetExId(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#F0F0F0",
        borderRadius: "24px 24px 0 0",
        width: "100%",
        maxWidth: 700,
        maxHeight: "88vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 5,
        background: "#c7c7cc",
        borderRadius: 3,
        margin: "12px auto 8px",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 20px 12px",
        borderBottom: "1px solid #e5e5ea",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: "#000"
      }
    }, "Attachment"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#8e8e93",
        marginTop: 2
      }
    }, ex.name, " · your preference saves permanently"), currentAtt && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: "#ff9f0a",
        padding: "2px 8px",
        background: "rgba(255,159,10,0.12)",
        borderRadius: 6
      }
    }, isDefault ? "App default" : "Your preference", ": ", currentAtt.name), !isDefault && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setAttachmentPrefs(p => {
          const n = {
            ...p
          };
          delete n[baseId];
          return n;
        });
        showToast("Reset to default");
      },
      style: {
        fontSize: 10,
        color: "#8e8e93",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        fontWeight: 600
      }
    }, "Reset"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "8px 14px 32px"
      }
    }, categories.map(cat => {
      const atts = CABLE_ATTACHMENTS.filter(a => a.category === cat);
      return /*#__PURE__*/React.createElement("div", {
        key: cat
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: "#c7c7cc",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          padding: "10px 4px 4px"
        }
      }, cat), atts.map(att => {
        const selected = currentAtt?.id === att.id;
        return /*#__PURE__*/React.createElement("div", {
          key: att.id,
          onClick: () => {
            setAttachmentPref(baseId, att.id);
            setAttachmentSheetExId(null);
            showToast(`check ${ex.name} → ${att.name}`);
          },
          style: {
            background: "#fff",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 6,
            border: selected ? "2px solid #ff9f0a" : "1.5px solid #e5e5ea",
            boxShadow: selected ? "0 0 0 1px #ff9f0a, 0 0 12px rgba(255,159,10,0.15)" : "0 1px 3px rgba(0,0,0,0.06)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            flex: 1,
            minWidth: 0
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 14,
            fontWeight: 700,
            color: "#000"
          }
        }, att.name), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: "#8e8e93",
            marginTop: 2
          }
        }, att.note)), selected && /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: "#ff9f0a",
            fontWeight: 700,
            padding: "2px 8px",
            background: "rgba(255,159,10,0.1)",
            borderRadius: 6,
            flexShrink: 0
          }
        }, "✓ Active"));
      }));
    }))));
  })(), bwSheetTarget && (() => {
    const ex = exercises.find(e => e.id === bwSheetTarget.exId);
    const total = bodyWeight + bwAdded;
    const addOptions = [0, 10, 25, 35, 45, 55, 65];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 150,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      },
      onClick: () => setBwSheetTarget(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#F0F0F0",
        borderRadius: "24px 24px 0 0",
        width: "100%",
        maxWidth: 700,
        padding: "0 0 32px"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 5,
        background: "#c7c7cc",
        borderRadius: 3,
        margin: "12px auto 16px"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 20px 16px",
        borderBottom: "1px solid #e5e5ea"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: "#000"
      }
    }, "Bodyweight"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#8e8e93",
        marginTop: 2
      }
    }, ex?.name)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px 20px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "#000"
      }
    }, "Your body weight"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: bodyWeight,
      onChange: e => setBodyWeight(parseFloat(e.target.value) || 0),
      style: {
        width: 72,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1.5px solid #e5e5ea",
        fontSize: 16,
        fontFamily: "DM Mono,monospace",
        fontWeight: 700,
        textAlign: "center",
        outline: "none",
        background: "#fff"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "#8e8e93"
      }
    }, "lb"))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#8e8e93",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 8
      }
    }, "Added weight (vest / belt / dumbbell)"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
      }
    }, addOptions.map(w => /*#__PURE__*/React.createElement("button", {
      key: w,
      onClick: () => setBwAdded(w),
      style: {
        padding: "8px 14px",
        borderRadius: 10,
        border: "none",
        background: bwAdded === w ? "#000" : "#fff",
        color: bwAdded === w ? "#00c2ff" : "#000",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "DM Mono,monospace",
        boxShadow: bwAdded === w ? "0 0 0 1.5px #00c2ff" : "0 1px 3px rgba(0,0,0,0.08)",
        cursor: "pointer"
      }
    }, w === 0 ? "None" : `+${w}`)))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 16,
        border: "1.5px solid #e5e5ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: "#8e8e93"
      }
    }, "Total logged"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 28,
        fontWeight: 800,
        fontFamily: "DM Mono,monospace",
        color: "#000"
      }
    }, total, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "#8e8e93",
        marginLeft: 4
      }
    }, "lb"))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const {
          exId,
          setIdx
        } = bwSheetTarget;
        setExercises(p => p.map(x => x.id !== exId ? x : {
          ...x,
          sets: x.sets.map((s, i) => i !== setIdx ? s : {
            ...s,
            weight: String(total)
          })
        }));
        setBwSheetTarget(null);
        showToast(`Logged ${total}lb`);
      },
      style: {
        width: "100%",
        padding: "16px",
        background: "#000",
        color: "#fff",
        border: "none",
        borderRadius: 16,
        fontSize: 17,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter,sans-serif",
        boxShadow: "0 0 0 2px #00c2ff, 0 0 16px rgba(0,194,255,0.3)"
      }
    }, "Use ", total, "lb"))));
  })(), plateOpen && /*#__PURE__*/React.createElement("div", {
    className: "plate-overlay",
    onClick: () => setPlateOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate-handle"
  }), /*#__PURE__*/React.createElement("div", {
    className: "plate-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate-header-title"
  }, "Plate Calculator"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalcSwitchOpen(true),
    style: {
      background: "#F0F0F0",
      border: "1.5px solid #e5e5ea",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 12,
      fontWeight: 700,
      color: "#8e8e93",
      cursor: "pointer",
      fontFamily: "Inter,sans-serif"
    }
  }, "Switch"), /*#__PURE__*/React.createElement("button", {
    className: "plate-close",
    onClick: () => setPlateOpen(false)
  }, "x"))), /*#__PURE__*/React.createElement("div", {
    className: "bar-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bar-pills"
  }, BARS.map(b => /*#__PURE__*/React.createElement("div", {
    key: b.name,
    className: `bar-pill ${selectedBar === b.name ? "on" : ""}`,
    onClick: () => setSelectedBar(selectedBar === b.name ? "No Bar" : b.name)
  }, b.name, b.weight > 0 ? ` ${b.weight}lb` : "")))), /*#__PURE__*/React.createElement("div", {
    className: "plate-total-section",
    style: {
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate-total-label"
  }, "Total Weight"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "plate-total-num"
  }, totalWeight % 1 === 0 ? totalWeight : totalWeight.toFixed(2)), /*#__PURE__*/React.createElement("span", {
    className: "plate-total-unit"
  }, "lb")), (() => {
    const count = plateCounts[selectedPlate] || 0;
    if (!count) return null;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#8e8e93",
        marginTop: 4
      }
    }, count, " x ", selectedPlate, "lb plate", count !== 1 ? "s" : "");
  })()), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: "#8e8e93",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }
  }, "Last set"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 700,
      fontFamily: "DM Mono,monospace",
      lineHeight: 1,
      color: plateTarget?.prevSetWeight ? "#000" : "#c7c7cc"
    }
  }, plateTarget?.prevSetWeight || "--"), plateTarget?.prevSetWeight && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "lb")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      justifyContent: "flex-end"
    }
  }, (() => {
    const count = plateCounts[selectedPlate] || 0;
    return /*#__PURE__*/React.createElement(BigPlateToggle, {
      count: count,
      onAdd: () => adjustPlate(selectedPlate, 1),
      onRemove: () => adjustPlate(selectedPlate, -1)
    });
  })())), /*#__PURE__*/React.createElement("div", {
    className: "load-mode-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "load-mode-label"
  }, "Loading"), /*#__PURE__*/React.createElement("div", {
    className: "load-mode-toggle"
  }, /*#__PURE__*/React.createElement("button", {
    className: `load-mode-btn ${loadMode === "both" ? "on" : ""}`,
    onClick: () => setLoadMode("both")
  }, "Both sides"), /*#__PURE__*/React.createElement("button", {
    className: `load-mode-btn ${loadMode === "single" ? "on" : ""}`,
    onClick: () => setLoadMode("single")
  }, "One side"))), /*#__PURE__*/React.createElement("div", {
    className: "plate-grid-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "plate-grid"
  }, PLATE_SIZES.map(p => {
    const count = plateCounts[p.weight] || 0;
    const isSelected = selectedPlate === p.weight;
    const hasPlates = count > 0;
    return /*#__PURE__*/React.createElement("div", {
      key: p.weight,
      className: `plate-card ${isSelected ? "selected" : ""}`,
      onClick: () => setSelectedPlate(p.weight)
    }, /*#__PURE__*/React.createElement("div", {
      className: "plate-card-weight",
      style: {
        color: isSelected ? "#00c2ff" : hasPlates ? "#000" : "#c7c7cc"
      }
    }, p.label), /*#__PURE__*/React.createElement("div", {
      className: "plate-card-unit"
    }, "lb"), /*#__PURE__*/React.createElement("div", {
      className: "plate-card-count",
      style: {
        color: hasPlates ? "#00c2ff" : "transparent"
      }
    }, hasPlates ? `x${count}` : "x0"));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "stack-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-section-label"
  }, "Band Add-On (note only)"), /*#__PURE__*/React.createElement("div", {
    className: "band-row"
  }, BAND_LEVELS.map(b => /*#__PURE__*/React.createElement("button", {
    key: b,
    className: `band-btn ${plateBand === b ? "on" : ""}`,
    onClick: () => setPlateBand(plateBand === b ? null : b)
  }, b)))), /*#__PURE__*/React.createElement("button", {
    className: "plate-use-btn",
    onClick: applyPlateWeight
  }, "Use ", totalWeight % 1 === 0 ? totalWeight : totalWeight.toFixed(2), "lb", plateBand ? ` + ${plateBand} band` : ""))), recoveryOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 300,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#F0F0F0",
      borderRadius: "24px 24px 0 0",
      width: "100%",
      maxWidth: 700,
      padding: "0 0 36px"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 5,
      background: "#c7c7cc",
      borderRadius: 3,
      margin: "12px auto 20px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#000",
      marginBottom: 4
    }
  }, "How's your recovery?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#8e8e93",
      marginBottom: 20
    }
  }, "Rate how you feel going into today's session"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 20
    }
  }, [{
    r: 1,
    label: "💀",
    sub: "Dead"
  }, {
    r: 2,
    label: "😓",
    sub: "Rough"
  }, {
    r: 3,
    label: "😐",
    sub: "OK"
  }, {
    r: 4,
    label: "💪",
    sub: "Good"
  }, {
    r: 5,
    label: "Z",
    sub: "Fired up"
  }].map(({
    r,
    label,
    sub
  }) => /*#__PURE__*/React.createElement("div", {
    key: r,
    onClick: () => setRecoveryRating(r),
    style: {
      flex: 1,
      padding: "12px 4px",
      borderRadius: 12,
      border: recoveryRating === r ? "2px solid #00c2ff" : "1.5px solid #e5e5ea",
      background: recoveryRating === r ? "#000" : "#fff",
      cursor: "pointer",
      textAlign: "center",
      transition: "all 0.15s",
      boxShadow: recoveryRating === r ? "0 0 0 1px #00c2ff, 0 0 12px rgba(0,194,255,0.3)" : "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      marginBottom: 2
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: recoveryRating === r ? "#fff" : "#8e8e93"
    }
  }, sub)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setRecoveryOpen(false),
    style: {
      width: "100%",
      padding: "16px",
      background: "#000",
      color: "#fff",
      border: "none",
      borderRadius: 14,
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      boxShadow: "0 0 0 2px #00c2ff, 0 0 16px rgba(0,194,255,0.3)"
    }
  }, recoveryRating ? `Let's go -- feeling ${["", "dead", "rough", "OK", "good", "fired up"][recoveryRating]}!` : "Skip")))), warmupOpen && /*#__PURE__*/React.createElement("div", {
    className: "warmup-overlay",
    onClick: () => setWarmupOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "warmup-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "warmup-handle"
  }), /*#__PURE__*/React.createElement("div", {
    className: "warmup-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "warmup-title"
  }, "Warm Up"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      marginTop: 2
    }
  }, "Auto-generated for your workout")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setWarmupDone(true);
      setWarmupOpen(false);
      showToast("check Warm up complete!");
    },
    style: {
      background: "#000",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "8px 16px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      boxShadow: "0 0 0 1.5px #00c2ff"
    }
  }, "Done")), /*#__PURE__*/React.createElement("div", {
    className: "warmup-body"
  }, warmupSets.map((ws, i) => /*#__PURE__*/React.createElement("div", {
    key: ws.id,
    className: `warmup-row ${ws.done ? "done-row" : ""}`
  }, /*#__PURE__*/React.createElement("button", {
    className: `warmup-check ${ws.done ? "checked" : ""}`,
    onClick: () => setWarmupSets(p => p.map((s, j) => j === i ? {
      ...s,
      done: !s.done
    } : s))
  }, ws.done ? "✓" : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, ws.editing ? /*#__PURE__*/React.createElement("input", {
    autoFocus: true,
    value: ws.name,
    onChange: e => setWarmupSets(p => p.map((s, j) => j === i ? {
      ...s,
      name: e.target.value
    } : s)),
    onBlur: () => setWarmupSets(p => p.map((s, j) => j === i ? {
      ...s,
      editing: false
    } : s)),
    onKeyDown: e => {
      if (e.key === "Enter") setWarmupSets(p => p.map((s, j) => j === i ? {
        ...s,
        editing: false
      } : s));
    },
    placeholder: "Exercise name...",
    style: {
      width: "100%",
      padding: "4px 8px",
      border: "1.5px solid #00c2ff",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "Inter,sans-serif",
      outline: "none"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "warmup-label",
    onClick: () => ws.isCustom && setWarmupSets(p => p.map((s, j) => j === i ? {
      ...s,
      editing: true
    } : s)),
    style: ws.isCustom ? {
      cursor: "pointer"
    } : {}
  }, ws.name), /*#__PURE__*/React.createElement("div", {
    className: "warmup-meta"
  }, ws.weight && /*#__PURE__*/React.createElement("span", null, ws.weight, " . "), ws.reps, " reps")), ws.isFeeder && /*#__PURE__*/React.createElement("span", {
    className: "warmup-tag feeder"
  }, "Feeder"), ws.isGeneral && /*#__PURE__*/React.createElement("span", {
    className: "warmup-tag general"
  }, "Mobility"), ws.isCustom && /*#__PURE__*/React.createElement("button", {
    onClick: () => setWarmupSets(p => p.filter((_, j) => j !== i)),
    style: {
      background: "none",
      border: "none",
      color: "#ff3b30",
      fontSize: 16,
      cursor: "pointer",
      padding: "4px 8px"
    }
  }, "×"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setWarmupSets(p => [...p, {
        id: `wu-custom-${Date.now()}`,
        name: "",
        weight: "",
        reps: "10",
        done: false,
        isCustom: true,
        editing: true
      }]);
    },
    style: {
      background: "#fff",
      border: "1.5px dashed #e5e5ea",
      borderRadius: 12,
      padding: "12px",
      width: "100%",
      fontSize: 13,
      fontWeight: 600,
      color: "#8e8e93",
      cursor: "pointer",
      fontFamily: "Inter,sans-serif",
      marginTop: 4
    }
  }, "+ Add exercise")))), libraryOpen && (() => {
    // Filter exercises
    const filtered = EXERCISE_DB.filter(ex => {
      if (libraryFilterSection && ex.section !== libraryFilterSection) return false;
      if (libraryFilterMuscle && ex.muscle !== libraryFilterMuscle) return false;
      if (librarySearch) {
        const s = librarySearch.toLowerCase();
        return (ex.name || "").toLowerCase().includes(s) || (ex.muscle || "").toLowerCase().includes(s) || (ex.muscleHead || "").toLowerCase().includes(s) || (ex.equipment || "").toLowerCase().includes(s);
      }
      return true;
    });

    // Group by muscle for display
    const grouped = {};
    filtered.forEach(ex => {
      if (!grouped[ex.muscle]) grouped[ex.muscle] = [];
      grouped[ex.muscle].push(ex);
    });
    const sections = ["Upper", "Lower", "Full Body"];
    const musclesInDB = [...new Set(EXERCISE_DB.map(e => e.muscle))].sort();
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "#F0F0F0",
        zIndex: 200,
        display: "flex",
        flexDirection: "column"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "16px 20px 12px",
        background: "#fff",
        borderBottom: "1px solid #e5e5ea",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLibraryOpen(false);
        setLibrarySearch("");
        setLibraryExpanded(null);
        setLibraryFilterSection(null);
        setLibraryFilterMuscle(null);
      },
      style: {
        background: "#e5e5ea",
        border: "none",
        color: "#555",
        fontSize: 14,
        cursor: "pointer",
        width: 30,
        height: 30,
        borderRadius: "50%",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, "×"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: "#000"
      }
    }, "Exercise Library"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93"
      }
    }, filtered.length, " of ", EXERCISE_DB.length, " exercises"))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 14px 6px",
        background: "#fff",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "Search by exercise, muscle, or equipment...",
      value: librarySearch,
      onChange: e => setLibrarySearch(e.target.value),
      style: {
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        border: "1.5px solid #e5e5ea",
        fontSize: 13,
        fontFamily: "Inter,sans-serif",
        outline: "none",
        boxSizing: "border-box",
        background: "#f9f9f9"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        padding: "6px 14px",
        overflowX: "auto",
        flexShrink: 0,
        background: "#fff",
        borderBottom: "1px solid #e5e5ea"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setLibraryFilterSection(null);
        setLibraryFilterMuscle(null);
      },
      style: {
        flexShrink: 0,
        padding: "5px 12px",
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 14,
        border: !libraryFilterSection && !libraryFilterMuscle ? "1.5px solid #00c2ff" : "1.5px solid #e5e5ea",
        background: !libraryFilterSection && !libraryFilterMuscle ? "rgba(0,194,255,0.08)" : "#fff",
        color: !libraryFilterSection && !libraryFilterMuscle ? "#00c2ff" : "#8e8e93",
        cursor: "pointer",
        fontFamily: "Inter,sans-serif"
      }
    }, "All"), sections.map(sec => /*#__PURE__*/React.createElement("button", {
      key: sec,
      onClick: () => {
        setLibraryFilterSection(libraryFilterSection === sec ? null : sec);
        setLibraryFilterMuscle(null);
      },
      style: {
        flexShrink: 0,
        padding: "5px 12px",
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 14,
        border: libraryFilterSection === sec ? "1.5px solid #00c2ff" : "1.5px solid #e5e5ea",
        background: libraryFilterSection === sec ? "rgba(0,194,255,0.08)" : "#fff",
        color: libraryFilterSection === sec ? "#00c2ff" : "#000",
        cursor: "pointer",
        fontFamily: "Inter,sans-serif"
      }
    }, sec)), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 1,
        background: "#e5e5ea",
        margin: "0 4px",
        flexShrink: 0
      }
    }), musclesInDB.filter(m => !libraryFilterSection || EXERCISE_DB.find(e => e.muscle === m && e.section === libraryFilterSection)).map(m => /*#__PURE__*/React.createElement("button", {
      key: m,
      onClick: () => setLibraryFilterMuscle(libraryFilterMuscle === m ? null : m),
      style: {
        flexShrink: 0,
        padding: "5px 12px",
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 14,
        border: libraryFilterMuscle === m ? "1.5px solid #00c2ff" : "1.5px solid #e5e5ea",
        background: libraryFilterMuscle === m ? "rgba(0,194,255,0.08)" : "#fff",
        color: libraryFilterMuscle === m ? "#00c2ff" : "#8e8e93",
        cursor: "pointer",
        fontFamily: "Inter,sans-serif"
      }
    }, m))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "10px 14px 40px"
      }
    }, Object.keys(grouped).sort().map(muscle => /*#__PURE__*/React.createElement("div", {
      key: muscle,
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 800,
        color: "#8e8e93",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "6px 4px 6px"
      }
    }, muscle, " (", grouped[muscle].length, ")"), grouped[muscle].map(ex => {
      const isOpen = libraryExpanded === ex.id;
      const altCount = (EQUIPMENT_ALTERNATIVES[ex.id] || []).length;
      return /*#__PURE__*/React.createElement("div", {
        key: ex.id,
        style: {
          background: "#fff",
          borderRadius: 12,
          border: "1.5px solid #e5e5ea",
          marginBottom: 6,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        onClick: () => setLibraryExpanded(isOpen ? null : ex.id),
        style: {
          padding: "10px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: "#000"
        }
      }, ex.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#8e8e93",
          marginTop: 1
        }
      }, ex.equipment, " · ", ex.muscleHead)), /*#__PURE__*/React.createElement(ChevronDown, {
        size: 14,
        strokeWidth: 2.5,
        color: "#00c2ff",
        style: {
          transform: isOpen ? "rotate(180deg)" : "none",
          transition: "transform 0.2s"
        }
      })), isOpen && /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "0 14px 12px",
          borderTop: "1px solid #F0F0F0",
          background: "#fafafa"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "100px 1fr",
          gap: "4px 10px",
          padding: "10px 0",
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#8e8e93",
          fontWeight: 600
        }
      }, "Body Section"), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#000",
          fontWeight: 600
        }
      }, ex.section), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#8e8e93",
          fontWeight: 600
        }
      }, "Muscle"), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#000",
          fontWeight: 600
        }
      }, ex.muscle), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#8e8e93",
          fontWeight: 600
        }
      }, "Muscle Head"), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#000",
          fontWeight: 600
        }
      }, ex.muscleHead), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#8e8e93",
          fontWeight: 600
        }
      }, "Equipment"), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#000",
          fontWeight: 600
        }
      }, ex.equipment), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#8e8e93",
          fontWeight: 600
        }
      }, "Calculator"), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#000",
          fontWeight: 600,
          textTransform: "capitalize"
        }
      }, ex.calculator), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "#8e8e93",
          fontWeight: 600
        }
      }, "Bench Setup"), /*#__PURE__*/React.createElement("div", {
        style: {
          color: ex.bench && ex.bench !== "N/A" ? "#00c2ff" : "#000",
          fontWeight: 600
        }
      }, ex.bench || "N/A")), ex.variations && ex.variations.length > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: "#8e8e93",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6
        }
      }, "Variations (", ex.variations.length, ")"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 5
        }
      }, ex.variations.map((v, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          padding: "4px 10px",
          borderRadius: 12,
          background: "#F0F0F0",
          border: "1px solid #e5e5ea",
          fontSize: 11,
          fontWeight: 600,
          color: "#000"
        }
      }, v)))), altCount > 0 && /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 10
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: "#8e8e93",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6
        }
      }, "Also available on (", altCount, ")"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 5
        }
      }, (EQUIPMENT_ALTERNATIVES[ex.id] || []).slice(0, 10).map(altId => {
        const alt = EXERCISE_DB.find(e => e.id === altId);
        if (!alt) return null;
        return /*#__PURE__*/React.createElement("div", {
          key: altId,
          style: {
            padding: "4px 10px",
            borderRadius: 12,
            background: "rgba(0,194,255,0.06)",
            border: "1px solid rgba(0,194,255,0.3)",
            fontSize: 11,
            fontWeight: 600,
            color: "#00c2ff"
          }
        }, alt.equipment);
      }), altCount > 10 && /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "4px 10px",
          fontSize: 11,
          color: "#8e8e93"
        }
      }, "+ ", altCount - 10, " more")))));
    }))), filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "40px 20px",
        color: "#8e8e93",
        fontSize: 13
      }
    }, "No exercises match your filters")));
  })(), equipSheet && (() => {
    const currentEx = exercises.find(e => e.id === equipSheet);
    if (!currentEx) return null;
    const lookupId = currentEx.baseId || currentEx.id;
    const alts = EQUIPMENT_ALTERNATIVES[lookupId] || [];
    // Base exercise for the "current" display (or fallback to current)
    const baseEx = currentEx.baseId ? EXERCISE_DB.find(e => e.id === currentEx.baseId) : currentEx;
    const options = [baseEx || currentEx, ...alts.map(id => EXERCISE_DB.find(e => e.id === id)).filter(Boolean)].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i); // dedupe
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      },
      onClick: () => setEquipSheet(null)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#F0F0F0",
        borderRadius: "24px 24px 0 0",
        width: "100%",
        maxWidth: 700,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 5,
        background: "#c7c7cc",
        borderRadius: 3,
        margin: "12px auto 8px",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 20px 12px",
        borderBottom: "1px solid #e5e5ea",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: "#000"
      }
    }, "Change Equipment"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#8e8e93",
        marginTop: 2
      }
    }, "How are you doing ", currentEx.muscleHead || currentEx.muscle, "?")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "12px 14px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, options.map(opt => {
      const selected = opt.id === currentEx.id || opt.id === currentEx.baseId;
      return /*#__PURE__*/React.createElement("div", {
        key: opt.id,
        onClick: () => {
          if (selected) {
            setEquipSheet(null);
            return;
          }
          // Swap the exercise while keeping the sets
          setExercises(p => p.map(x => x.id !== currentEx.id ? x : {
            ...opt,
            sets: x.sets
          }));
          setEquipSheet(null);
          showToast(`Switched to ${opt.equipment}`);
        },
        style: {
          background: "#fff",
          borderRadius: 12,
          padding: "12px 14px",
          border: selected ? "2px solid #00c2ff" : "1.5px solid #e5e5ea",
          boxShadow: selected ? "0 0 0 1px #00c2ff, 0 0 12px rgba(0,194,255,0.15)" : "0 1px 3px rgba(0,0,0,0.06)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: "#000"
        }
      }, opt.equipment), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#8e8e93",
          marginTop: 2
        }
      }, opt.name), opt.bench && opt.bench !== "N/A" && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: "#00c2ff",
          marginTop: 2,
          fontWeight: 600
        }
      }, opt.bench)), selected && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#00c2ff",
          fontWeight: 700,
          padding: "2px 8px",
          background: "rgba(0,194,255,0.1)",
          borderRadius: 6
        }
      }, "Current"));
    }))));
  })(), swapSheet && (() => {
    const currentEx = exercises.find(e => e.id === swapSheet);
    if (!currentEx) return null;
    const alreadyAdded = new Set(exercises.map(e => e.id));

    // Priority 1: Same muscle head (most direct swap)
    const sameHead = EXERCISE_DB.filter(e => e.muscleHead === currentEx.muscleHead && e.id !== currentEx.id && !alreadyAdded.has(e.id));

    // Priority 2: Same muscle group but different head
    const sameMuscle = EXERCISE_DB.filter(e => e.muscle === currentEx.muscle && e.muscleHead !== currentEx.muscleHead && !alreadyAdded.has(e.id));
    const doSwap = (targetEx, variationIdx = null) => {
      let finalEx = targetEx;
      if (variationIdx !== null && targetEx.variations && targetEx.variations[variationIdx]) {
        const variationName = targetEx.variations[variationIdx];
        const variationId = `${targetEx.id}-v${variationIdx}-${Date.now()}`;
        finalEx = {
          ...targetEx,
          id: variationId,
          baseId: targetEx.id,
          name: `${targetEx.name} (${variationName})`
        };
      }
      const prev = lastSets(finalEx.id);
      const initSets = prev ? prev.map(s => ({
        ...s,
        done: false
      })) : [{
        weight: "",
        reps: "",
        done: false
      }];
      setExercises(p => p.map(ex => ex.id === swapSheet ? {
        ...finalEx,
        sets: initSets
      } : ex));
      setExpanded(p => {
        const n = {
          ...p
        };
        const wasOpen = !!n[swapSheet];
        delete n[swapSheet];
        n[finalEx.id] = wasOpen;
        return n;
      });
      setSwapSheet(null);
      setSwapExpandedId(null);
      showToast(`Switched to ${finalEx.name}`);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "swap-overlay",
      onClick: () => {
        setSwapSheet(null);
        setSwapExpandedId(null);
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "swap-sheet",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "swap-handle"
    }), /*#__PURE__*/React.createElement("div", {
      className: "swap-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "swap-title"
    }, "Change exercise"), /*#__PURE__*/React.createElement("div", {
      className: "swap-current"
    }, currentEx.name)), /*#__PURE__*/React.createElement("div", {
      className: "swap-list"
    }, sameHead.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "swap-group-label"
    }, currentEx.muscleHead, " — same muscle head"), sameHead.map(ex => {
      const Icon = EX_ICON[ex.equipment] || Dumbbell;
      const hasVariations = ex.variations && ex.variations.length > 0;
      const isExpanded = swapExpandedId === ex.id;
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: ex.id
      }, /*#__PURE__*/React.createElement("div", {
        className: "swap-item",
        onClick: () => {
          if (hasVariations) setSwapExpandedId(isExpanded ? null : ex.id);else doSwap(ex);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "swap-item-icon"
      }, /*#__PURE__*/React.createElement(Icon, {
        size: 18,
        strokeWidth: 2.5,
        color: "#000"
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "swap-item-name"
      }, ex.name), /*#__PURE__*/React.createElement("div", {
        className: "swap-item-sub"
      }, ex.equipment, ex.bench && ex.bench !== "N/A" && /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#00c2ff"
        }
      }, " · ", ex.bench))), hasVariations && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: "#00c2ff",
          fontWeight: 700,
          padding: "3px 8px",
          border: "1px solid #00c2ff",
          borderRadius: 6,
          flexShrink: 0,
          marginRight: 6
        }
      }, isExpanded ? "Hide" : "Variations")), isExpanded && /*#__PURE__*/React.createElement("div", {
        style: {
          background: "#f9f9f9",
          padding: "4px 0",
          borderRadius: "0 0 8px 8px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        onClick: () => doSwap(ex),
        style: {
          padding: "10px 40px 10px 56px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "#000",
          borderBottom: "1px solid #e5e5ea"
        }
      }, "Standard ", ex.name), ex.variations.map((v, vi) => /*#__PURE__*/React.createElement("div", {
        key: vi,
        onClick: () => doSwap(ex, vi),
        style: {
          padding: "10px 40px 10px 56px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: "#000",
          borderBottom: vi === ex.variations.length - 1 ? "none" : "1px solid #F0F0F0"
        }
      }, v))));
    })), sameMuscle.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "swap-group-label"
    }, "Other ", currentEx.muscle, " exercises"), sameMuscle.map(ex => {
      const Icon = EX_ICON[ex.equipment] || Dumbbell;
      const hasVariations = ex.variations && ex.variations.length > 0;
      const isExpanded = swapExpandedId === ex.id;
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: ex.id
      }, /*#__PURE__*/React.createElement("div", {
        className: "swap-item",
        onClick: () => {
          if (hasVariations) setSwapExpandedId(isExpanded ? null : ex.id);else doSwap(ex);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "swap-item-icon"
      }, /*#__PURE__*/React.createElement(Icon, {
        size: 18,
        strokeWidth: 2.5,
        color: "#000"
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "swap-item-name"
      }, ex.name), /*#__PURE__*/React.createElement("div", {
        className: "swap-item-sub"
      }, ex.equipment, " · ", ex.muscleHead)), hasVariations && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          color: "#00c2ff",
          fontWeight: 700,
          padding: "3px 8px",
          border: "1px solid #00c2ff",
          borderRadius: 6,
          flexShrink: 0,
          marginRight: 6
        }
      }, isExpanded ? "Hide" : "Variations")), isExpanded && /*#__PURE__*/React.createElement("div", {
        style: {
          background: "#f9f9f9",
          padding: "4px 0",
          borderRadius: "0 0 8px 8px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        onClick: () => doSwap(ex),
        style: {
          padding: "10px 40px 10px 56px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "#000",
          borderBottom: "1px solid #e5e5ea"
        }
      }, "Standard ", ex.name), ex.variations.map((v, vi) => /*#__PURE__*/React.createElement("div", {
        key: vi,
        onClick: () => doSwap(ex, vi),
        style: {
          padding: "10px 40px 10px 56px",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          color: "#000",
          borderBottom: vi === ex.variations.length - 1 ? "none" : "1px solid #F0F0F0"
        }
      }, v))));
    })))));
  })(), calcSwitchOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 300
    },
    onClick: () => setCalcSwitchOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#F0F0F0",
      borderRadius: "24px 24px 0 0",
      width: "100%",
      maxWidth: 700,
      paddingBottom: 32
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 5,
      background: "#c7c7cc",
      borderRadius: 3,
      margin: "12px auto 16px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#8e8e93",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      padding: "0 20px 12px",
      borderBottom: "1px solid #e5e5ea",
      marginBottom: 8
    }
  }, "Switch Calculator"), [{
    type: "plate",
    label: "Plate Loaded",
    sub: "Barbell, leg press, preacher"
  }, {
    type: "stack",
    label: "Stack / Machine",
    sub: "Cable, pec deck, leg ext"
  }, {
    type: "dumbbell",
    label: "Dumbbell",
    sub: "REP x Pepin, Snode, Fixed"
  }, {
    type: "mx100",
    label: "MX100 Selectorized",
    sub: "28-100lb . 10 dial positions"
  }, {
    type: "kettlebell",
    label: "Kettlebell",
    sub: "26.5lb & 52.9lb"
  }].map(opt => /*#__PURE__*/React.createElement("div", {
    key: opt.type,
    onClick: () => switchCalculator(opt.type),
    style: {
      padding: "14px 20px",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 2,
      borderBottom: "1px solid #F0F0F0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "#000"
    }
  }, opt.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93"
    }
  }, opt.sub))))), equipEditTarget && /*#__PURE__*/React.createElement("div", {
    className: "equip-type-sheet",
    onClick: () => setEquipEditTarget(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "equip-type-panel",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 5,
      background: "#c7c7cc",
      borderRadius: 3,
      margin: "0 auto 14px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "equip-type-title"
  }, equipEditTarget), WEIGHT_TYPES.map(type => /*#__PURE__*/React.createElement("div", {
    key: type,
    className: `equip-type-option ${equipConfig[equipEditTarget] === type ? "selected" : ""}`,
    onClick: () => {
      setEquipConfig(p => ({
        ...p,
        [equipEditTarget]: type
      }));
      setEquipEditTarget(null);
      showToast(`${equipEditTarget} -> ${type}`);
    }
  }, type, equipConfig[equipEditTarget] === type && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#00c2ff"
    }
  }, "check"))))), mx100Open && /*#__PURE__*/React.createElement("div", {
    className: "db-overlay",
    onClick: () => setMx100Open(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-handle"
  }), /*#__PURE__*/React.createElement("div", {
    className: "db-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-title"
  }, "MX100 Selectorized Bar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalcSwitchOpen(true),
    style: {
      background: "#F0F0F0",
      border: "1.5px solid #e5e5ea",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 12,
      fontWeight: 700,
      color: "#8e8e93",
      cursor: "pointer",
      fontFamily: "Inter,sans-serif"
    }
  }, "Switch"), /*#__PURE__*/React.createElement("button", {
    className: "db-close",
    onClick: () => setMx100Open(false)
  }, "x"))), /*#__PURE__*/React.createElement("div", {
    className: "db-info-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-last"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-last-label"
  }, "Last set"), /*#__PURE__*/React.createElement("div", {
    className: "db-last-num",
    style: {
      color: mx100Target?.prevSetWeight ? "#000" : "#c7c7cc"
    }
  }, mx100Target?.prevSetWeight || "--"), mx100Target?.prevSetWeight && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "lb")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "#000"
    }
  }, "MX Select MX100"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "28-100lb . Straight or Curl Bar"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 14px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#8e8e93",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }
  }, "Select Dial Position"), /*#__PURE__*/React.createElement("div", {
    className: "db-grid-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2,1fr)",
      gap: 8
    }
  }, MX100_WEIGHTS.map((w, idx) => {
    const isCurrent = mx100Target?.prevSetWeight === String(w);
    return /*#__PURE__*/React.createElement("button", {
      key: w,
      onClick: () => {
        if (!mx100Target) return;
        const {
          exId,
          setIdx
        } = mx100Target;
        setExercises(p => p.map(ex => ex.id !== exId ? ex : {
          ...ex,
          sets: ex.sets.map((s, i) => i !== setIdx ? s : {
            ...s,
            weight: String(w)
          })
        }));
        setMx100Open(false);
        showToast(`${w}lb (Dial ${idx + 1})`);
      },
      style: {
        padding: "14px",
        borderRadius: 12,
        border: `1.5px solid ${isCurrent ? "#00c2ff" : "#e5e5ea"}`,
        background: isCurrent ? "#000" : "#fff",
        cursor: "pointer",
        fontFamily: "DM Mono,monospace",
        textAlign: "left",
        boxShadow: "0 1px 3px rgba(0,0,0,0.07)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 700,
        color: isCurrent ? "#fff" : "#000"
      }
    }, w, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 500,
        color: isCurrent ? "#8e8e93" : "#c7c7cc"
      }
    }, " lb")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: isCurrent ? "#00c2ff" : "#8e8e93",
        marginTop: 2
      }
    }, "Dial ", idx + 1));
  }))))), dbOpen && (() => {
    const brand = DB_BRANDS.find(b => b.id === dbBrand) || DB_BRANDS[0];
    const currentW = dbTarget?.currentWeight ? parseFloat(dbTarget.currentWeight) : null;
    const prevW = dbTarget?.prevSetWeight;
    return /*#__PURE__*/React.createElement("div", {
      className: "db-overlay",
      onClick: () => setDbOpen(false)
    }, /*#__PURE__*/React.createElement("div", {
      className: "db-sheet",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "db-handle"
    }), /*#__PURE__*/React.createElement("div", {
      className: "db-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "db-title"
    }, "Dumbbell"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setCalcSwitchOpen(true),
      style: {
        background: "#F0F0F0",
        border: "1.5px solid #e5e5ea",
        borderRadius: 8,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 700,
        color: "#8e8e93",
        cursor: "pointer",
        fontFamily: "Inter,sans-serif"
      }
    }, "Switch"), /*#__PURE__*/React.createElement("button", {
      className: "db-close",
      onClick: () => setDbOpen(false)
    }, "x"))), /*#__PURE__*/React.createElement("div", {
      className: "db-brand-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "db-brand-pills"
    }, DB_BRANDS.map(b => /*#__PURE__*/React.createElement("div", {
      key: b.id,
      className: `db-brand-pill ${dbBrand === b.id ? "on" : ""}`,
      onClick: () => setDbBrand(b.id)
    }, b.name)))), /*#__PURE__*/React.createElement("div", {
      className: "db-info-row"
    }, /*#__PURE__*/React.createElement("div", {
      className: "db-last"
    }, /*#__PURE__*/React.createElement("div", {
      className: "db-last-label"
    }, "Last set"), /*#__PURE__*/React.createElement("div", {
      className: "db-last-num",
      style: {
        color: prevW ? "#000" : "#c7c7cc"
      }
    }, prevW || "--"), prevW && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#8e8e93"
      }
    }, "lb")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#8e8e93",
        textAlign: "center",
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: "#000",
        fontSize: 13
      }
    }, brand.name), /*#__PURE__*/React.createElement("div", null, "Up to ", brand.max, "lb")), /*#__PURE__*/React.createElement("div", {
      className: "db-side-toggle"
    }, /*#__PURE__*/React.createElement("button", {
      className: `db-side-btn ${dbSide === "both" ? "on" : ""}`,
      onClick: () => setDbSide("both")
    }, "Both"), /*#__PURE__*/React.createElement("button", {
      className: `db-side-btn ${dbSide === "single" ? "on" : ""}`,
      onClick: () => setDbSide("single")
    }, "Single"))), /*#__PURE__*/React.createElement("div", {
      className: "db-grid-wrap"
    }, /*#__PURE__*/React.createElement("div", {
      className: "db-grid"
    }, brand.weights.map(w => /*#__PURE__*/React.createElement("button", {
      key: w,
      className: `db-weight-btn ${currentW === w ? "current" : ""}`,
      onClick: () => applyDumbbellWeight(w)
    }, w % 1 === 0 ? w : w.toFixed(1)))))));
  })(), stackOpen && /*#__PURE__*/React.createElement("div", {
    className: "stack-overlay",
    onClick: () => setStackOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-sheet",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-handle"
  }), /*#__PURE__*/React.createElement("div", {
    className: "stack-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-title"
  }, "Stack Calculator"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCalcSwitchOpen(true),
    style: {
      background: "#F0F0F0",
      border: "1.5px solid #e5e5ea",
      borderRadius: 8,
      padding: "5px 10px",
      fontSize: 12,
      fontWeight: 700,
      color: "#8e8e93",
      cursor: "pointer",
      fontFamily: "Inter,sans-serif"
    }
  }, "Switch"), /*#__PURE__*/React.createElement("button", {
    className: "stack-close",
    onClick: () => setStackOpen(false)
  }, "x"))), /*#__PURE__*/React.createElement("div", {
    className: "stack-machine-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-machine-pills"
  }, MACHINES.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: `stack-machine-pill ${stackMachine === m.id ? "on" : ""}`,
    onClick: () => {
      setStackMachine(m.id);
      setStackBase(0);
    }
  }, m.name)))), stackRatio === 2 && /*#__PURE__*/React.createElement("div", {
    className: "ratio-note"
  }, "(!) Cable is 2:1 ratio -- selected weight feels like half. ", stackSelectedWeight, "lb selected = ", /*#__PURE__*/React.createElement("strong", null, stackEffective, "lb felt")), /*#__PURE__*/React.createElement("div", {
    className: "stack-total-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-total-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-total-label"
  }, stackRatio === 2 ? "Selected / Felt" : "Total Weight"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "stack-total-num"
  }, stackRatio === 2 ? `${stackSelectedWeight} / ${stackEffective}` : stackSelectedWeight), /*#__PURE__*/React.createElement("span", {
    className: "stack-total-unit"
  }, "lb"))), /*#__PURE__*/React.createElement("div", {
    className: "stack-last"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-last-label"
  }, "Last set"), /*#__PURE__*/React.createElement("div", {
    className: "stack-last-num",
    style: {
      color: stackTarget?.prevSetWeight ? "#000" : "#c7c7cc"
    }
  }, stackTarget?.prevSetWeight || "--"), stackTarget?.prevSetWeight && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#8e8e93"
    }
  }, "lb"))), /*#__PURE__*/React.createElement("div", {
    className: "stack-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-section-label"
  }, "Main Stack -- ", stackMachineConfig.brand, " (", stackIncrement, "lb steps)"), /*#__PURE__*/React.createElement("div", {
    className: "stack-scroll"
  }, stackIncrements.map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: `stack-val-btn ${stackBase === v ? "on" : ""}`,
    onClick: () => setStackBase(stackBase === v ? 0 : v)
  }, v)))), /*#__PURE__*/React.createElement("div", {
    className: "stack-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-section-label"
  }, "Top Plate"), /*#__PURE__*/React.createElement("div", {
    className: "addon-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: `addon-btn ${stackTop5 ? "on" : ""}`,
    onClick: () => setStackTop5(!stackTop5)
  }, "+", stackTopPlateWeight, "lb top plate"))), /*#__PURE__*/React.createElement("div", {
    className: "stack-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-section-label"
  }, "Add-On Weights (magnetic micro)"), /*#__PURE__*/React.createElement("div", {
    className: "addon-row"
  }, [0, 1.25, 2.5, 3.75].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: `addon-btn ${snodeMag === v ? "on" : ""}`,
    onClick: () => setSnodeMag(v)
  }, v === 0 ? "None" : `+${v}lb`)))), /*#__PURE__*/React.createElement("div", {
    className: "stack-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-section-label"
  }, "GymPin -- Extra Plate on Stack"), /*#__PURE__*/React.createElement("div", {
    className: "addon-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: `addon-btn ${gymPinPlate === null ? "on" : ""}`,
    onClick: () => setGymPinPlate(null)
  }, "None"), GYMPIN_PLATES.map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: `addon-btn ${gymPinPlate === v ? "on" : ""}`,
    onClick: () => setGymPinPlate(gymPinPlate === v ? null : v)
  }, "+", v, "lb")))), /*#__PURE__*/React.createElement("div", {
    className: "stack-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stack-section-label"
  }, "Band Add-On (note only)"), /*#__PURE__*/React.createElement("div", {
    className: "band-row"
  }, BAND_LEVELS.map(b => /*#__PURE__*/React.createElement("button", {
    key: b,
    className: `band-btn ${bandLevel === b ? "on" : ""}`,
    onClick: () => setBandLevel(bandLevel === b ? null : b)
  }, b)))), /*#__PURE__*/React.createElement("button", {
    className: "stack-use-btn",
    onClick: applyStackWeight
  }, "Use ", stackSelectedWeight, "lb", bandLevel ? ` + ${bandLevel} band` : "", stackRatio === 2 ? ` (${stackEffective}lb felt)` : ""))), showPicker && /*#__PURE__*/React.createElement("div", {
    className: "picker-overlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: "picker-topbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "picker-close",
    onClick: () => {
      if (pickerStep > 1) {
        if (pickerStep === 2) {
          setPickerStep(1);
          setPickerMuscle(null);
        }
        if (pickerStep === 3) {
          setPickerStep(2);
          setPickerEquip(null);
        }
        if (pickerStep === 4) {
          setPickerStep(3);
          setPickerExercise(null);
        }
      } else {
        setShowPicker(false);
      }
    }
  }, pickerStep > 1 ? "‹" : "×"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "picker-title"
  }, pickerStep === 1 && "What muscle?", pickerStep === 2 && (pickerMuscle || "Equipment"), pickerStep === 3 && (pickerEquip || "Exercise"), pickerStep === 4 && (pickerExercise?.name || "Variations")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      marginTop: 2
    }
  }, [1, 2, 3, 4].map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      width: s <= pickerStep ? 20 : 6,
      height: 6,
      borderRadius: 3,
      background: s <= pickerStep ? "#00c2ff" : "#e5e5ea",
      transition: "all 0.2s"
    }
  })))), pendingIds.length > 0 ? /*#__PURE__*/React.createElement("button", {
    className: "picker-cart",
    onClick: confirmAdd
  }, "Done ", /*#__PURE__*/React.createElement("div", {
    className: "picker-cart-count"
  }, pendingIds.length)) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60
    }
  })), pickerStep === 1 && (() => {
    const muscleStatus = analyzeMuscleStatus(history);
    const allEx = [...EXERCISE_DB, ...(customExercises || [])];
    const searchTrim = search.trim().toLowerCase();
    const searchResults = searchTrim.length > 0 ? allEx.filter(e => {
      try {
        return (e.name || "").toLowerCase().includes(searchTrim) || (e.muscle || "").toLowerCase().includes(searchTrim) || (e.muscleHead || "").toLowerCase().includes(searchTrim) || (e.equipment || "").toLowerCase().includes(searchTrim) || (e.primaryMuscle || "").toLowerCase().includes(searchTrim);
      } catch (err) {
        return false;
      }
    }) : [];
    return /*#__PURE__*/React.createElement("div", {
      className: "picker-list",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 16px 8px",
        background: "#fff",
        borderBottom: "1px solid #f0f0f0",
        position: "sticky",
        top: 0,
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#F0F0F0",
        borderRadius: 12,
        padding: "8px 12px"
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#8e8e93",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "8"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "21",
      y1: "21",
      x2: "16.65",
      y2: "16.65"
    })), /*#__PURE__*/React.createElement("input", {
      value: search,
      onChange: e => setSearch(e.target.value),
      placeholder: "Search exercises, muscles, equipment...",
      style: {
        flex: 1,
        border: "none",
        background: "transparent",
        fontSize: 14,
        fontFamily: "Inter,sans-serif",
        outline: "none",
        color: "#000"
      },
      autoFocus: false
    }), search ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setSearch(""),
      style: {
        border: "none",
        background: "none",
        padding: 0,
        cursor: "pointer",
        color: "#8e8e93",
        fontSize: 16,
        lineHeight: 1
      }
    }, "x") : null)), searchTrim.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "10px 16px 4px",
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        textTransform: "uppercase",
        letterSpacing: "0.06em"
      }
    }, searchResults.length, " result", searchResults.length !== 1 ? "s" : ""), searchResults.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "24px 16px",
        textAlign: "center",
        color: "#8e8e93",
        fontSize: 14
      }
    }, "No exercises found") : searchResults.map((ex, ri) => {
      const isPending = pendingIds.includes(ex.id);
      return /*#__PURE__*/React.createElement("div", {
        key: ex.id + "-" + ri,
        className: "picker-item",
        style: {
          background: isPending ? "rgba(0,194,255,0.06)" : undefined
        },
        onClick: () => {
          setPendingIds(p => p.includes(ex.id) ? p.filter(x => x !== ex.id) : [...p, ex.id]);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "picker-item-img",
        style: {
          background: "#F0F0F0"
        }
      }, /*#__PURE__*/React.createElement(Dumbbell, {
        size: 20,
        strokeWidth: 2,
        color: "#000"
      })), /*#__PURE__*/React.createElement("div", {
        className: "picker-item-text"
      }, /*#__PURE__*/React.createElement("div", {
        className: "picker-item-name"
      }, ex.name), /*#__PURE__*/React.createElement("div", {
        className: "picker-item-sub"
      }, ex.muscle || "", ex.muscleHead ? " · " + ex.muscleHead : "", " · ", ex.equipment || "")), /*#__PURE__*/React.createElement("div", {
        style: {
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: isPending ? "none" : "2px solid #c7c7cc",
          background: isPending ? "#00c2ff" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }
      }, isPending && /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#fff",
          fontSize: 13,
          fontWeight: 700
        }
      }, "✓")));
    })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 16px 6px",
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        textTransform: "uppercase",
        letterSpacing: "0.06em"
      }
    }, "By Muscle Group"), ["Upper", "Lower", "Full Body"].map(section => {
      const muscles = [...new Set(EXERCISE_DB.filter(e => e.section === section).map(e => e.muscle))];
      return /*#__PURE__*/React.createElement("div", {
        key: section
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "8px 16px",
          fontSize: 10,
          fontWeight: 700,
          color: "#c7c7cc",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          background: "#f9f9f9"
        }
      }, section), muscles.map(muscle => {
        const count = EXERCISE_DB.filter(e => e.muscle === muscle).length;
        const m = MUSCLES.find(mu => mu.label === muscle || mu.id === muscle.toLowerCase());
        const Icon = m ? m.Icon : Dumbbell;
        const s = muscleStatus[muscle];
        const showHint = s && (s.priority === "red" || s.priority === "orange");
        const hintColor = s?.priority === "red" ? "#ff3b30" : "#ff9f0a";
        return /*#__PURE__*/React.createElement("div", {
          key: muscle,
          className: "picker-item",
          onClick: () => {
            setPickerMuscle(muscle);
            setPickerStep(2);
          }
        }, /*#__PURE__*/React.createElement("div", {
          className: "picker-item-img",
          style: {
            background: "#F0F0F0"
          }
        }, /*#__PURE__*/React.createElement(Icon, {
          size: 22,
          strokeWidth: 2,
          color: "#000"
        })), /*#__PURE__*/React.createElement("div", {
          className: "picker-item-text"
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6
          }
        }, /*#__PURE__*/React.createElement("div", {
          className: "picker-item-name"
        }, muscle), showHint && /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 9,
            fontWeight: 700,
            color: hintColor,
            padding: "2px 6px",
            background: hintColor + "22",
            borderRadius: 8,
            textTransform: "uppercase",
            letterSpacing: "0.03em"
          }
        }, s.priority === "red" ? "Overdue" : "Due")), /*#__PURE__*/React.createElement("div", {
          className: "picker-item-sub"
        }, showHint ? s.reason : `${count} exercises available`)), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 18,
            color: "#c7c7cc",
            fontWeight: 300
          }
        }, ">"));
      }));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 16px 6px",
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginTop: 8
      }
    }, "By Equipment"), [...new Set(EXERCISE_DB.map(e => e.equipment))].sort().map(equip => {
      const count = EXERCISE_DB.filter(e => e.equipment === equip).length;
      const Icon = EX_ICON[equip] || Dumbbell;
      return /*#__PURE__*/React.createElement("div", {
        key: equip,
        className: "picker-item",
        onClick: () => {
          setPickerEquip(equip);
          setPickerMuscle(null);
          setPickerStep(3);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "picker-item-img",
        style: {
          background: "#F0F0F0"
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        size: 22,
        strokeWidth: 2,
        color: "#000"
      })), /*#__PURE__*/React.createElement("div", {
        className: "picker-item-text"
      }, /*#__PURE__*/React.createElement("div", {
        className: "picker-item-name"
      }, equip), /*#__PURE__*/React.createElement("div", {
        className: "picker-item-sub"
      }, count, " exercises")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 18,
          color: "#c7c7cc",
          fontWeight: 300
        }
      }, ">"));
    })));
  })(), pickerStep === 2 && pickerMuscle && (() => {
    const equips = [...new Set(EXERCISE_DB.filter(e => e.muscle === pickerMuscle).map(e => e.equipment))].sort();
    return /*#__PURE__*/React.createElement("div", {
      className: "picker-list"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 16px 6px",
        fontSize: 11,
        fontWeight: 700,
        color: "#8e8e93",
        textTransform: "uppercase",
        letterSpacing: "0.06em"
      }
    }, "Available equipment for ", pickerMuscle), equips.map(equip => {
      const exs = EXERCISE_DB.filter(e => e.muscle === pickerMuscle && e.equipment === equip);
      const Icon = EX_ICON[equip] || Dumbbell;
      return /*#__PURE__*/React.createElement("div", {
        key: equip,
        className: "picker-item",
        onClick: () => {
          setPickerEquip(equip);
          setPickerStep(3);
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "picker-item-img",
        style: {
          background: "#F0F0F0"
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        size: 22,
        strokeWidth: 2,
        color: "#000"
      })), /*#__PURE__*/React.createElement("div", {
        className: "picker-item-text"
      }, /*#__PURE__*/React.createElement("div", {
        className: "picker-item-name"
      }, equip), /*#__PURE__*/React.createElement("div", {
        className: "picker-item-sub"
      }, exs.length, " exercises · ", [...new Set(exs.map(e => e.muscleHead))].join(", "))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 18,
          color: "#c7c7cc",
          fontWeight: 300
        }
      }, ">"));
    }));
  })(), pickerStep === 3 && pickerEquip && (() => {
    const exs = EXERCISE_DB.filter(e => e.equipment === pickerEquip && (!pickerMuscle || e.muscle === pickerMuscle));
    // Group by muscle head
    const heads = [...new Set(exs.map(e => e.muscleHead))];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "picker-search-wrap"
    }, /*#__PURE__*/React.createElement("input", {
      className: "picker-search",
      placeholder: "Search " + pickerEquip + " exercises...",
      value: search,
      onChange: e => setSearch(e.target.value)
    })), /*#__PURE__*/React.createElement("div", {
      className: "picker-list"
    }, heads.map(head => {
      const headExs = exs.filter(e => e.muscleHead === head && (!search || (e.name || "").toLowerCase().includes((search || "").toLowerCase())));
      if (!headExs.length) return null;
      return /*#__PURE__*/React.createElement("div", {
        key: head
      }, /*#__PURE__*/React.createElement("div", {
        className: "picker-alpha"
      }, head), headExs.map(ex => {
        const isAdded = !!exercises.find(a => a.id === ex.id);
        const isPending = pendingIds.includes(ex.id);
        const hasVariations = ex.variations && ex.variations.length > 0;
        return /*#__PURE__*/React.createElement("div", {
          key: ex.id,
          className: `picker-item ${isAdded ? "added" : ""}`
        }, /*#__PURE__*/React.createElement("div", {
          className: "picker-item-text",
          style: {
            flex: 1
          },
          onClick: () => {
            if (isAdded) return; // Already in workout, can't change
            if (isPending) {
              togglePending(ex.id);
              return;
            } // Unselect
            if (hasVariations) {
              setPickerExercise(ex);
              setPickerStep(4);
            } else togglePending(ex.id);
          }
        }, /*#__PURE__*/React.createElement("div", {
          className: "picker-item-name"
        }, ex.name), /*#__PURE__*/React.createElement("div", {
          className: "picker-item-sub"
        }, ex.muscleHead, ex.bench && ex.bench !== "N/A" && /*#__PURE__*/React.createElement("span", {
          style: {
            color: "#00c2ff"
          }
        }, " · ", ex.bench))), hasVariations && !isAdded && !isPending && /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 10,
            color: "#00c2ff",
            fontWeight: 700,
            padding: "4px 8px",
            border: "1px solid #00c2ff",
            borderRadius: 6,
            cursor: "pointer",
            flexShrink: 0,
            marginRight: 6
          },
          onClick: () => {
            setPickerExercise(ex);
            setPickerStep(4);
          }
        }, "Variations"), /*#__PURE__*/React.createElement("div", {
          className: `picker-add ${isPending || isAdded ? "selected" : ""}`,
          onClick: () => {
            if (!isAdded) togglePending(ex.id);
          },
          style: {
            fontSize: isPending || isAdded ? 14 : 18
          }
        }, isPending || isAdded ? "✓" : "+"));
      }));
    }), exs.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "picker-empty"
    }, "No exercises found")));
  })(), pickerStep === 4 && pickerExercise && /*#__PURE__*/React.createElement("div", {
    className: "picker-list"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      background: "#f9f9f9",
      borderBottom: "1px solid #e5e5ea"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      color: "#000"
    }
  }, pickerExercise.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      marginTop: 2
    }
  }, pickerExercise.muscleHead, " · ", pickerExercise.equipment), pickerExercise.bench && pickerExercise.bench !== "N/A" && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#00c2ff",
      marginTop: 4,
      fontWeight: 600
    }
  }, pickerExercise.bench)), /*#__PURE__*/React.createElement("div", {
    className: "picker-item",
    onClick: () => togglePending(pickerExercise.id)
  }, /*#__PURE__*/React.createElement("div", {
    className: "picker-item-text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "picker-item-name"
  }, pickerExercise.name), /*#__PURE__*/React.createElement("div", {
    className: "picker-item-sub"
  }, "Standard")), /*#__PURE__*/React.createElement("div", {
    className: `picker-add ${pendingIds.includes(pickerExercise.id) ? "selected" : ""}`,
    style: {
      fontSize: pendingIds.includes(pickerExercise.id) ? 14 : 18
    }
  }, pendingIds.includes(pickerExercise.id) ? "✓" : "+")), (pickerExercise.variations || []).filter(v => v.toLowerCase() !== "standard").map((v, i) => {
    const varId = `${pickerExercise.id}-v${i}`;
    const isPending = pendingIds.includes(varId);
    return /*#__PURE__*/React.createElement("div", {
      key: varId,
      className: "picker-item",
      onClick: () => {
        if (isPending) setPendingIds(p => p.filter(x => x !== varId));else {
          // Create a variation exercise object
          const varEx = {
            ...pickerExercise,
            id: varId,
            baseId: pickerExercise.id,
            name: `${pickerExercise.name} (${v})`
          };
          setPendingIds(p => [...p, varId]);
          // Store variation exercise for confirmAdd
          window._varExercises = window._varExercises || {};
          window._varExercises[varId] = varEx;
        }
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "picker-item-text"
    }, /*#__PURE__*/React.createElement("div", {
      className: "picker-item-name",
      style: {
        fontSize: 14
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      className: "picker-item-sub"
    }, pickerExercise.name)), /*#__PURE__*/React.createElement("div", {
      className: `picker-add ${isPending ? "selected" : ""}`,
      style: {
        fontSize: isPending ? 14 : 18
      }
    }, isPending ? "✓" : "+"));
  })), pendingIds.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 12px",
      background: "rgba(0,194,255,0.08)",
      borderTop: "1px solid rgba(0,194,255,0.3)",
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      maxHeight: "80px",
      overflowY: "auto"
    }
  }, pendingIds.map(pid => {
    const varEx = (window._varExercises || {})[pid];
    const ex = varEx || EXERCISE_DB.find(e => e.id === pid) || (customExercises || []).find(e => e.id === pid);
    if (!ex) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: pid,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "#fff",
        border: "1px solid #00c2ff",
        borderRadius: 12,
        padding: "4px 6px 4px 10px",
        fontSize: 11,
        fontWeight: 600,
        color: "#000"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        maxWidth: 180,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, ex.name), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setPendingIds(p => p.filter(x => x !== pid));
        if (window._varExercises) delete window._varExercises[pid];
      },
      style: {
        background: "#ff3b30",
        color: "#fff",
        border: "none",
        borderRadius: "50%",
        width: 16,
        height: 16,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        padding: 0
      }
    }, "×"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "picker-done-bar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "picker-done-btn",
    onClick: pendingIds.length > 0 ? confirmAdd : () => setShowPicker(false)
  }, pendingIds.length > 0 ? `Add ${pendingIds.length} exercise${pendingIds.length !== 1 ? "s" : ""}` : "Done"))));
}

// ---- PIN lock + sync bootstrap --------------------------------------
// Shown before App mounts. Checks the PIN against the Edge Function, then
// pulls all saved data down once (get-all) so useLocalStorage hooks inside
// <App/> initialize from the freshest data instead of a stale local copy.

const LOCK_PIN_KEY = "locked_pin_session";
function PinScreen({
  onUnlock
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const submit = async () => {
    if (!pin) return;
    setChecking(true);
    setError("");
    const cfg = window.__LOCKED_SYNC__ || {};
    cfg.pin = pin;
    window.__LOCKED_SYNC__ = cfg;
    const result = await syncCall("get-all");
    setChecking(false);
    if (result === null) {
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }
    if (result.error) {
      setError("Wrong PIN");
      return;
    }
    window.__LOCKED_REMOTE_CACHE__ = result.data || {};
    try {
      sessionStorage.setItem(LOCK_PIN_KEY, pin);
    } catch (e) {}
    onUnlock();
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "#000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "Inter,sans-serif"
    }
  }, /*#__PURE__*/React.createElement(Lock, {
    size: 32,
    strokeWidth: 2,
    color: "#00c2ff"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#fff",
      marginTop: 16,
      letterSpacing: "0.02em"
    }
  }, "Locked"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#8e8e93",
      marginTop: 4,
      marginBottom: 24
    }
  }, "Enter your PIN to continue"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    inputMode: "numeric",
    autoFocus: true,
    value: pin,
    onChange: e => setPin(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") submit();
    },
    style: {
      width: 200,
      padding: "12px 16px",
      borderRadius: 12,
      border: "1.5px solid #2c2c2e",
      background: "#1c1c1e",
      color: "#fff",
      fontSize: 20,
      textAlign: "center",
      letterSpacing: "0.3em",
      fontFamily: "DM Mono,monospace"
    },
    placeholder: "····"
  }), error && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#ff3b30",
      fontSize: 12,
      marginTop: 12,
      textAlign: "center",
      maxWidth: 240
    }
  }, error), /*#__PURE__*/React.createElement("button", {
    onClick: submit,
    disabled: checking || !pin,
    style: {
      marginTop: 20,
      width: 200,
      padding: "12px",
      borderRadius: 12,
      border: "none",
      background: checking || !pin ? "#2c2c2e" : "#00c2ff",
      color: checking || !pin ? "#8e8e93" : "#000",
      fontSize: 14,
      fontWeight: 800,
      cursor: checking || !pin ? "default" : "pointer",
      fontFamily: "Inter,sans-serif"
    }
  }, checking ? "Checking..." : "Unlock"));
}
function OfflineBanner() {
  const [online, setOnline] = useState(syncOnline);
  useEffect(() => {
    const fn = o => setOnline(o);
    syncListeners.add(fn);
    return () => syncListeners.delete(fn);
  }, []);
  if (online) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: "#ff3b30",
      color: "#fff",
      fontSize: 11,
      fontWeight: 700,
      textAlign: "center",
      padding: "6px 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      fontFamily: "Inter,sans-serif"
    }
  }, /*#__PURE__*/React.createElement(WifiOff, {
    size: 12,
    strokeWidth: 2.5
  }), " Offline -- saving locally, will sync when connection returns");
}
export default function LockedRoot() {
  const [unlocked, setUnlocked] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    // If we already unlocked this PIN earlier in the browser session, skip
    // the screen and re-verify silently in the background.
    let savedPin = null;
    try {
      savedPin = sessionStorage.getItem(LOCK_PIN_KEY);
    } catch (e) {}
    if (!savedPin) {
      setCheckingSession(false);
      return;
    }
    (async () => {
      const cfg = window.__LOCKED_SYNC__ || {};
      cfg.pin = savedPin;
      window.__LOCKED_SYNC__ = cfg;
      const result = await syncCall("get-all");
      if (result && !result.error) {
        window.__LOCKED_REMOTE_CACHE__ = result.data || {};
        setUnlocked(true);
      }
      setCheckingSession(false);
    })();
  }, []);
  if (checkingSession) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "#000"
      }
    });
  }
  if (!unlocked) {
    return /*#__PURE__*/React.createElement(PinScreen, {
      onUnlock: () => setUnlocked(true)
    });
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(OfflineBanner, null), /*#__PURE__*/React.createElement(App, null));
}
