import type { MatchCandidate } from "../../types";

type MatchingViewProps = {
  matchInterest: string;
  availableInterests: string[];
  partyGroupName: string;
  selectedMatchUserIds: string[];
  filteredMatches: MatchCandidate[];
  demoCandidates: MatchCandidate[];
  isDemoRunning: boolean;
  demoStatus: string;
  onMatchInterestChange: (value: string) => void;
  onPartyGroupNameChange: (value: string) => void;
  onToggleMatchUser: (userId: string) => void;
  onStartMatchmakingDemo: () => void;
  onCreateDemoGroup: () => void;
  onCreatePartyGroup: () => void;
};

export function MatchingView(props: MatchingViewProps) {
  return (
    <main className="view">
      <section className="panel">
        <h2>Matchmaking Queue</h2>
        <p>Pick an interest to find users for a focused study session.</p>
        <div className="row">
          <select value={props.matchInterest} onChange={(e) => props.onMatchInterestChange(e.target.value)}>
            <option value="">All interests</option>
            {props.availableInterests.map((interest) => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
          <input
            value={props.partyGroupName}
            onChange={(e) => props.onPartyGroupNameChange(e.target.value)}
            placeholder="Session group name"
          />
          <button onClick={props.onCreatePartyGroup} disabled={props.selectedMatchUserIds.length === 0}>
            Create Study Session Group ({props.selectedMatchUserIds.length})
          </button>
        </div>
        <div className="demo-box">
          <div className="row">
            <button onClick={props.onStartMatchmakingDemo} disabled={props.isDemoRunning}>
              {props.isDemoRunning ? "Matchmaking..." : "Start Matchmaking Demo"}
            </button>
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
        <ul>
          {props.filteredMatches.map((item) => (
            <li key={item.userId} className="match-item">
              <label className="match-check">
                <input
                  type="checkbox"
                  checked={props.selectedMatchUserIds.includes(item.userId)}
                  onChange={() => props.onToggleMatchUser(item.userId)}
                />
                <span>
                  {item.username} - score {item.score}
                </span>
              </label>
              <button onClick={() => props.onToggleMatchUser(item.userId)}>
                {props.selectedMatchUserIds.includes(item.userId) ? "Remove" : "Select"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
