import type { GroupSummary } from "../../types";

type GroupsViewProps = {
  groupName: string;
  groupTopic: string;
  groupDescription: string;
  groups: GroupSummary[];
  onGroupNameChange: (value: string) => void;
  onGroupTopicChange: (value: string) => void;
  onGroupDescriptionChange: (value: string) => void;
  onCreateGroup: () => void;
  onJoinGroup: (groupId: string) => void;
  onOpenGroupChat: (groupId: string) => void;
};

export function GroupsView(props: GroupsViewProps) {
  const toHours = (minutes: number): string => {
    return `${(minutes / 60).toFixed(1)}h`;
  };

  return (
    <main className="view">
      <section className="panel">
        <h2>Active Groups</h2>
        <div className="row">
          <input value={props.groupName} onChange={(e) => props.onGroupNameChange(e.target.value)} />
          <input value={props.groupTopic} onChange={(e) => props.onGroupTopicChange(e.target.value)} />
          <button onClick={props.onCreateGroup}>Create</button>
        </div>
        <input value={props.groupDescription} onChange={(e) => props.onGroupDescriptionChange(e.target.value)} />
        <ul>
          {props.groups.map((group) => (
            <li key={group.id} className="group-item group-card">
              <div>
                <div className="group-head">
                  <strong>{group.name}</strong>
                  {group.isActive && (
                    <span className="active-badge">Active Now ({group.activeSessionCount})</span>
                  )}
                </div>
                <p>
                  Studying: {group.studyTopic} • Leader: {group.leaderName}
                </p>
                <p>{group.studyDescription}</p>
                <p>
                  Members: {group.memberCount}/{group.maxMembers} • Study time: {toHours(group.totalStudyMinutes)}
                </p>
              </div>
              <div className="row compact group-actions">
                <button
                  onClick={() => props.onJoinGroup(group.id)}
                  disabled={!group.canJoin}
                  title={!group.canJoin ? (group.isMember ? "Already a member" : "Group is full") : "Join group"}
                >
                  {group.isMember ? "Joined" : group.hasCapacity ? "Join Group" : "Full"}
                </button>
                <button onClick={() => props.onOpenGroupChat(group.id)}>Open chat</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
