import { useEffect, useRef, useState, useCallback } from "react";

/* =========================================================
   ÇOCUK EKRAN TAKİP SİSTEMİ – STABLE v1.4 (ADD STUDENT FIX)
   ========================================================= */

const STORAGE_KEY = "child_tracker_stable_v12";
const PIN_CODE = "1234";
const WEEKLY_STAR_LIMIT = 7;

const PERIODS = [
  { id: "sabah", label: "Sabah", icon: "🌅" },
  { id: "ogle", label: "Öğle", icon: "☀️" },
  { id: "aksam", label: "Akşam", icon: "🌙" },
];

const createProfile = (name) => ({
  id: Date.now(),
  name,
  dailyLimit: 120,
  periods: { sabah: 0, ogle: 0, aksam: 0 },
  history: [],
  weeklyStars: 0,
  weekKey: getWeekKey(),
  dayLocked: false,
  dailyQuote: "Bugün elinden gelenin en iyisini yap!",
});

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekKey() {
  const d = new Date();
  const first = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - first) / 86400000) + first.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("BUGÜN");
  const [mode, setMode] = useState("student");
  const [isLoaded, setIsLoaded] = useState(false);

  /* === ÖĞRENCİ EKLEME FIX STATE === */
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");

  /* ===== SAYAÇ DURUMLARI ===== */
  const [timerMode, setTimerMode] = useState("STOP");
  const [timerTarget, setTimerTarget] = useState("sabah");
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  /* ===== VERİ YÜKLEME ===== */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d?.profiles?.length) {
          setProfiles(d.profiles);
          setActiveId(d.activeId || d.profiles[0].id);
        } else {
          const p = createProfile("Öğrenci 1");
          setProfiles([p]);
          setActiveId(p.id);
        }
      } catch {
        const p = createProfile("Öğrenci 1");
        setProfiles([p]);
        setActiveId(p.id);
      }
    } else {
      const p = createProfile("Öğrenci 1");
      setProfiles([p]);
      setActiveId(p.id);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeId }));
    }
  }, [profiles, activeId, isLoaded]);

  const user = profiles.find(p => p.id === activeId);

  /* ===== SAYAÇ ===== */
  const stopTimer = useCallback(() => {
    setTimerMode("STOP");
    setSeconds(0);
    setCountdown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const addMinute = useCallback((pid, val) => {
    setProfiles(ps => ps.map(p => {
      if (p.id === activeId && !p.dayLocked) {
        return {
          ...p,
          periods: {
            ...p.periods,
            [pid]: Math.max(0, (p.periods[pid] || 0) + val),
          },
        };
      }
      return p;
    }));
  }, [activeId]);

  /* ===== TAB ===== */
  const handleTabChange = (targetTab) => {
    if (targetTab === "AYARLAR") {
      if (mode === "student") {
        const inputPin = prompt("Veli PIN kodunu giriniz (Varsayılan: 1234):");
        if (inputPin === PIN_CODE) {
          setMode("teacher");
          setTab("AYARLAR");
        }
      } else {
        setTab("AYARLAR");
      }
    } else {
      setTab(targetTab);
    }
  };

  if (!isLoaded || !user) {
    return <div className="min-h-screen flex items-center justify-center text-white">Yükleniyor…</div>;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-5 max-w-md mx-auto pb-24">

      {/* PROFİL SEÇİCİ */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => { stopTimer(); setActiveId(p.id); }}
            className={`px-4 py-2 rounded-full text-xs font-bold border ${
              activeId === p.id
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {p.name}
          </button>
        ))}

        {/* + BUTONU (FIX) */}
        <button
          onClick={() => {
            setNewStudentName("");
            setShowAddStudent(true);
          }}
          className="px-4 py-2 rounded-full bg-slate-800 border border-dashed border-slate-500 text-white font-bold"
        >
          +
        </button>
      </div>

      {/* SEKME */}
      <div className="flex bg-slate-900 p-1 rounded-xl mb-8">
        {["BUGÜN", "ANALİZ", "AYARLAR"].map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-3 rounded-lg text-xs font-black ${
              tab === t ? "bg-slate-800 text-white" : "text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* === ÖĞRENCİ EKLEME MODAL === */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center">
          <div className="bg-slate-900 p-6 rounded-2xl w-[90%] max-w-sm border border-slate-700">
            <h3 className="font-black mb-4">Yeni Öğrenci</h3>

            <input
              autoFocus
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="Öğrenci adı"
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newStudentName.trim()) {
                  const p = createProfile(newStudentName.trim());
                  setProfiles(ps => [...ps, p]);
                  setActiveId(p.id);
                  setShowAddStudent(false);
                }
              }}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowAddStudent(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 font-black"
              >
                Vazgeç
              </button>

              <button
                onClick={() => {
                  if (!newStudentName.trim()) return;
                  const p = createProfile(newStudentName.trim());
                  setProfiles(ps => [...ps, p]);
                  setActiveId(p.id);
                  setShowAddStudent(false);
                }}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
