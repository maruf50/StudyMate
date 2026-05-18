import { useState } from "react";
import { Send, Check, X, UserPlus } from "lucide-react";
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
  onAcceptFriendRequest: (requestId: string) => void;
  onRejectFriendRequest: (requestId: string) => void;
  onSendFriendRequest: (targetUserId: string) => Promise<void>;
};

export function FriendsView(props: FriendsViewProps) {
  const [addFriendInput, setAddFriendInput] = useState("");
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const incomingRequests = props.friendRequests.filter(
    (req) => req.status === "pending" && req.isIncoming
  );
  const outgoingRequests = props.friendRequests.filter(
    (req) => req.status === "pending" && req.isOutgoing
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
    } catch (error) {
      setRequestMessage({ type: "error", text: "Failed to send friend request" });
    } finally {
      setIsLoadingRequest(false);
    }
  }

  return (
    <main className="friends-view">
      {/* Add Friend Form */}
      <section className="friends-section add-friend-section">
        <h3>Add a Friend</h3>
        <div className="add-friend-form">
          <input
            type="text"
            placeholder="Enter username or user ID"
            value={addFriendInput}
            onChange={(e) => setAddFriendInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddFriend()}
            disabled={isLoadingRequest}
          />
          <button
            className="btn-primary"
            onClick={handleAddFriend}
            disabled={isLoadingRequest || !addFriendInput.trim()}
          >
            <Send size={16} />
            {isLoadingRequest ? "Sending..." : "Send Request"}
          </button>
        </div>
        {requestMessage && (
          <div className={`message ${requestMessage.type}`}>
            {requestMessage.text}
          </div>
        )}
      </section>

      {/* Incoming Friend Requests */}
      {incomingRequests.length > 0 && (
        <section className="friends-section">
          <h3>Incoming Requests</h3>
          <div className="requests-grid">
            {incomingRequests.map((request) => (
              <div key={request.id} className="request-card incoming">
                <div className="request-header">
                  <strong className="username">{request.requesterUsername}</strong>
                  <span className="badge">wants to be friends</span>
                </div>
                <div className="request-actions">
                  <button
                    className="btn-primary"
                    onClick={() => props.onAcceptFriendRequest(request.id)}
                  >
                    <Check size={16} />
                    Accept
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => props.onRejectFriendRequest(request.id)}
                  >
                    <X size={16} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Outgoing Friend Requests */}
      {outgoingRequests.length > 0 && (
        <section className="friends-section">
          <h3>Pending Requests</h3>
          <div className="requests-grid">
            {outgoingRequests.map((request) => (
              <div key={request.id} className="request-card outgoing">
                <div className="request-header">
                  <strong className="username">{request.addresseeUsername}</strong>
                  <span className="badge">request pending</span>
                </div>
                <p className="status-text">Waiting for response...</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends List */}
      <section className="friends-section">
        <h3>Your Friends ({props.friends.length})</h3>
        {props.friends.length === 0 ? (
          <p className="empty-state">
            No friends yet. Send friend requests to get started!
          </p>
        ) : (
          <div className="friends-grid">
            {props.friends.map((friend) => (
              <div key={friend.id} className="friend-card">
                <div className="friend-avatar">👤</div>
                <strong className="friend-name">{friend.username}</strong>
                <p className="friend-status">Friends</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Empty State */}
      {incomingRequests.length === 0 &&
        outgoingRequests.length === 0 &&
        props.friends.length === 0 && (
          <div className="empty-container">
            <p>Start by sending friend requests to users you meet in chat or matching!</p>
          </div>
        )}
    </main>
  );
}
