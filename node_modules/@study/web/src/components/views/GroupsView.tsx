import { Check, X, Search, Users, MessageSquare, Trash2 } from "lucide-react";
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

  const toHours = (minutes: number): string => `${(minutes / 60).toFixed(1)}h`;

  const incomingGroupInvites = props.groupInvites.filter(
    (invite) => invite.status === "pending" && invite.inviteeId !== ""
  );

  return (
    <main className="view groups-view">
      {/* Invites Section */}
      {incomingGroupInvites.length > 0 && (
        <div className="view-section">
          <div className="section-header">
            <Users size={18} className="section-title-icon" />
            <h3>Study Group Invites</h3>
            <span className="count-badge">{incomingGroupInvites.length}</span>
          </div>
          <div className="requests-grid">
            {incomingGroupInvites.map((invite) => (
              <div key={invite.id} className="request-card incoming">
                <div className="request-header">
                  <div>
                    <strong className="username">{invite.groupName}</strong>
                    <span className="topic-badge">{invite.groupTopic}</span>
                  </div>
                </div>
                <p className="status-text">Invited by <strong>{invite.inviterUsername}</strong></p>
                <div className="request-actions">
                  <button className="btn-primary" onClick={() => void props.onAcceptGroupInvite(invite.id)}>
                    <Check size={14} /> Accept
                  </button>
                  <button className="btn-secondary" onClick={() => void props.onRejectGroupInvite(invite.id)}>
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups Browser */}
      <div className="view-section">
        <div className="section-header">
          <Users size={18} className="section-title-icon" />
          <h3>Active Groups</h3>
          {props.groups.length > 0 && (
            <span className="count-badge">{props.groups.length}</span>
          )}
        </div>

        {/* Search Controls */}
        <div className="groups-search-row">
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input
              value={props.groupSearchName}
              onChange={(e) => props.onGroupSearchNameChange(e.target.value)}
              placeholder="Search by group name..."
            />
          </div>
          <div className="select-wrap">
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
        </div>

        {/* Groups Grid */}
        {props.groups.length === 0 ? (
          <div className="empty-state-block">
            <Users size={28} />
            <p>No groups match your search. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="groups-grid">
            {props.groups.map((group) => (
              <div key={group.id} className="group-card">
                <div className="group-card-header">
                  <div className="group-card-title-row">
                    <strong className="group-card-name">{group.name}</strong>
                    {group.isActive && (
                      <span className="live-indicator">
                        <span className="live-dot" />
                        Live ({group.activeSessionCount})
                      </span>
                    )}
                  </div>
                  <span className="topic-badge">{group.studyTopic}</span>
                </div>

                {group.studyDescription && (
                  <p className="group-card-desc">{group.studyDescription}</p>
                )}

                <div className="group-card-meta">
                  <span>Leader: <strong>{group.leaderName}</strong></span>
                  <span>{group.memberCount}/{group.maxMembers} members</span>
                  <span>{toHours(group.totalStudyMinutes)} studied</span>
                </div>

                <div className="group-card-actions">
                  <button
                    className={group.isMember ? "btn-secondary" : "btn-primary"}
                    onClick={() => props.onJoinGroup(group.id)}
                    disabled={!group.canJoin}
                    title={!group.canJoin ? (group.isMember ? "Already a member" : "Group is full") : "Join group"}
                  >
                    {group.isMember ? "Joined ✓" : group.hasCapacity ? "Join Group" : "Full"}
                  </button>
                  <button className="btn-secondary icon-btn" onClick={() => props.onOpenGroupChat(group.id)}>
                    <MessageSquare size={14} /> Chat
                  </button>
                  {group.creatorId && props.currentUserId === group.creatorId && (
                    <button
                      className="btn-danger icon-btn"
                      onClick={() => setConfirmingGroupId(group.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {confirmingGroupId && (
        <div className="confirm-modal">
          <div
            className="confirm-backdrop"
            onClick={() => !isDeleting && setConfirmingGroupId(null)}
          />
          <div className="confirm-panel">
            <h3>Delete Group</h3>
            <p>Are you sure you want to delete this group? This cannot be undone.</p>
            <div className="confirm-actions">
              <button
                className="btn-secondary"
                onClick={() => !isDeleting && setConfirmingGroupId(null)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
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
                {isDeleting ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
