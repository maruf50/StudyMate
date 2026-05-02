import { useEffect, useState } from "react";
import {
  getMe,
  getStats,
  saveProfile
} from "./api";
import type { User } from "./api";
import { MainNav } from "./components/MainNav";
import { DashboardView } from "./components/views/DashboardView";
import { NAV_ITEMS, STUDY_HOURS_GOAL, XP_GOAL } from "./constants";
import type { View } from "./types";
import { buildInterestChart, uniqueInterestTopics } from "./utils";

function App() {
  const [user, setUser] = useState<User | null>(null);

  const [interestInput, setInterestInput] = useState("math");
  const [universityInput, setUniversityInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");

  useEffect(() => {
    void refreshCoreData();
  }, []);

  async function refreshCoreData(): Promise<void> {
    const [me, statsData] = await Promise.all([
      getMe(),
      getStats()
    ]);

    setUser((prev) => {
      const base = me.user || prev;
      if (!base) {
        return null;
      }
      return {
        ...base,
        totalStudyMinutes: statsData.totalStudyMinutes ?? base.totalStudyMinutes,
        totalXp: statsData.totalXp ?? base.totalXp
      };
    });
  }

  const statsText = !user
    ? "No stats yet"
    : `${Math.round(user.totalStudyMinutes / 60)}h total, ${user.totalXp} XP`;

  const studyHours = user ? Number((user.totalStudyMinutes / 60).toFixed(1)) : 0;

  const xpProgress = !user ? 0 : Math.min(100, Math.round((user.totalXp / XP_GOAL) * 100));

  const hoursProgress = !user ? 0 : Math.min(100, Math.round((studyHours / STUDY_HOURS_GOAL) * 100));

  const interestChart = buildInterestChart(user);
  const availableInterests = uniqueInterestTopics(user);

  useEffect(() => {
    setUniversityInput(user?.university || "");
    setDepartmentInput(user?.department || "");
  }, [user?.university, user?.department]);

  async function onSaveProfile() {
    const data = await saveProfile({
      university: universityInput,
      department: departmentInput,
      interests: [
        { topic: interestInput, level: "intermediate" },
        { topic: "physics", level: "beginner" }
      ],
      availability: [
        { day: "mon", startHour: 18, endHour: 21 },
        { day: "wed", startHour: 18, endHour: 21 }
      ]
    });

    setUser(data.user || null);
  }

  function onLogout() {
    setUser(null);
  }

  return (
    <div className="page">
      <div className="app-shell">
        <MainNav navItems={NAV_ITEMS} activeView="dashboard" onNavigate={() => {}} onLogout={onLogout} />

        <section className="workspace">
          <header className="topbar">
            <div>
              <h2>Dashboard</h2>
              <p>
                {user?.university || "University"} • {user?.department || "Department"}
              </p>
            </div>
            <div className="topbar-actions">
              <span className="top-chip">{user?.username || "Student"}</span>
              <span className="top-chip">{statsText}</span>
            </div>
          </header>

          <section className="kpi-strip">
            <article className="kpi-card">
              <h4>Total XP</h4>
              <strong>{user?.totalXp ?? 0}</strong>
            </article>
            <article className="kpi-card">
              <h4>Study Hours</h4>
              <strong>{studyHours}h</strong>
            </article>
          </section>

          <DashboardView
            user={user}
            statsText={statsText}
            xpGoal={XP_GOAL}
            studyHoursGoal={STUDY_HOURS_GOAL}
            xpProgress={xpProgress}
            hoursProgress={hoursProgress}
            studyHours={studyHours}
            interestChart={interestChart}
            interestInput={interestInput}
            universityInput={universityInput}
            departmentInput={departmentInput}
            onInterestInputChange={setInterestInput}
            onUniversityInputChange={setUniversityInput}
            onDepartmentInputChange={setDepartmentInput}
            onSaveProfile={onSaveProfile}
          />
        </section>
      </div>
    </div>
  );
}

export default App;
