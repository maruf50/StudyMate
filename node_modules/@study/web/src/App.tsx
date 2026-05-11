import { useEffect, useState } from "react";
import {
  createGroup,
  getMatches,
  getMe,
  getStats,
  saveProfile
} from "./api";
import type { User } from "./api";
import { MainNav } from "./components/MainNav";
import { DashboardView } from "./components/views/DashboardView";
import { NotesView } from "./components/views/NotesView";
import { ChatView } from "./components/views/ChatView";
import { MatchingView } from "./components/views/MatchingView";
import { TrackerView } from "./components/views/TrackerView";
import { NAV_ITEMS, STUDY_HOURS_GOAL, XP_GOAL } from "./constants";
import type { View } from "./types";
import { buildInterestChart, filterMatchesByInterest, uniqueInterestTopics } from "./utils";
import type { NoteSummary } from "./types";
import type { Message } from "./types";
import type { MatchCandidate } from "./types";

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
  const [matchInterest, setMatchInterest] = useState("");
  const [partyGroupName, setPartyGroupName] = useState("Focus Session");
  const [selectedMatchUserIds, setSelectedMatchUserIds] = useState<string[]>([]);
  const [allMatches, setAllMatches] = useState<MatchCandidate[]>([]);
  const [demoCandidates, setDemoCandidates] = useState<MatchCandidate[]>([]);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStatus, setDemoStatus] = useState("Pick users and create a study session group.");
  const [trackerSessionId, setTrackerSessionId] = useState("");

  const [interestInput, setInterestInput] = useState("math");
  const [universityInput, setUniversityInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");

  useEffect(() => {
    void refreshCoreData();
  }, []);

  async function refreshCoreData(): Promise<void> {
    const [me, statsData, matchesData] = await Promise.all([
      getMe(),
      getStats(),
      getMatches()
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

    setAllMatches(
      matchesData.matches.map((candidate, index) => ({
        ...candidate,
        score: Math.max(50, 95 - index * 8)
      }))
    );
  }

  const statsText = !user
    ? "No stats yet"
    : `${Math.round(user.totalStudyMinutes / 60)}h total, ${user.totalXp} XP`;

  const studyHours = user ? Number((user.totalStudyMinutes / 60).toFixed(1)) : 0;

  const xpProgress = !user ? 0 : Math.min(100, Math.round((user.totalXp / XP_GOAL) * 100));

  const hoursProgress = !user ? 0 : Math.min(100, Math.round((studyHours / STUDY_HOURS_GOAL) * 100));

  const interestChart = buildInterestChart(user);
  const availableInterests = uniqueInterestTopics(user);
  const matchingInterests = Array.from(
    new Set([...availableInterests, ...allMatches.flatMap((candidate) => candidate.interests?.map((entry) => entry.topic) || [])])
  );
  const filteredMatches = filterMatchesByInterest(allMatches, matchInterest);

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

  function onToggleMatchUser(userId: string) {
    setSelectedMatchUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  }

  async function onCreatePartyGroup() {
    if (selectedMatchUserIds.length === 0) {
      return;
    }

    const groupName = partyGroupName.trim() || "Focus Session";
    const response = await createGroup({
      name: groupName,
      topic: matchInterest || "general",
      description: "Created from Matching view",
      invitedUserIds: selectedMatchUserIds
    });

    setSelectedGroupId(response.group.id);
    setActiveView("chat");
    setDemoStatus(`Created group \"${response.group.name}\" with ${selectedMatchUserIds.length} invite(s).`);
    setSelectedMatchUserIds([]);
  }

  function onStartMatchmakingDemo() {
    setIsDemoRunning(true);
    setDemoStatus("Searching for the best study partners...");

    window.setTimeout(() => {
      const candidates = filteredMatches.slice(0, 3);
      setDemoCandidates(candidates);
      setDemoStatus(
        candidates.length > 0
          ? `Found ${candidates.length} candidate(s). Review and create a group.`
          : "No candidates found for this interest."
      );
      setIsDemoRunning(false);
    }, 900);
  }

  function onCreateDemoGroup() {
    if (demoCandidates.length === 0) {
      return;
    }

    setSelectedMatchUserIds(demoCandidates.map((candidate) => candidate.userId));
    setPartyGroupName(`Match Demo ${new Date().toLocaleTimeString()}`);
    setDemoStatus("Demo candidates selected. Click Create Study Session Group.");
  }

  function onStartSession() {
    const sessionId = `session_${Date.now()}`;
    setTrackerSessionId(sessionId);
  }

  function onEndSession() {
    setTrackerSessionId("");
  }

  const headerTitle =
    activeView === "notes"
      ? "Notes"
      : activeView === "chat"
        ? "Chat"
        : activeView === "matching"
          ? "Matching"
          : activeView === "tracker"
            ? "Tracker"
            : "Dashboard";

  const headerSubtitle =
    activeView === "notes"
      ? "Your saved notes and study reminders"
      : activeView === "chat"
        ? "Talk with everyone or your study group"
        : activeView === "matching"
          ? "Find best-fit teammates and create a study session"
          : activeView === "tracker"
            ? "Monitor your study sessions and progress"
            : `${user?.university || "University"} • ${user?.department || "Department"}`;

  return (
    <div className="page">
      <div className="app-shell">
        <MainNav navItems={NAV_ITEMS} activeView={activeView} onNavigate={setActiveView} onLogout={onLogout} />

        <section className="workspace">
          <header className="topbar">
            <div>
              <h2>{headerTitle}</h2>
              <p>{headerSubtitle}</p>
            </div>
            <div className="topbar-actions">
              {activeView === "notes" ? (
                <>
                  <span className="top-chip">{notes.length} notes</span>
                  <span className="top-chip">Click add to create one</span>
                </>
              ) : activeView === "matching" ? (
                <>
                  <span className="top-chip">{filteredMatches.length} candidates</span>
                  <span className="top-chip">{selectedMatchUserIds.length} selected</span>
                </>
              ) : activeView === "tracker" ? (
                <>
                  <span className="top-chip">{trackerSessionId ? "Session Active" : "No Session"}</span>
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
          ) : activeView === "matching" ? (
            <MatchingView
              matchInterest={matchInterest}
              availableInterests={matchingInterests}
              partyGroupName={partyGroupName}
              selectedMatchUserIds={selectedMatchUserIds}
              filteredMatches={filteredMatches}
              demoCandidates={demoCandidates}
              isDemoRunning={isDemoRunning}
              demoStatus={demoStatus}
              onMatchInterestChange={setMatchInterest}
              onPartyGroupNameChange={setPartyGroupName}
              onToggleMatchUser={onToggleMatchUser}
              onStartMatchmakingDemo={onStartMatchmakingDemo}
              onCreateDemoGroup={onCreateDemoGroup}
              onCreatePartyGroup={onCreatePartyGroup}
            />
          ) : activeView === "tracker" ? (
            <TrackerView
              statsText={statsText}
              xpProgress={xpProgress}
              hoursProgress={hoursProgress}
              activeSessionId={trackerSessionId}
              onStartSession={onStartSession}
              onEndSession={onEndSession}
            />
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
