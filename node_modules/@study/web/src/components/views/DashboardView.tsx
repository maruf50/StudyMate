import type { InterestSegment } from "../../types";
import type { User } from "../../api";
import { Star, Clock, Users, BookMarked } from "lucide-react";

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
  const isProfileComplete =
    props.user?.university &&
    props.user?.department &&
    props.user?.interests &&
    props.user.interests.length > 0 &&
    props.user?.availability &&
    props.user.availability.length > 0;

  // Generate avatar color based on user ID
  function getAvatarColor(userId?: string) {
    if (!userId) return "hsl(280, 100%, 60%)";
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 75%, 55%)`;
  }

  // Get user initials
  function getUserInitials(username?: string) {
    if (!username) return "U";
    return username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const avatarColor = getAvatarColor(props.user?.id);
  const initials = getUserInitials(props.user?.username);

  return (
    <main className="view">
      {/* Welcome Card */}
      <section className="panel welcome-panel">
        <div className="welcome-content">
          <div className="welcome-header">
            <div className="user-avatar" style={{ background: avatarColor }}>
              {initials}
            </div>
            <div>
              <h2>Welcome back, {props.user?.username}! 👋</h2>
              <p className="subtitle">{props.user?.email}</p>
            </div>
          </div>
          {!isProfileComplete && (
            <div className="completion-badge">
              <span className="badge-icon">⚠️</span>
              <span>Complete your profile to improve matching</span>
            </div>
          )}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="stats-grid">
        <div className="stat-card">
          <Star className="stat-icon" />
          <div className="stat-content">
            <small>Total XP</small>
            <strong>{props.user?.totalXp ?? 0}</strong>
          </div>
        </div>
        <div className="stat-card">
          <Clock className="stat-icon" />
          <div className="stat-content">
            <small>Study Hours</small>
            <strong>{props.studyHours}h</strong>
          </div>
        </div>
        <div className="stat-card">
          <Users className="stat-icon" />
          <div className="stat-content">
            <small>Friends</small>
            <strong>{props.friends?.length ?? 0}</strong>
          </div>
        </div>
        <div className="stat-card">
          <BookMarked className="stat-icon" />
          <div className="stat-content">
            <small>Study Groups</small>
            <strong>{props.groups?.length ?? 0}</strong>
          </div>
        </div>
      </section>

      {/* Profile Setup Section */}
      <section className="panel">
        <h2>📋 Profile Setup</h2>
        <p className="section-subtitle">Complete your profile to get better study group matches</p>
        <div className="profile-form">
          <div className="form-group">
            <label>University</label>
            <input
              type="text"
              placeholder="e.g., Stanford University"
              value={props.universityInput}
              onChange={(e) => props.onUniversityInputChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Department / Major</label>
            <input
              type="text"
              placeholder="e.g., Computer Science"
              value={props.departmentInput}
              onChange={(e) => props.onDepartmentInputChange(e.target.value)}
            />
          </div>
          <button className="btn-primary save-button" onClick={props.onSaveProfile}>
            💾 Save Profile Changes
          </button>
        </div>
      </section>

      <section className="panel interest-panel">
        <div className="interest-panel-header">
          <div>
            <h2>🎯 Interest Preferences</h2>
            <p className="section-subtitle">
              Select one or more topics so you and other students can find each other by what you study.
            </p>
          </div>
          <div className="interest-count-badge">{props.selectedInterestTopics.length} selected</div>
        </div>

        <div className="interest-chip-grid" role="list" aria-label="Interest options">
          {props.interestOptions.map((topic) => {
            const isSelected = props.selectedInterestTopics.includes(topic);

            return (
              <button
                key={topic}
                type="button"
                className={isSelected ? "interest-chip active" : "interest-chip"}
                onClick={() => props.onToggleInterestTopic(topic)}
                aria-pressed={isSelected}
              >
                {topic}
              </button>
            );
          })}
        </div>

        <div className="interests-list">
          <h4>Selected Interests</h4>
          {props.selectedInterestTopics.length === 0 ? (
            <p className="interest-empty-state">Choose a few interests to improve matching.</p>
          ) : (
            <div className="interests-tags">
              {props.selectedInterestTopics.map((topic) => (
                <span key={topic} className="interest-tag active">
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Progress Section */}
      <section className="panel">
        <h2>📊 Progress Toward Goals</h2>
        <div className="metric-row">
          <div className="metric-head">
            <strong>XP Progress</strong>
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
            <strong>Study Hours</strong>
            <span className="progress-text">
              {props.studyHours} / {props.studyHoursGoal} hours
            </span>
          </div>
          <div className="progress-track" aria-label="Study hour progress">
            <div className="progress-fill hours" style={{ width: `${props.hoursProgress}%` }} />
          </div>
        </div>
      </section>

      {/* Interest Distribution */}
      {props.interestChart.segments.length > 0 && (
        <section className="panel">
          <h2>🎯 Interest Distribution</h2>
          <div className="interest-layout">
            <div className="interest-pie" style={{ background: props.interestChart.background }} />
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
        </section>
      )}

      {/* Academic Info */}
      <section className="panel">
        <h2>🏫 Academic Information</h2>
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
      </section>
    </main>
  );
}
