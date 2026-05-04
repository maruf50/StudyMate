import { useEffect, useState } from "react";
import {
  getMe,
  getStats,
  saveProfile
} from "./api";
import type { User } from "./api";
import { MainNav } from "./components/MainNav";
import { DashboardView } from "./components/views/DashboardView";
import { NotesView } from "./components/views/NotesView";
import { ChatView } from "./components/views/ChatView";
import { NAV_ITEMS, STUDY_HOURS_GOAL, XP_GOAL } from "./constants";
import type { View } from "./types";
import { buildInterestChart, uniqueInterestTopics } from "./utils";
import type { NoteSummary } from "./types";
import type { Message } from "./types";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [notes, setNotes] = useState<NoteSummary[]>([
    { id: "1", title: "Study group ideas" },
    { id: "2", title: "Exam prep checklist" }
  ]);
  const [globalMessages, setGlobalMessages] = useState<Message[]>([
    {
      id: "m1",
      username: "StudyBot",
      content: "Welcome to global chat.",
      groupId: null,
      createdAt: new Date().toISOString()
    }
  ]);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("g1");
  const [activeSessionId, setActiveSessionId] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [groupChatInput, setGroupChatInput] = useState("");

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

  function onAddNote() {
    setNotes((currentNotes) => [
      ...currentNotes,
      {
        id: String(Date.now()),
        title: `Sample note ${currentNotes.length + 1}`
      }
    ]);
  }

  function onSendGlobalChat() {
    if (!chatInput.trim()) {
      return;
    }

    setGlobalMessages((current) => [
      ...current,
      {
        id: String(Date.now()),
        username: user?.username || "Student",
        content: chatInput.trim(),
        groupId: null,
        createdAt: new Date().toISOString()
      }
    ]);
    setChatInput("");
  }

  function onSendGroupChat() {
    if (!groupChatInput.trim() || !selectedGroupId) {
      return;
    }

    if (!activeSessionId) {
      setActiveSessionId(`s${Date.now()}`);
    }

    setGroupMessages((current) => [
      ...current,
      {
        id: String(Date.now()),
        username: user?.username || "Student",
        content: groupChatInput.trim(),
        groupId: selectedGroupId,
        createdAt: new Date().toISOString()
      }
    ]);
    setGroupChatInput("");
  }

  return (
    <div className="page">
      <div className="app-shell">
        <MainNav navItems={NAV_ITEMS} activeView={activeView} onNavigate={setActiveView} onLogout={onLogout} />

        <section className="workspace">
          <header className="topbar">
            <div>
              <h2>{activeView === "notes" ? "Notes" : activeView === "chat" ? "Chat" : "Dashboard"}</h2>
              <p>
                {activeView === "notes"
                  ? "Your saved notes and study reminders"
                  : activeView === "chat"
                    ? "Talk with everyone or your study group"
                    : `${user?.university || "University"} • ${user?.department || "Department"}`}
              </p>
            </div>
            <div className="topbar-actions">
              {activeView === "notes" ? (
                <>
                  <span className="top-chip">{notes.length} notes</span>
                  <span className="top-chip">Click add to create one</span>
                </>
              ) : activeView === "chat" ? (
                <>
                  <span className="top-chip">{globalMessages.length} global</span>
                  <span className="top-chip">{groupMessages.length} group</span>
                </>
              ) : (
                <>
                  <span className="top-chip">{user?.username || "Student"}</span>
                  <span className="top-chip">{statsText}</span>
                </>
              )}
            </div>
          </header>

          {activeView === "notes" ? (
            <NotesView notes={notes} onAddNote={onAddNote} />
          ) : activeView === "chat" ? (
            <ChatView
              globalMessages={globalMessages}
              groupMessages={groupMessages}
              selectedGroupId={selectedGroupId}
              activeSessionId={activeSessionId}
              chatInput={chatInput}
              groupChatInput={groupChatInput}
              onChatInputChange={setChatInput}
              onGroupChatInputChange={setGroupChatInput}
              onSendGlobalChat={onSendGlobalChat}
              onSendGroupChat={onSendGroupChat}
            />
          ) : (
            <>
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
