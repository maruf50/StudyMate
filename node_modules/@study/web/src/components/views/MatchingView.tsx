import type { MatchCandidate } from "../../types";

type MatchingViewProps = {
  matchInterest: string;
  availableInterests: string[];
  demoCandidates: MatchCandidate[];
  isDemoRunning: boolean;
  demoStatus: string;
  onMatchInterestChange: (value: string) => void;
  onStartMatchmakingDemo: () => void;
  onCreateDemoGroup: () => void;
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
            <button onClick={props.onCreateDemoGroup} disabled={props.demoCandidates.length === 0}>
              Create Group From List
            </button>
          </div>
          <p className="demo-status">{props.demoStatus}</p>
          {props.demoCandidates.length > 0 && (
            <ul className="demo-list">
              {props.demoCandidates.map((item) => (
                <li key={item.userId}>
                  {item.username} - score {item.score}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
