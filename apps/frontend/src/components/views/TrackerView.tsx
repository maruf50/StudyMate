type TrackerViewProps = {
  statsText: string;
  xpProgress: number;
  hoursProgress: number;
  activeSessionId: string;
  onStartSession: () => void;
  onEndSession: () => void;
};

export function TrackerView(props: TrackerViewProps) {
  return (
    <main className="view">
      <section className="panel">
        <h2>Study Tracker</h2>
        <p>{props.statsText}</p>
        <div className="metric-row">
          <div className="metric-head">
            <strong>XP</strong>
            <span>{props.xpProgress}%</span>
          </div>
          <div className="progress-track" aria-label="XP progress tracker">
            <div className="progress-fill xp" style={{ width: `${props.xpProgress}%` }} />
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-head">
            <strong>Total Study Hours</strong>
            <span>{props.hoursProgress}%</span>
          </div>
          <div className="progress-track" aria-label="Study hour progress tracker">
            <div className="progress-fill hours" style={{ width: `${props.hoursProgress}%` }} />
          </div>
        </div>
        <div className="row">
          <button onClick={props.onStartSession} disabled={Boolean(props.activeSessionId)}>
            Start Session
          </button>
          <button onClick={props.onEndSession} disabled={!props.activeSessionId}>
            End Session
          </button>
        </div>
        <p>{props.activeSessionId ? "Session running" : "No active session"}</p>
      </section>
    </main>
  );
}
