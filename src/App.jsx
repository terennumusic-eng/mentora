import { useEffect, useRef, useState, useCallback } from "react";

/* =========================================================
   ÇOCUK EKRAN TAKİP SİSTEMİ – STABLE v1.4
   PATCH 1: Öğrenci ekleme (prompt → modal)
   SAF JS (App.jsx uyumlu)
   ========================================================= */

const STORAGE_KEY = "child_tracker_stable_v12";
const PIN_CODE = "1234";
const WEEKLY_STAR_LIMIT = 7;

const PERIODS = [
  { id: "sabah", label: "Sabah", icon: "🌅" },
  { id: "ogle", label: "Öğle", icon: "☀️" },
  { id: "aksam", label: "Akşam", icon: "🌙" },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekKey() {
  const d = new Date();
  const first = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - first) / 86400000) + first.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

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

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("BUGÜN");
  const [mode, setMode] = useState("student");
  const [isLoaded, setIsLoaded] = useState(false);

  /* PATCH 1 STATES */
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");

  /* TIMER */
  const [timerMode, setTimerMode] = useState("STOP");
  const [timerTarget, setTimerTarget] = useState("sabah");
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  /* LOAD */
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (Array.isArray(d.profiles) && d.profiles.length) {
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

  /* SAVE */
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeId }));
    }
  }, [profiles, activeId, isLoaded]);

  const user = profiles.find(p => p.id === activeId);

  /* TIMER HELPERS */
  const stopTimer = useCallback(() => {
    setTimerMode("STOP");
    setSeconds(0);
    setCountdown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const addMinute = useCallback((pid, val) => {
    setProfiles(ps =>
      ps.map(p =>
        p.id === activeId && !p.dayLocked
          ? {
              ...p,
              periods: {
                ...p.periods,
                [pid]: Math.max(0, (p.periods[pid] || 0) + val),
              },
            }
          : p
      )
    );
  }, [activeId]);

  useEffect(() => {
    if (timerMode === "STOP") return;

    timerRef.current = setInterval(() => {
      if (timerMode === "FORWARD") {
        setSeconds(s => {
          if (s >= 59) {
            addMinute(timerTarget, 1);
            return 0;
          }
          return s + 1;
        });
      }

      if (timerMode === "BACKWARD") {
        setCountdown(c => {
          if (c <= 1) {
            stopTimer();
            return 0;
          }
          if (c % 60 === 0) addMinute(timerTarget, 1);
          return c - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerMode, timerTarget, addMinute, stopTimer]);

  /* TABS */
  const handleTabChange = (t) => {
    if (t === "AYARLAR" && mode === "student") {
      const pin = prompt("Veli PIN kodunu giriniz:");
      if (pin === PIN_CODE) {
        setMode("teacher");
        setTab("AYARLAR");
      }
    } else {
      setTab(t);
    }
  };

  if (!isLoaded || !user) return null;

  const totalUsed = Object.values(user.periods).reduce((a, b) => a + b, 0);
  const remaining = Math.max(0, user.dailyLimit - totalUsed);

  const handleLockDay = () => {
    if (user.dayLocked) return;
    if (totalUsed >= user.dailyLimit && user.weeklyStars < WEEKLY_STAR_LIMIT) {
      setProfiles(ps =>
        ps.map(p =>
          p.id === activeId
            ? { ...p, dayLocked: true, weeklyStars: p.weeklyStars + 1 }
            : p
        )
      );
      alert("🌟 Tebrikler! Bir yıldız kazandın!");
    }
  };

  const deleteProfile = (id) => {
    if (profiles.length === 1) {
      alert("En az bir profil olmalı!");
      return;
    }
    const filtered = profiles.filter(p => p.id !== id);
    setProfiles(filtered);
    if (activeId === id) setActiveId(filtered[0].id);
  };

  const updateLimit = (val) => {
    setProfiles(ps =>
      ps.map(p =>
        p.id === activeId ? { ...p, dailyLimit: Math.max(30, val) } : p
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-5 max-w-md mx-auto relative pb-24">

      {/* PROFILES */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={`px-3 py-2 rounded-full whitespace-nowrap ${
              p.id === activeId ? "bg-blue-600" : "bg-slate-800"
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => {
            setNewStudentName("");
            setShowAddStudent(true);
          }}
          className="px-3 py-2 rounded-full bg-slate-700"
        >
          +
        </button>
      </div>

      {/* TABS */}
      <div className="flex mb-6 bg-slate-900 rounded-lg overflow-hidden">
        {["BUGÜN", "ANALİZ", "AYARLAR"].map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-3 transition ${
              tab === t ? "bg-blue-600" : "hover:bg-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* BUGÜN */}
      {tab === "BUGÜN" && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl">
            <div className="flex justify-between mb-3">
              <span>Günlük Limit</span>
              <span className="text-2xl font-bold">{user.dailyLimit} dk</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${Math.min(100, (totalUsed / user.dailyLimit) * 100)}%` }}
              />
            </div>
            <div className="mt-2 text-center">
              {totalUsed} dk / {remaining} dk
            </div>
          </div>

          {PERIODS.map(p => (
            <div key={p.id} className="bg-slate-900 p-4 rounded-xl">
              <div className="flex justify-between mb-2">
                <span>{p.icon} {p.label}</span>
                <span>{user.periods[p.id]} dk</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => addMinute(p.id, -5)} disabled={user.dayLocked} className="flex-1 bg-slate-800 py-2 rounded">-5</button>
                <button onClick={() => addMinute(p.id, -1)} disabled={user.dayLocked} className="flex-1 bg-slate-800 py-2 rounded">-1</button>
                <button onClick={() => addMinute(p.id, 1)} disabled={user.dayLocked} className="flex-1 bg-slate-800 py-2 rounded">+1</button>
                <button onClick={() => addMinute(p.id, 5)} disabled={user.dayLocked} className="flex-1 bg-slate-800 py-2 rounded">+5</button>
              </div>
            </div>
          ))}

          {!user.dayLocked && totalUsed >= user.dailyLimit && (
            <button onClick={handleLockDay} className="w-full bg-yellow-500 py-4 rounded-xl font-bold">
              🌟 Günü Tamamla
            </button>
          )}
        </div>
      )}

      {/* ANALİZ */}
      {tab === "ANALİZ" && (
        <div className="bg-slate-900 p-5 rounded-xl text-center">
          <div className="text-4xl mb-2">{"⭐".repeat(user.weeklyStars)}</div>
          <div>{user.weeklyStars} / {WEEKLY_STAR_LIMIT}</div>
        </div>
      )}

      {/* AYARLAR */}
      {tab === "AYARLAR" && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-xl">
            <div className="mb-2">Günlük Limit</div>
            <input
              type="number"
              value={user.dailyLimit}
              onChange={(e) => updateLimit(parseInt(e.target.value) || 30)}
              className="w-full bg-slate-950 p-2 rounded"
            />
          </div>

          <div className="bg-slate-900 p-4 rounded-xl space-y-2">
            {profiles.map(p => (
              <div key={p.id} className="flex justify-between items-center">
                <span>{p.name}</span>
                {profiles.length > 1 && (
                  <button onClick={() => deleteProfile(p.id)} className="bg-red-600 px-3 py-1 rounded">
                    Sil
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setMode("student");
              setTab("BUGÜN");
            }}
            className="w-full bg-slate-800 py-3 rounded-xl"
          >
            Öğrenci Moduna Dön
          </button>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-slate-900 p-6 rounded-xl w-[90%] max-w-sm">
            <div className="mb-4 font-semibold">Yeni Öğrenci</div>
            <input
              autoFocus
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newStudentName.trim()) {
                  const p = createProfile(newStudentName.trim());
                  setProfiles(ps => [...ps, p]);
                  setActiveId(p.id);
                  setShowAddStudent(false);
                }
              }}
              className="w-full bg-slate-950 p-3 rounded"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddStudent(false)} className="flex-1 bg-slate-700 py-2 rounded">
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
                className="flex-1 bg-blue-600 py-2 rounded"
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
