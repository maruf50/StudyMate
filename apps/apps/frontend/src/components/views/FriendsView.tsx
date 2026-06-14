import { useState } from "react";
import { Send, Check, X, Search, UserMinus } from "lucide-react";
import type { FriendRequestSummary, UserSearchResult } from "../../types";

type FriendUser = {
  id: string;
  username: string;
  userId: string;
};

type FriendsViewProps = {
  friends: FriendUser[];
  friendRequests: FriendRequestSummary[];
  searchResults: UserSearchResult[];
  actionMessage: { type: "success" | "error"; text: string } | null;
  currentUserId: string;
  currentUsername?: string;
  onSearchUsers: (query: string) => Promise<void>;
  onAcceptFriendRequest: (requestId: string) => void;
  onRejectFriendRequest: (requestId: string) => void;
  onSendFriendRequest: (targetUserId: string) => Promise<void>;
  onUnfriendFriend: (friendUserId: string) => Promise<void>;
};

function getFriendshipLabel(status: string) {
  if (status === "friends") return "Already friends";
  if (status === "pending_outgoing") return "Request pending";
  if (status === "pending_incoming") return "Incoming request";
  return "Can send request";
}

export function FriendsView(props: FriendsViewProps) {
  const [addFriendInput, setAddFriendInput] = useState("");
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [localMessage, setLocalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [unfriendingId, setUnfriendingId] = useState<string | null>(null);

  const visibleMessage = props.actionMessage || localMessage;

  const incomingRequests = props.friendRequests.filter(
    (req) =>
      req.status === "pending" &&
      (
        req.isIncoming === true ||
        req.addresseeId === props.currentUserId ||
        (props.currentUsername ? req.addresseeUsername === props.currentUsername : false)
      )
  );

  const outgoingRequests = props.friendRequests.filter(
    (req) =>
      req.status === "pending" &&
      (
        req.isOutgoing === true ||
        req.requesterId === props.currentUserId ||
        (props.currentUsername ? req.requesterUsername === props.currentUsername : false)
      )
  );

  async function handleSearch() {
    const query = addFriendInput.trim();

    if (query.length < 2) {
      setLocalMessage({ type: "error", text: "Type at least 2 letters to search users." });
      return;
    }

    setIsLoadingRequest(true);
    setLocalMessage(null);

    try {
      await props.onSearchUsers(query);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to search users.";
      setLocalMessage({ type: "error", text: message });
    } finally {
      setIsLoadingRequest(false);
    }
  }

  async function handleSendFriend(targetIdentifier: string, label: string) {
    setIsLoadingRequest(true);
    setLocalMessage(null);

    try {
      await props.onSendFriendRequest(targetIdentifier);
      setLocalMessage({ type: "success", text: `Friend request sent to ${label}.` });
      await props.onSearchUsers(addFriendInput.trim());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send friend request.";
      setLocalMessage({ type: "error", text: message });
    } finally {
      setIsLoadingRequest(false);
    }
  }

  async function handleDirectSend() {
    const target = addFriendInput.trim();

    if (!target) {
      setLocalMessage({ type: "error", text: "Please enter a username, email, or user ID." });
      return;
    }

    await handleSendFriend(target, target);
    setAddFriendInput("");
  }

  async function handleUnfriend(friendUserId: string, username: string) {
    const confirmed = window.confirm(`Remove ${username} from your friends?`);

    if (!confirmed) {
      return;
    }

    setUnfriendingId(friendUserId);
    setLocalMessage(null);

    try {
      await props.onUnfriendFriend(friendUserId);
      setLocalMessage({ type: "success", text: `${username} removed from your friends.` });
      if (addFriendInput.trim().length >= 2) {
        await props.onSearchUsers(addFriendInput.trim());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove friend.";
      setLocalMessage({ type: "error", text: message });
    } finally {
      setUnfriendingId(null);
    }
  }

  return (
    <main className="friends-view">
      <section className="friends-section add-friend-section">
        <h3>Find & Add Friends</h3>
        <p className="status-text">Search by username, email, university, or department.</p>
        <div className="add-friend-form">
          <input
            type="text"
            placeholder="Search username, email, university, department"
            value={addFriendInput}
            onChange={(e) => setAddFriendInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
            disabled={isLoadingRequest}
          />
          <button className="btn-secondary" onClick={() => void handleSearch()} disabled={isLoadingRequest || addFriendInput.trim().length < 2}>
            <Search size={16} />
            {isLoadingRequest ? "Searching..." : "Search"}
          </button>
          <button className="btn-primary" onClick={() => void handleDirectSend()} disabled={isLoadingRequest || !addFriendInput.trim()}>
            <Send size={16} />
            Send Direct
          </button>
        </div>
        {visibleMessage && <div className={`message ${visibleMessage.type}`}>{visibleMessage.text}</div>}

        {props.searchResults.length > 0 && (
          <div className="user-search-results">
            {props.searchResults.map((result) => {
              const canSend = result.friendshipStatus === "none";
              const pendingIncoming = result.friendshipStatus === "pending_incoming" && result.requestId;

              return (
                <article key={result.id} className="user-search-card">
                  <div>
                    <strong>{result.username}</strong>
                    <p>{result.email}</p>
                    <p>{result.university || "University not set"} • {result.department || "Department not set"}</p>
                    <div className="interests-tags compact-tags">
                      {result.interests.slice(0, 4).map((interest) => (
                        <span key={interest.topic} className="interest-tag">{interest.topic}</span>
                      ))}
                    </div>
                  </div>
                  <div className="user-search-actions">
                    <span className="badge">{getFriendshipLabel(result.friendshipStatus)}</span>
                    {canSend && (
                      <button className="btn-primary" onClick={() => void handleSendFriend(result.id, result.username)} disabled={isLoadingRequest}>
                        <Send size={16} />
                        Add Friend
                      </button>
                    )}
                    {pendingIncoming && (
                      <button className="btn-primary" onClick={() => props.onAcceptFriendRequest(result.requestId!)}>
                        <Check size={16} />
                        Accept Request
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

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
                  <button className="btn-primary" onClick={() => props.onAcceptFriendRequest(request.id)}>
                    <Check size={16} />
                    Accept Request
                  </button>
                  <button className="btn-secondary" onClick={() => props.onRejectFriendRequest(request.id)}>
                    <X size={16} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      <section className="friends-section">
        <h3>Your Friends ({props.friends.length})</h3>
        {props.friends.length === 0 ? (
          <p className="empty-state">No friends yet. Search students and send friend requests to get started.</p>
        ) : (
          <div className="friends-grid">
            {props.friends.map((friend) => (
              <div key={friend.id} className="friend-card">
                <div className="friend-avatar">👤</div>
                <strong className="friend-name">{friend.username}</strong>
                <button
                  className="btn-secondary unfriend-btn"
                  onClick={() => void handleUnfriend(friend.userId || friend.id, friend.username)}
                  disabled={unfriendingId === (friend.userId || friend.id)}
                >
                  <UserMinus size={16} />
                  {unfriendingId === (friend.userId || friend.id) ? "Removing..." : "Unfriend"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
