import { Check, X } from "lucide-react";
import { useState } from "react";
import type { GroupInviteSummary, GroupSummary } from "../../types";

type GroupsViewProps = {
  groupSearchName: string;
  groupSearchInterest: string;
  groupInterestOptions: string[];
  groups: GroupSummary[];
  groupInvites: GroupInviteSummary[];
  onGroupSearchNameChange: (value: string) => void;
  onGroupSearchInterestChange: (value: string) => void;
  onJoinGroup: (groupId: string) => void | Promise<void>;
  onOpenGroupChat: (groupId: string) => void;
  onAcceptGroupInvite: (inviteId: string) => Promise<void>;
  onRejectGroupInvite: (inviteId: string) => Promise<void>;
  currentUserId?: string | null;
  onDeleteGroup?: (groupId: string) => Promise<void>;
};

export function GroupsView(props: GroupsViewProps) {
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const toHours = (minutes: number): string => {
    return `${(minutes / 60).toFixed(1)}h`;
  };

  const incomingGroupInvites = props.groupInvites.filter(
    (invite) => invite.status === "pending" && invite.inviteeId !== ""
  );

  async function handleJoinGroup(groupId: string) {
    try {
      setJoiningGroupId(groupId);
      await props.onJoinGroup(groupId);
    } finally {
      setJoiningGroupId(null);
    }
  }

  async function handleDeleteGroup(groupId: string, groupName: string) {
    if (!props.onDeleteGroup) {
      return;
    }

    const confirmed = window.confirm(`Delete "${groupName}" permanently?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingGroupId(groupId);
      await props.onDeleteGroup(groupId);
    } finally {
      setDeletingGroupId(null);
    }
  }

  return (
    <main className="view">
      <section className="panel">
        {incomingGroupInvites.length > 0 && (
          <div className="friends-section" style={{ marginBottom: 24 }}>
            <h3>Study Group Invites</h3>
            <div className="requests-grid">
              {incomingGroupInvites.map((invite) => (
                <div key={invite.id} className="request-card incoming">
                  <div className="request-header">
                    <strong className="username">{invite.groupName}</strong>
                    <span className="badge">{invite.groupTopic}</span>
                  </div>
                  <p className="status-text">Invited by {invite.inviterUsername}</p>
                  <div className="request-actions">
                    <button className="btn-primary" onClick={() => void props.onAcceptGroupInvite(invite.id)}>
                      <Check size={16} />
                      Accept
                    </button>
                    <button className="btn-secondary" onClick={() => void props.onRejectGroupInvite(invite.id)}>
                      <X size={16} />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2>Active Groups</h2>
        <div className="row">
          <input
            value={props.groupSearchName}
            onChange={(e) => props.onGroupSearchNameChange(e.target.value)}
            placeholder="Search by group name"
          />
          <select
            value={props.groupSearchInterest}
            onChange={(e) => props.onGroupSearchInterestChange(e.target.value)}
          >
            <option value="">All interests</option>
            {props.groupInterestOptions.map((interest) => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
        </div>
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
                  onClick={() => void handleJoinGroup(group.id)}
                  disabled={!group.canJoin || joiningGroupId === group.id}
                  title={!group.canJoin ? (group.isMember ? "Already a member" : "Group is full") : "Join group"}
                >
                  {joiningGroupId === group.id ? "Joining..." : group.isMember ? "Joined" : group.hasCapacity ? "Join Group" : "Full"}
                </button>
                <button onClick={() => props.onOpenGroupChat(group.id)}>Open chat</button>
                {group.creatorId && props.currentUserId === group.creatorId && (
                  <>
                    <button
                      className="delete-btn"
                      onClick={() => void handleDeleteGroup(group.id, group.name)}
                      disabled={deletingGroupId === group.id}
                    >
                      {deletingGroupId === group.id ? "Deleting..." : "Delete Group"}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {props.groups.length === 0 && <p className="status-text">No groups match your search.</p>}
      </section>
    </main>
  );
}
