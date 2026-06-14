import type { MatchCandidate } from "../../types";

type MatchingViewProps = {
  matchInterest: string;
  availableInterests: string[];
  groupName: string;
  demoCandidates: MatchCandidate[];
  selectedMatchUserIds: string[];
  isDemoRunning: boolean;
  demoStatus: string;
  onMatchInterestChange: (value: string) => void;
  onGroupNameChange: (value: string) => void;
  onStartMatchmakingDemo: () => void;
  onCreateDemoGroup: () => void;
  onSelectAllDemoCandidates: () => void;
  onToggleMatchCandidateSelection: (candidate: MatchCandidate) => void;
};

function formatInterests(candidate: MatchCandidate) {
  const common = candidate.commonInterests || [];

  if (common.length > 0) {
    return `Common: ${common.join(", ")}`;
  }

  const topics = candidate.interests?.map((interest) => interest.topic).filter(Boolean) || [];
  return topics.length > 0 ? `Topics: ${topics.slice(0, 5).join(", ")}` : "No interests added yet";
}

export function MatchingView(props: MatchingViewProps) {
  return (
    <main className="view">
      <section className="panel">
        <h2>Professional Matching</h2>
        <p>Choose an interest and find students using backend profile data, shared interests, university, department, and friend status.</p>
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
            {props.isDemoRunning ? "Matching..." : "Find Matches"}
          </button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <input
            value={props.groupName}
            onChange={(e) => props.onGroupNameChange(e.target.value)}
            placeholder="Group name for selected matches"
          />
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
          {props.demoCandidates.length > 0 ? (
            <div className="match-card-grid">
              {props.demoCandidates.map((item) => (
                <label key={item.userId} className="match-card">
                  <input
                    type="checkbox"
                    checked={props.selectedMatchUserIds.includes(item.userId)}
                    onChange={() => props.onToggleMatchCandidateSelection(item)}
                  />
                  <div className="match-card-body">
                    <div className="match-card-head">
                      <strong>{item.username}</strong>
                      <span className="match-score">{item.score}%</span>
                    </div>
                    <p>{item.university || "University not set"} • {item.department || "Department not set"}</p>
                    <p>{formatInterests(item)}</p>
                    {item.friendshipStatus && <span className="badge">{item.friendshipStatus.replace("_", " ")}</span>}
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="status-text">Run matching after saving interests in the Dashboard.</p>
          )}
        </div>
      </section>
    </main>
  );
}
