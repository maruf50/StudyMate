import type { MatchCandidate } from "../../types";

type MatchingViewProps = {
  matchInterest: string;
  availableInterests: string[];
  demoCandidates: MatchCandidate[];
  selectedMatchUserIds: string[];
  isDemoRunning: boolean;
  demoStatus: string;
  onMatchInterestChange: (value: string) => void;
  onStartMatchmakingDemo: () => void;
  onCreateDemoGroup: () => void;
  onSelectAllDemoCandidates: () => void;
  onToggleMatchCandidateSelection: (candidate: MatchCandidate) => void;
};

export function MatchingView(props: MatchingViewProps) {
  return (
    <main className="view">
      <section className="panel">
        <h2>Matchmaking Queue</h2>
        <p>Pick an interest to find study partners and create a group.</p>
        <div className="row">
          <select value={props.matchInterest} onChange={(e) => props.onMatchInterestChange(e.target.value)}>
            <option value="">All interests</option>
            {props.availableInterests.map((interest) => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
          <button onClick={props.onStartMatchmakingDemo} disabled={props.isDemoRunning}>
            {props.isDemoRunning ? "Matchmaking..." : "Start Matchmaking"}
          </button>
        </div>
        <div className="demo-box">
          <div className="row">
            <button onClick={props.onCreateDemoGroup} disabled={props.selectedMatchUserIds.length === 0}>
              Create Group With Selected
            </button>
            <button onClick={props.onSelectAllDemoCandidates} disabled={props.demoCandidates.length === 0}>
              Select All
            </button>
            <span>{props.selectedMatchUserIds.length} selected</span>
          </div>
          <p className="demo-status">{props.demoStatus}</p>
          {props.demoCandidates.length > 0 && (
            <ul className="demo-list">
              {props.demoCandidates.map((item) => (
                <li key={item.userId}>
                  <label className="match-candidate-row">
                    <input
                      type="checkbox"
                      checked={props.selectedMatchUserIds.includes(item.userId)}
                      onChange={() => props.onToggleMatchCandidateSelection(item)}
                    />
                    <span>
                      {item.username} - score {item.score}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
