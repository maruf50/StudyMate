import { Zap, Users, Plus, Search } from "lucide-react";
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

export function MatchingView(props: MatchingViewProps) {
  return (
    <main className="view matching-view">
      <div className="matching-layout">
        {/* Left: Controls */}
        <aside className="matching-controls">
          <div className="view-section">
            <div className="section-header">
              <Zap size={18} className="section-title-icon" />
              <h3>Find Study Partners</h3>
            </div>
            <p className="section-desc">
              Pick an interest topic to find compatible study partners and form a group.
            </p>

            <div className="matching-form-stack">
              <div className="form-field">
                <label className="field-label">Interest Topic</label>
                <div className="select-wrap">
                  <select
                    value={props.matchInterest}
                    onChange={(e) => props.onMatchInterestChange(e.target.value)}
                  >
                    <option value="">All interests</option>
                    {props.availableInterests.map((interest) => (
                      <option key={interest} value={interest}>
                        {interest}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Group Name</label>
                <input
                  value={props.groupName}
                  onChange={(e) => props.onGroupNameChange(e.target.value)}
                  placeholder="e.g. CS Study Crew"
                />
              </div>

              <button
                className="btn-primary full-width"
                onClick={props.onStartMatchmakingDemo}
                disabled={props.isDemoRunning}
              >
                <Search size={16} />
                {props.isDemoRunning ? "Searching..." : "Start Matchmaking"}
              </button>
            </div>
          </div>
        </aside>

        {/* Right: Candidates */}
        <section className="matching-results">
          <div className="section-header">
            <Users size={18} className="section-title-icon" />
            <h3>Matched Candidates</h3>
            {props.demoCandidates.length > 0 && (
              <span className="count-badge">{props.demoCandidates.length} found</span>
            )}
          </div>

          {props.demoStatus && (
            <div className="matching-status-banner">{props.demoStatus}</div>
          )}

          {props.demoCandidates.length === 0 ? (
            <div className="empty-state-block">
              <Users size={28} />
              <p>No candidates yet. Start matchmaking to find study partners.</p>
            </div>
          ) : (
            <>
              <div className="matching-candidates-list">
                {props.demoCandidates.map((item) => {
                  const isSelected = props.selectedMatchUserIds.includes(item.userId);
                  return (
                    <label
                      key={item.userId}
                      className={`match-candidate-card ${isSelected ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => props.onToggleMatchCandidateSelection(item)}
                        className="candidate-checkbox"
                      />
                      <div className="candidate-avatar">
                        {item.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="candidate-info">
                        <strong>{item.username}</strong>
                        <span className="candidate-score">Score: {item.score}</span>
                      </div>
                      {isSelected && (
                        <span className="candidate-selected-pill">Selected</span>
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="matching-group-actions">
                <button
                  className="btn-secondary"
                  onClick={props.onSelectAllDemoCandidates}
                >
                  Select All
                </button>
                <button
                  className="btn-primary"
                  onClick={props.onCreateDemoGroup}
                  disabled={props.selectedMatchUserIds.length === 0 || !props.groupName.trim()}
                >
                  <Plus size={16} />
                  Create Group ({props.selectedMatchUserIds.length} selected)
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
