import { Check, X } from "lucide-react";
import React, { useState } from "react";
import type { GroupInviteSummary, GroupSummary } from "../../types";

type GroupsViewProps = {
  groupName: string;
  groupTopic: string;
  groupDescription: string;
  groups: GroupSummary[];
  groupInvites: GroupInviteSummary[];
  onGroupNameChange: (value: string) => void;
  onGroupTopicChange: (value: string) => void;
  onGroupDescriptionChange: (value: string) => void;
  onCreateGroup: () => void;
  onJoinGroup: (groupId: string) => void;
  onOpenGroupChat: (groupId: string) => void;
  onAcceptGroupInvite: (inviteId: string) => Promise<void>;
  onRejectGroupInvite: (inviteId: string) => Promise<void>;
  currentUserId?: string | null;
  onDeleteGroup?: (groupId: string) => Promise<void>;
};

export function GroupsView(props: GroupsViewProps) {
  const [confirmingGroupId, setConfirmingGroupId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toHours = (minutes: number): string => {
    return `${(minutes / 60).toFixed(1)}h`;
  };

  const incomingGroupInvites = props.groupInvites.filter(
    (invite) => invite.status === "pending" && invite.inviteeId !== ""
  );

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
                {group.creatorId && props.currentUserId === group.creatorId && (
                  <>
                    <button className="delete-btn" onClick={() => setConfirmingGroupId(group.id)}>
                      Delete Group
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {confirmingGroupId && (
          <div className="confirm-modal">
            <div className="confirm-backdrop" onClick={() => !isDeleting && setConfirmingGroupId(null)} />
            <div className="confirm-panel">
              <h3>Confirm delete</h3>
              <p>Are you sure you want to delete this group? This cannot be undone.</p>
              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => !isDeleting && setConfirmingGroupId(null)}>Cancel</button>
                <button
                  className="delete-btn"
                  onClick={async () => {
                    if (!props.onDeleteGroup || !confirmingGroupId) return;
                    try {
                      setIsDeleting(true);
                      await props.onDeleteGroup(confirmingGroupId);
                    } finally {
                      setIsDeleting(false);
                      setConfirmingGroupId(null);
                    }
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
