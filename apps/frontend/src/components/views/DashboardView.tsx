import type { InterestSegment } from "../../types";
import type { User } from "../../api";

type DashboardViewProps = {
  user: User | null;
  statsText: string;
  xpGoal: number;
  studyHoursGoal: number;
  xpProgress: number;
  hoursProgress: number;
  studyHours: number;
  interestChart: { background: string; segments: InterestSegment[] };
  interestInput: string;
  universityInput: string;
  departmentInput: string;
  onInterestInputChange: (value: string) => void;
  onUniversityInputChange: (value: string) => void;
  onDepartmentInputChange: (value: string) => void;
  onSaveProfile: () => void;
};

export function DashboardView(props: DashboardViewProps) {
  const nameHighlight = {
    label: "Name",
    value: props.user?.username || "Unknown user",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.01-8 4.5V20h16v-1.5c0-2.49-3.58-4.5-8-4.5Z" />
      </svg>
    ),
  };

  const profileHighlights = [
    {
      key: "university",
      label: "University",
      value: props.user?.university || "Not set",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 9.5L12 5l9 4.5-9 4.5-9-4.5Zm3 3.2V16c0 1.2 2.7 2.5 6 2.5s6-1.3 6-2.5v-3.3l-6 3-6-3Z" />
        </svg>
      ),
    },
    {
      key: "department",
      label: "Department",
      value: props.user?.department || "Not set",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 5h16v14H4V5Zm2 2v10h12V7H6Zm2 2h3v3H8V9Zm0 4h3v2H8v-2Zm5-4h3v6h-3V9Z" />
        </svg>
      ),
    },
  ];

  const progressHighlights = [
    {
      key: "xp",
      label: "XP",
      value: `${props.user?.totalXp ?? 0}`,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 3Z" />
        </svg>
      ),
    },
    {
      key: "hours",
      label: "Total Time",
      value: `${props.studyHours}h`,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5h-2v6l4.7 2.8 1-1.7-3.7-2.1V7Z" />
        </svg>
      ),
    },
  ];

  return (
    <main className="view">
      <section className="panel">
        <h2>Welcome back</h2>
        <div className="welcome-name-row">
          <article className="welcome-highlight-item welcome-name-item" aria-label={`Name: ${nameHighlight.value}`}>
            <span className="welcome-highlight-icon">{nameHighlight.icon}</span>
            <div>
              <small>{nameHighlight.label}</small>
              <strong>{nameHighlight.value}</strong>
            </div>
          </article>
        </div>
        <p className="welcome-email">{props.user?.email}</p>
        <div className="welcome-group-block">
          <h3>Academic Info</h3>
          <div className="welcome-highlight-grid">
            {profileHighlights.map((item) => (
              <article key={item.key} className="welcome-highlight-item" aria-label={`${item.label}: ${item.value}`}>
                <span className="welcome-highlight-icon">{item.icon}</span>
                <div>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="welcome-group-block">
          <h3>Progress</h3>
          <div className="welcome-highlight-grid welcome-highlight-grid.progress">
            {progressHighlights.map((item) => (
              <article key={item.key} className="welcome-highlight-item" aria-label={`${item.label}: ${item.value}`}>
                <span className="welcome-highlight-icon">{item.icon}</span>
                <div>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
        <p className="welcome-summary">{props.statsText}</p>
      </section>
      <section className="panel">
        <h2>Quick Setup</h2>
        <p>Set university, department, interests, and schedule to improve matching quality.</p>
        <div className="row">
          <input
            placeholder="University"
            value={props.universityInput}
            onChange={(e) => props.onUniversityInputChange(e.target.value)}
          />
          <input
            placeholder="Department"
            value={props.departmentInput}
            onChange={(e) => props.onDepartmentInputChange(e.target.value)}
          />
          <input value={props.interestInput} onChange={(e) => props.onInterestInputChange(e.target.value)} />
          <button onClick={props.onSaveProfile}>Save Interests + Schedule</button>
        </div>
      </section>
      <section className="panel">
        <h2>Progress Overview</h2>
        <div className="metric-row">
          <div className="metric-head">
            <strong>XP</strong>
            <span>
              {props.user?.totalXp ?? 0} / {props.xpGoal}
            </span>
          </div>
          <div className="progress-track" aria-label="XP progress">
            <div className="progress-fill xp" style={{ width: `${props.xpProgress}%` }} />
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-head">
            <strong>Total Study Hours</strong>
            <span>
              {props.studyHours}h / {props.studyHoursGoal}h
            </span>
          </div>
          <div className="progress-track" aria-label="Study hour progress">
            <div className="progress-fill hours" style={{ width: `${props.hoursProgress}%` }} />
          </div>
        </div>
      </section>
      <section className="panel">
        <h2>Interest Distribution</h2>
        <div className="interest-layout">
          <div className="interest-pie" style={{ background: props.interestChart.background }} />
          <ul className="interest-legend">
            {props.interestChart.segments.length === 0 ? (
              <li>No interests added yet.</li>
            ) : (
              props.interestChart.segments.map((segment) => (
                <li key={segment.topic}>
                  <span className="swatch" style={{ background: segment.color }} />
                  {segment.topic} ({segment.percent}%)
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
      
    </main>
  );
}
