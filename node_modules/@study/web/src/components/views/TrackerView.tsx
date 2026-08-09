import { Clock, Zap, PlayCircle, StopCircle, TrendingUp } from "lucide-react";

type TrackerViewProps = {
  statsText: string;
  xpProgress: number;
  hoursProgress: number;
  activeSessionId: string;
  sessionTimerLabel: string;
  onStartSession: () => void;
  onEndSession: () => void;
};

export function TrackerView(props: TrackerViewProps) {
  const isActive = Boolean(props.activeSessionId);

  return (
    <main className="view tracker-view">
      {/* Live Session Banner */}
      {isActive && (
        <div className="session-live-banner">
          <span className="live-pulse" />
          <Zap size={15} />
          <span>
            Session active — <strong>{props.sessionTimerLabel}</strong>
          </span>
        </div>
      )}

      {/* Timer Card */}
      <section className="tracker-timer-card">
        <div className="tracker-timer-icon">
          <Clock size={28} />
        </div>
        <div className="tracker-timer-body">
          <h2>Study Session</h2>
          <p className="tracker-timer-sub">
            {isActive
              ? "Session is running. Stay focused!"
              : "Start a session to begin tracking your study time."}
          </p>
          <div className="tracker-timer-display">
            {isActive ? props.sessionTimerLabel : "00:00:00"}
          </div>
          <div className="tracker-session-actions">
            <button
              className="btn-primary tracker-btn"
              onClick={props.onStartSession}
              disabled={isActive}
            >
              <PlayCircle size={18} />
              Start Session
            </button>
            <button
              className="btn-secondary tracker-btn"
              onClick={props.onEndSession}
              disabled={!isActive}
            >
              <StopCircle size={18} />
              End Session
            </button>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      <section className="view-section">
        <div className="section-header">
          <TrendingUp size={18} className="section-title-icon" />
          <h3>Progress Toward Goals</h3>
        </div>

        <div className="tracker-progress-stack">
          <div className="metric-row">
            <div className="metric-head">
              <div className="metric-label-group">
                <Zap size={14} />
                <strong>XP Points</strong>
              </div>
              <span className="progress-text">{props.xpProgress}% of goal</span>
            </div>
            <div className="progress-track" aria-label="XP progress tracker">
              <div className="progress-fill xp" style={{ width: `${props.xpProgress}%` }} />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-head">
              <div className="metric-label-group">
                <Clock size={14} />
                <strong>Total Study Hours</strong>
              </div>
              <span className="progress-text">{props.hoursProgress}% of goal</span>
            </div>
            <div className="progress-track" aria-label="Study hour progress tracker">
              <div className="progress-fill hours" style={{ width: `${props.hoursProgress}%` }} />
            </div>
          </div>
        </div>

        <p className="tracker-stats-text">{props.statsText}</p>
      </section>
    </main>
  );
}
