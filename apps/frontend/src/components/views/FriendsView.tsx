import { useState } from "react";
import { Send, Check, X, UserPlus, Clock } from "lucide-react";
import type { FriendRequestSummary } from "../../types";

type FriendUser = {
  id: string;
  username: string;
  userId: string;
};

type FriendsViewProps = {
  friends: FriendUser[];
  friendRequests: FriendRequestSummary[];
  currentUserId: string;
  currentUsername?: string;
  onAcceptFriendRequest: (requestId: string) => void;
  onRejectFriendRequest: (requestId: string) => void;
  onSendFriendRequest: (targetUserId: string) => Promise<void>;
};

function Initials({ name }: { name: string }) {
  return (
    <div className="avatar-circle">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function FriendsView(props: FriendsViewProps) {
  const [addFriendInput, setAddFriendInput] = useState("");
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const incomingRequests = props.friendRequests.filter(
    (req) =>
      req.status === "pending" &&
      (req.isIncoming === true ||
        req.addresseeId === props.currentUserId ||
        (props.currentUsername
          ? req.addresseeUsername === props.currentUsername
          : false))
  );

  const outgoingRequests = props.friendRequests.filter(
    (req) =>
      req.status === "pending" &&
      (req.isOutgoing === true ||
        req.requesterId === props.currentUserId ||
        (props.currentUsername
          ? req.requesterUsername === props.currentUsername
          : false))
  );

  async function handleAddFriend() {
    if (!addFriendInput.trim()) {
      setRequestMessage({ type: "error", text: "Please enter a username or user ID" });
      return;
    }
    setIsLoadingRequest(true);
    setRequestMessage(null);
    try {
      await props.onSendFriendRequest(addFriendInput);
      setRequestMessage({ type: "success", text: `Friend request sent to ${addFriendInput}!` });
      setAddFriendInput("");
    } catch {
      setRequestMessage({ type: "error", text: "Failed to send friend request." });
    } finally {
      setIsLoadingRequest(false);
    }
  }

  return (
    <main className="view friends-view">
      {/* Add Friend */}
      <div className="view-section">
        <div className="section-header">
          <UserPlus size={18} className="section-title-icon" />
          <h3>Add a Friend</h3>
        </div>
        <div className="add-friend-form">
          <input
            type="text"
            placeholder="Enter username or user ID"
            value={addFriendInput}
            onChange={(e) => setAddFriendInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAddFriend()}
            disabled={isLoadingRequest}
          />
          <button
            className="btn-primary"
            onClick={() => void handleAddFriend()}
            disabled={isLoadingRequest || !addFriendInput.trim()}
          >
            <Send size={15} />
            {isLoadingRequest ? "Sending..." : "Send Request"}
          </button>
        </div>
        {requestMessage && (
          <div className={`inline-alert ${requestMessage.type}`}>
            {requestMessage.text}
          </div>
        )}
      </div>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="view-section">
          <div className="section-header">
            <h3>Incoming Requests</h3>
            <span className="count-badge">{incomingRequests.length}</span>
          </div>
          <div className="requests-grid">
            {incomingRequests.map((request) => (
              <div key={request.id} className="request-card incoming">
                <div className="request-card-left">
                  <Initials name={request.requesterUsername} />
                  <div>
                    <strong className="username">{request.requesterUsername}</strong>
                    <p className="status-text">wants to be friends</p>
                  </div>
                </div>
                <div className="request-actions">
                  <button
                    className="btn-primary"
                    onClick={() => props.onAcceptFriendRequest(request.id)}
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => props.onRejectFriendRequest(request.id)}
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <div className="view-section">
          <div className="section-header">
            <Clock size={18} className="section-title-icon" />
            <h3>Pending Requests</h3>
          </div>
          <div className="requests-grid">
            {outgoingRequests.map((request) => (
              <div key={request.id} className="request-card outgoing">
                <div className="request-card-left">
                  <Initials name={request.addresseeUsername} />
                  <div>
                    <strong className="username">{request.addresseeUsername}</strong>
                    <p className="status-text">Waiting for response...</p>
                  </div>
                </div>
                <span className="badge pending">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="view-section">
        <div className="section-header">
          <h3>Your Friends</h3>
          <span className="count-badge">{props.friends.length}</span>
        </div>
        {props.friends.length === 0 ? (
          <div className="empty-state-block">
            <UserPlus size={28} />
            <p>
              {incomingRequests.length === 0 && outgoingRequests.length === 0
                ? "Start by sending friend requests to users you meet in chat or matching!"
                : "No friends yet. Accept incoming requests to get started."}
            </p>
          </div>
        ) : (
          <div className="friends-grid">
            {props.friends.map((friend) => (
              <div key={friend.id} className="friend-card">
                <Initials name={friend.username} />
                <div className="friend-info">
                  <strong className="friend-name">{friend.username}</strong>
                  <span className="friend-status-pill">Friends</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
