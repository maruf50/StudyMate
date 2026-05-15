import { useEffect, useState } from "react";
import {
  createGroup,
  getGroups,
  getMatches,
  getMe,
  getStats,
  joinGroup,
  saveProfile
} from "./api";
import type { User } from "./api";
import { MainNav } from "./components/MainNav";
import { DashboardView } from "./components/views/DashboardView";
import { GroupsView } from "./components/views/GroupsView";
import { NotesView } from "./components/views/NotesView";
import { ChatView } from "./components/views/ChatView";
import { MatchingView } from "./components/views/MatchingView";
import { TrackerView } from "./components/views/TrackerView";
import { NAV_ITEMS, STUDY_HOURS_GOAL, XP_GOAL } from "./constants";
import type { View } from "./types";
import { buildInterestChart, filterMatchesByInterest, uniqueInterestTopics } from "./utils";
import type { GroupSummary } from "./types";
import type { NoteSummary } from "./types";
import type { Message } from "./types";
import type { MatchCandidate } from "./types";

type ApiGroup = {
  id: string;
  name: string;
  topic: string;
  description: string;
  memberIds: string[];
};

const VIEW_PATHS: Record<View, string> = {
  dashboard: "/dashboard",
  matching: "/matching",
  groups: "/groups",
  notes: "/notes",
  chat: "/chat",
  tracker: "/tracker"
};

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Your study profile, progress, and setup" },
  matching: { title: "Matching", subtitle: "Find best-fit teammates and create a study session" },
  groups: { title: "Groups", subtitle: "Create, join, and manage study groups" },
  notes: { title: "Notes", subtitle: "Your saved notes and study reminders" },
  chat: { title: "Chat", subtitle: "Talk with everyone or your study group" },
  tracker: { title: "Tracker", subtitle: "Monitor your study sessions and progress" }
};

function getViewFromPath(pathname: string): View {
  const segment = pathname.split("/").filter(Boolean)[0];

  if (
    segment === "dashboard" ||
    segment === "matching" ||
    segment === "groups" ||
    segment === "notes" ||
    segment === "chat" ||
    segment === "tracker"
  ) {
    return segment;
  }

  return "dashboard";
}

function mapGroupsToSummaries(groups: ApiGroup[], user: User | null, selectedGroupId: string, activeSessionId: string): GroupSummary[] {
  return groups.map((group) => {
    const memberCount = group.memberIds.length;
    const isMember = Boolean(user && group.memberIds.includes(user.id));
    const hasCapacity = memberCount < 6;
    const isActive = group.id === selectedGroupId && Boolean(activeSessionId);

    return {
      id: group.id,
      name: group.name,
      memberCount,
      maxMembers: 6,
      studyTopic: group.topic,
      studyDescription: group.description,
      leaderName: user?.username || "Study Lead",
      totalStudyMinutes: memberCount * 45,
      isActive,
      activeSessionCount: isActive ? 1 : 0,
      hasCapacity,
      isMember,
      canJoin: hasCapacity && !isMember
    };
  });
}

function App() {
  return <AppShell />;
}

function AppShell() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<View>(() => getViewFromPath(window.location.pathname));
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
  const [selectedGroupId, setSelectedGroupId] = useState("");
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
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupName, setGroupName] = useState("Study Group");
  const [groupTopic, setGroupTopic] = useState("math");
  const [groupDescription, setGroupDescription] = useState("Focused evening study session");

  const [interestInput, setInterestInput] = useState("math");
  const [universityInput, setUniversityInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(getViewFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (window.location.pathname !== VIEW_PATHS[activeView]) {
      window.history.replaceState({}, "", VIEW_PATHS[activeView]);
    }
  }, [activeView]);

  useEffect(() => {
    void refreshCoreData();
  }, []);

  async function refreshCoreData(): Promise<void> {
    const [me, statsData, matchesData, groupsData] = await Promise.all([
      getMe(),
      getStats(),
      getMatches(),
      getGroups()
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

    setGroups(mapGroupsToSummaries(groupsData.groups as ApiGroup[], me.user || null, selectedGroupId, activeSessionId));

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
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const visibleGroupMessages = groupMessages.filter((message) => message.groupId === selectedGroupId);

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

  function onNavigate(view: View) {
    window.history.pushState({}, "", VIEW_PATHS[view]);
    setActiveView(view);
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

  async function onCreateGroup() {
    const name = groupName.trim() || "Study Group";
    const topic = groupTopic.trim() || "general";
    const description = groupDescription.trim() || "Focused study session";

    const response = await createGroup({
      name,
      topic,
      description
    });

    setSelectedGroupId(response.group.id);
    setGroupName("Study Group");
    setGroupTopic("math");
    setGroupDescription("Focused evening study session");
    await refreshCoreData();
  }

  async function onJoinGroup(groupId: string) {
    await joinGroup(groupId);
    setSelectedGroupId(groupId);
    await refreshCoreData();
  }

  function onOpenGroupChat(groupId: string) {
    setSelectedGroupId(groupId);
    window.history.pushState({}, "", VIEW_PATHS.chat);
    setActiveView("chat");
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
    window.history.pushState({}, "", VIEW_PATHS.chat);
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

  const headerSubtitle =
    activeView === "dashboard"
      ? `${user?.university || "University"} • ${user?.department || "Department"}`
      : VIEW_META[activeView].subtitle;

  const topbarChips =
    activeView === "notes"
      ? [`${notes.length} notes`, "Click add to create one"]
      : activeView === "matching"
        ? [`${filteredMatches.length} candidates`, `${selectedMatchUserIds.length} selected`]
        : activeView === "groups"
          ? [`${groups.length} groups`, selectedGroupId ? `Active ${selectedGroupId}` : "No active group"]
          : activeView === "tracker"
            ? [trackerSessionId ? "Session Active" : "No Session"]
            : activeView === "chat"
              ? [`${globalMessages.length} global`, selectedGroup ? selectedGroup.name : "No active group"]
              : [user?.username || "Student", statsText];

  return (
    <div className="page">
      <div className="app-shell">
        <MainNav navItems={NAV_ITEMS} activeView={activeView} onNavigate={onNavigate} onLogout={onLogout} />

        <section className="workspace">
          <header className="topbar">
            <div>
              <h2>{VIEW_META[activeView].title}</h2>
              <p>{headerSubtitle}</p>
            </div>
            <div className="topbar-actions">
              {topbarChips.map((chip) => (
                <span key={chip} className="top-chip">
                  {chip}
                </span>
              ))}
            </div>
          </header>

          {activeView === "dashboard" ? (
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
          ) : activeView === "groups" ? (
            <GroupsView
              groupName={groupName}
              groupTopic={groupTopic}
              groupDescription={groupDescription}
              groups={groups}
              onGroupNameChange={setGroupName}
              onGroupTopicChange={setGroupTopic}
              onGroupDescriptionChange={setGroupDescription}
              onCreateGroup={onCreateGroup}
              onJoinGroup={onJoinGroup}
              onOpenGroupChat={onOpenGroupChat}
            />
          ) : activeView === "notes" ? (
            <NotesView notes={notes} onAddNote={onAddNote} />
          ) : activeView === "chat" ? (
            <ChatView
              groups={groups}
              globalMessages={globalMessages}
              groupMessages={visibleGroupMessages}
              selectedGroupId={selectedGroupId}
              selectedGroup={selectedGroup}
              activeSessionId={activeSessionId}
              chatInput={chatInput}
              groupChatInput={groupChatInput}
              onChatInputChange={setChatInput}
              onGroupChatInputChange={setGroupChatInput}
              onSendGlobalChat={onSendGlobalChat}
              onSendGroupChat={onSendGroupChat}
              onSelectGroup={setSelectedGroupId}
            />
          ) : (
            <TrackerView
              statsText={statsText}
              xpProgress={xpProgress}
              hoursProgress={hoursProgress}
              activeSessionId={trackerSessionId}
              onStartSession={onStartSession}
              onEndSession={onEndSession}
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
