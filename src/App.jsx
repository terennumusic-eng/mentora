import { useEffect, useRef, useState, useCallback } from "react";

/* =========================================================
   ÇOCUK EKRAN TAKİP SİSTEMİ – STABLE v1.4 (PATCHED STEP 1)
   ========================================================= */

const STORAGE_KEY = "child_tracker_stable_v12";
const PIN_CODE = "1234";
const WEEKLY_STAR_LIMIT = 7;

const PERIODS = [
  { id: "sabah", label: "Sabah", icon: "🌅" },
  { id: "ogle", label: "Öğle", icon: "☀️" },
  { id: "aksam", label: "Akşam", icon: "🌙" },
];

const createProfile = (name: string) => ({
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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [tab, setTab] = useState("BUGÜN");
  const [mode, setMode] = useState("student");
  const [isLoaded, setIsLoaded] = useState(false);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");

  const [timerMode, setTimerMode] = useState("STOP");
  const [timerTarget, setTimerTarget] = useState("sabah");
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<any>(null);

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

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles, activeId }));
    }
  }, [profiles, activeId, isLoaded]);

  const user = profiles.find(p => p.id === activeId);

  const stopTimer = useCallback(() => {
    setTimerMode("STOP");
    setSeconds(0);
    setCountdown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const addMinute = useCallback((pid: string, val: number) => {
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

  const handleTabChange = (t: string) => {
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

  const totalUsed = Object.values(user.periods).reduce((a: any, b: any) => a + b, 0);
  const remaining = Math.max(0, user.dailyLimit - totalUsed);

  const handleLockDay = () => {
    if (user.dayLocked) return;
    const hasFullTime = totalUsed >= user.dailyLimit;
    if (hasFullTime && user.weeklyStars < WEEKLY_STAR_LIMIT) {
      setProfiles(ps =>
        ps.map(p =>
          p.id === activeId ? { ...p, dayLocked: true, weeklyStars: p.weeklyStars + 1 } : p
        )
      );
      alert("🌟 Tebrikler! Bir yıldız kazandın!");
    }
  };

  const deleteProfile = (id: number) => {
    if (profiles.length === 1) {
      alert("En az bir profil olmalı!");
      return;
    }
    const filtered = profiles.filter(p => p.id !== id);
    setProfiles(filtered);
    if (activeId === id) setActiveId(filtered[0].id);
  };

  const updateLimit = (val: number) => {
    setProfiles(ps =>
      ps.map(p => (p.id === activeId ? { ...p, dailyLimit: Math.max(30, val) } : p))
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-5 max-w-md mx-auto relative pb-24">

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={`px-3 py-2 rounded-full whitespace-nowrap ${p.id === activeId ? "bg-blue-600" : "bg-slate-800"}`}
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

      <div className="flex mb-6 bg-slate-900 rounded-lg overflow-hidden">
        {["BUGÜN", "ANALİZ", "AYARLAR"].map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-3 transition ${tab === t ? "bg-blue-600" : "hover:bg-slate-800"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "BUGÜN" && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-400">Günlük Limit</span>
              <span className="text-2xl font-bold">{user.dailyLimit} dk</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all"
                style={{ width: `${Math.min(100, (totalUsed / user.dailyLimit) * 100)}%` }}
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-lg">{totalUsed} dk kullanıldı</span>
              <span className="text-slate-400"> / {remaining} dk kaldı</span>
            </div>
          </div>

          <div className="space-y-3">
            {PERIODS.map(period => (
              <div key={period.id} className="bg-slate-900 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{period.icon}</span>
                    <span className="font-semibold">{period.label}</span>
                  </div>
                  <span className="text-xl font-bold text-blue-400">
                    {user.periods[period.id] || 0} dk
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addMinute(period.id, -5)}
                    disabled={user.dayLocked}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 py-2 rounded"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => addMinute(period.id, -1)}
                    disabled={user.dayLocked}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 py-2 rounded"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => addMinute(period.id, 1)}
                    disabled={user.dayLocked}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 py-2 rounded"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => addMinute(period.id, 5)}
                    disabled={user.dayLocked}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 py-2 rounded"
                  >
                    +5
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-5 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Kronometre</span>
              <select
                value={timerTarget}
                onChange={(e) => setTimerTarget(e.target.value)}
                className="bg-slate-800 px-3 py-1 rounded"
              >
                {PERIODS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center mb-4">
              <div className="text-5xl font-mono font-bold mb-2">
                {timerMode === "BACKWARD"
                  ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
                  : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
              </div>
            </div>

            <div className="flex gap-2">
              {timerMode === "STOP" ? (
                <>
                  <button
                    onClick={() => {
                      setSeconds(0);
                      setTimerMode("FORWARD");
                    }}
                    disabled={user.dayLocked}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 py-3 rounded-lg font-semibold"
                  >
                    İleri Sayaç
                  </button>
                  <button
                    onClick={() => {
                      const mins = prompt("Kaç dakika?");
                      if (mins && !isNaN(Number(mins))) {
                        setCountdown(parseInt(mins) * 60);
                        setTimerMode("BACKWARD");
                      }
                    }}
                    disabled={user.dayLocked}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-lg font-semibold"
                  >
                    Geri Sayım
                  </button>
                </>
              ) : (
                <button
                  onClick={stopTimer}
                  className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold"
                >
                  Durdur
                </button>
              )}
            </div>
          </div>

          {!user.dayLocked && totalUsed >= user.dailyLimit && (
            <button
              onClick={handleLockDay}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 py-4 rounded-xl font-bold text-lg"
            >
              🌟 Günü Tamamla ve Yıldız Kazan
            </button>
          )}

          {user.dayLocked && (
            <div className="bg-green-900/30 border border-green-600 p-4 rounded-xl text-center">
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-semibold">Gün tamamlandı!</div>
            </div>
          )}
        </div>
      )}

      {tab === "ANALİZ" && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl text-center">
            <div className="text-6xl mb-3">
              {"⭐".repeat(user.weeklyStars)}
            </div>
            <div className="text-2xl font-bold mb-1">
              {user.weeklyStars} / {WEEKLY_STAR_LIMIT}
            </div>
            <div className="text-slate-400">Bu haftanın yıldızları</div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl">
            <div className="text-lg font-semibold mb-4">Günlük Özet</div>
            <div className="space-y-3">
              {PERIODS.map(p => (
                <div key={p.id} className="flex justify-between items-center">
                  <span>
                    {p.icon} {p.label}
                  </span>
                  <span className="font-bold">{user.periods[p.id] || 0} dk</span>
                </div>
              ))}
              <div className="border-t border-slate-700 pt-3 flex justify-between items-center font-bold text-lg">
                <span>Toplam</span>
                <span className="text-blue-400">{totalUsed} dk</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl">
            <div className="text-center text-slate-400 italic">"{user.dailyQuote}"</div>
          </div>
        </div>
      )}

      {tab === "AYARLAR" && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-xl">
            <div className="font-semibold mb-4">Günlük Limit Ayarı</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateLimit(user.dailyLimit - 10)}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded"
              >
                -10
              </button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  value={user.dailyLimit}
                  onChange={(e) => updateLimit(parseInt(e.target.value) || 30)}
                  className="w-24 bg-slate-950 text-center py-2 rounded"
                />
                <div className="text-sm text-slate-400 mt-1">dakika</div>
              </div>
              <button
                onClick={() => updateLimit(user.dailyLimit + 10)}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded"
              >
                +10
              </button>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl">
            <div className="font-semibold mb-4">Profil Yönetimi</div>
            <div className="space-y-2">
              {profiles.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-800 p-3 rounded">
                  <span>{p.name}</span>
                  {profiles.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`${p.name} silinsin mi?`)) {
                          deleteProfile(p.id);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                    >
                      Sil
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setMode("student");
              setTab("BUGÜN");
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-semibold"
          >
            Öğrenci Moduna Dön
          </button>
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-slate-900 p-6 rounded-xl w-[90%] max-w-sm">
            <div className="font-semibold mb-4">Yeni Öğrenci Ekle</div>
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
              placeholder="Öğrenci adı giriniz"
              className="w-full p-3 bg-slate-950 rounded text-slate-200"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowAddStudent(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded"
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded"
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
