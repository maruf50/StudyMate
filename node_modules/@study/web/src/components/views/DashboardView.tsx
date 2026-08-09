import type { InterestSegment } from "../../types";
import type { User } from "../../api";
import {
  Star,
  Clock,
  Users,
  BookMarked,
  Target,
  BarChart2,
  GraduationCap,
  Sparkles,
} from "lucide-react";

type DashboardViewProps = {
  user: User | null;
  statsText: string;
  xpGoal: number;
  studyHoursGoal: number;
  xpProgress: number;
  hoursProgress: number;
  studyHours: number;
  interestChart: { background: string; segments: InterestSegment[] };
  interestOptions: string[];
  selectedInterestTopics: string[];
  universityInput: string;
  departmentInput: string;
  onToggleInterestTopic: (topic: string) => void;
  onUniversityInputChange: (value: string) => void;
  onDepartmentInputChange: (value: string) => void;
  onSaveProfile: () => void;
  friends?: Array<{ id: string; username: string; userId: string }>;
  groups?: Array<{ id: string; name: string; memberCount: number }>;
};

export function DashboardView(props: DashboardViewProps) {
  function getUserInitials(username?: string) {
    if (!username) return "U";
    return username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const initials = getUserInitials(props.user?.username);

  return (
    <main className="view dashboard-view">
      {/* Welcome Card */}
      <div className="welcome-panel">
        <div className="user-avatar large">{initials}</div>
        <div className="welcome-text">
          <div className="welcome-heading">
            <h2>Welcome back, {props.user?.username}!</h2>
            <Sparkles size={18} className="section-title-icon" />
          </div>
          <p className="subtitle">{props.user?.email}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap"><Star size={18} /></div>
          <div className="stat-content">
            <small>Total XP</small>
            <strong>{props.user?.totalXp ?? 0}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap"><Clock size={18} /></div>
          <div className="stat-content">
            <small>Study Hours</small>
            <strong>{props.studyHours}h</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap"><Users size={18} /></div>
          <div className="stat-content">
            <small>Friends</small>
            <strong>{props.friends?.length ?? 0}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap"><BookMarked size={18} /></div>
          <div className="stat-content">
            <small>Study Groups</small>
            <strong>{props.groups?.length ?? 0}</strong>
          </div>
        </div>
      </div>

      {/* Interest Preferences */}
      <div className="view-section">
        <div className="section-header">
          <Target size={18} className="section-title-icon" />
          <h3>Interest Preferences</h3>
          <span className="count-badge">{props.selectedInterestTopics.length} selected</span>
        </div>
        <p className="section-desc">
          Select topics to improve study partner matching with other students.
        </p>

        <div className="interest-chip-grid" role="list" aria-label="Interest options">
          {props.interestOptions.map((topic) => {
            const isSelected = props.selectedInterestTopics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                className={`interest-chip ${isSelected ? "active" : ""}`}
                onClick={() => props.onToggleInterestTopic(topic)}
                aria-pressed={isSelected}
              >
                {topic}
              </button>
            );
          })}
        </div>

        {props.selectedInterestTopics.length > 0 && (
          <div className="interests-tags">
            {props.selectedInterestTopics.map((topic) => (
              <span key={topic} className="interest-tag active">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="view-section">
        <div className="section-header">
          <BarChart2 size={18} className="section-title-icon" />
          <h3>Progress Toward Goals</h3>
        </div>

        <div className="tracker-progress-stack">
          <div className="metric-row">
            <div className="metric-head">
              <div className="metric-label-group">
                <Star size={13} />
                <strong>XP Progress</strong>
              </div>
              <span className="progress-text">
                {props.user?.totalXp ?? 0} / {props.xpGoal} XP
              </span>
            </div>
            <div className="progress-track" aria-label="XP progress">
              <div className="progress-fill xp" style={{ width: `${props.xpProgress}%` }} />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-head">
              <div className="metric-label-group">
                <Clock size={13} />
                <strong>Study Hours</strong>
              </div>
              <span className="progress-text">
                {props.studyHours} / {props.studyHoursGoal} hours
              </span>
            </div>
            <div className="progress-track" aria-label="Study hour progress">
              <div className="progress-fill hours" style={{ width: `${props.hoursProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Interest Distribution Chart */}
      {props.interestChart.segments.length > 0 && (
        <div className="view-section interest-chart-section">
          <div className="section-header">
            <h3>Interest Distribution</h3>
          </div>
          <div className="interest-layout">
            <div
              className="interest-pie"
              style={{ background: props.interestChart.background }}
            />
            <ul className="interest-legend">
              {props.interestChart.segments.map((segment) => (
                <li key={segment.topic}>
                  <span className="swatch" style={{ background: segment.color }} />
                  {segment.topic}
                  <span className="percent">{segment.percent}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Academic Info */}
      <div className="view-section">
        <div className="section-header">
          <GraduationCap size={18} className="section-title-icon" />
          <h3>Academic Information</h3>
        </div>
        <div className="academic-grid">
          <div className="academic-card">
            <span className="label">University</span>
            <span className="value">{props.user?.university || "Not set"}</span>
          </div>
          <div className="academic-card">
            <span className="label">Department</span>
            <span className="value">{props.user?.department || "Not set"}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
