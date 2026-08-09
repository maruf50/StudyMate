import { useState, useRef, useEffect } from "react";
import {
  Globe,
  Users,
  Send,
  Search,
  UserPlus,
  Zap,
  Hash,
  Clock,
  ThumbsUp,
  Check,
  Sparkles
} from "lucide-react";
import type { GroupSummary, Message } from "../../types";

type ChatViewProps = {
  groups: GroupSummary[];
  globalMessages: Message[];
  groupMessages: Message[];
  selectedGroupId: string;
  selectedGroup: GroupSummary | null;
  activeSessionId: string;
  chatInput: string;
  groupChatInput: string;
  currentUsername?: string;
  onChatInputChange: (value: string) => void;
  onGroupChatInputChange: (value: string) => void;
  onSendGlobalChat: () => void;
  onSendGroupChat: () => void;
  onSelectGroup: (groupId: string) => void;
  onRequestFriend?: (targetUserId: string) => Promise<void>;
};

export function ChatView(props: ChatViewProps) {
  const [chatTab, setChatTab] = useState<"global" | "group">("global");
  const [messageSearch, setMessageSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [sentFriendRequests, setSentFriendRequests] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeGroups = props.groups
    .filter((group) => group.isMember || group.isActive)
    .slice()
    .sort((left, right) => Number(right.isActive) - Number(left.isActive) || left.name.localeCompare(right.name));

  const filteredGroups = activeGroups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    g.studyTopic.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const rawMessages = chatTab === "global" ? props.globalMessages : props.groupMessages;
  const filteredMessages = rawMessages.filter((msg) =>
    msg.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
    msg.username.toLowerCase().includes(messageSearch.toLowerCase())
  );

  // Auto-scroll to bottom on new message or tab change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages.length, chatTab, props.selectedGroupId]);

  function formatTime(isoString?: string) {
    if (!isoString) return "Just now";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "Just now";
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Just now";
    }
  }

  function handleAddReaction(msgId: string, emoji: string) {
    setReactions((prev) => {
      const msgReactions = prev[msgId] || {};
      const currentCount = msgReactions[emoji] || 0;
      return {
        ...prev,
        [msgId]: {
          ...msgReactions,
          [emoji]: currentCount + 1
        }
      };
    });
  }

  async function handleSendFriendRequest(username: string) {
    if (props.onRequestFriend && !sentFriendRequests[username]) {
      try {
        await props.onRequestFriend(username);
        setSentFriendRequests((prev) => ({ ...prev, [username]: true }));
      } catch (err) {
        console.error("Failed to send friend request from chat", err);
      }
    }
  }

  return (
    <main className="view chat-view-modern">
      <div className="chat-shell">
        {/* Left Sidebar: Navigation & Groups List */}
        <aside className="chat-sidebar">
          <div className="chat-tab-switcher">
            <button
              type="button"
              className={`chat-tab-pill ${chatTab === "global" ? "active" : ""}`}
              onClick={() => setChatTab("global")}
            >
              <Globe size={16} />
              <span>Global</span>
            </button>
            <button
              type="button"
              className={`chat-tab-pill ${chatTab === "group" ? "active" : ""}`}
              onClick={() => setChatTab("group")}
            >
              <Users size={16} />
              <span>Groups</span>
            </button>
          </div>

          {chatTab === "group" && (
            <div className="chat-sidebar-group-section">
              <div className="chat-search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter groups..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                />
              </div>

              <div className="chat-group-list">
                {filteredGroups.length === 0 ? (
                  <div className="chat-empty-sidebar">
                    {activeGroups.length === 0 ? "Join or create a group to start chatting." : "No groups match your search."}
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      className={`chat-group-card ${group.id === props.selectedGroupId ? "active" : ""}`}
                      onClick={() => props.onSelectGroup(group.id)}
                      type="button"
                    >
                      <div className="chat-group-card-header">
                        <strong className="group-name">{group.name}</strong>
                        {group.isActive && (
                          <span className="live-indicator">
                            <span className="live-dot" /> Live
                          </span>
                        )}
                      </div>
                      <span className="group-meta">
                        {group.studyTopic} • {group.memberCount} members
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {chatTab === "global" && (
            <div className="chat-sidebar-global-info">
              <div className="global-info-card">
                <Hash size={18} />
                <div>
                  <strong>Global Channel</strong>
                  <p>Public study forum open to all students across universities.</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Conversation Pane */}
        <section className="chat-main-pane">
          {/* Header Bar */}
          <header className="chat-header-bar">
            <div className="chat-header-title">
              <div className="channel-icon-badge">
                {chatTab === "global" ? <Hash size={18} /> : <Users size={18} />}
              </div>
              <div>
                <h2>
                  {chatTab === "global"
                    ? "global-study-forum"
                    : props.selectedGroup
                      ? props.selectedGroup.name
                      : "Select a Group"}
                </h2>
                <p>
                  {chatTab === "global"
                    ? "Live discussion with the entire study community"
                    : props.selectedGroup
                      ? `Studying ${props.selectedGroup.studyTopic} • ${props.selectedGroup.memberCount} members`
                      : "Choose a group from the left sidebar to view messages"}
                </p>
              </div>
            </div>

            <div className="chat-header-actions">
              <div className="chat-search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                />
              </div>
            </div>
          </header>

          {/* Active Session Indicator */}
          {props.activeSessionId && props.selectedGroupId && chatTab === "group" && (
            <div className="chat-session-banner">
              <Zap size={15} />
              <span>Study Session Active in <strong>{props.selectedGroup?.name}</strong></span>
              <span className="session-id-pill">ID: {props.activeSessionId}</span>
            </div>
          )}

          {/* Message List Scroll Container */}
          <div className="chat-messages-scroll-area" ref={scrollRef}>
            {filteredMessages.length === 0 ? (
              <div className="chat-no-messages">
                <Sparkles size={24} />
                <p>
                  {messageSearch
                    ? "No messages match your search filter."
                    : chatTab === "global"
                      ? "No messages in Global Chat yet. Be the first to say hello!"
                      : props.selectedGroup
                        ? `No messages yet in ${props.selectedGroup.name}. Start the conversation!`
                        : "Select a group from the left sidebar to see messages."}
                </p>
              </div>
            ) : (
              filteredMessages.map((message) => {
                const isSentByMe =
                  props.currentUsername &&
                  message.username.toLowerCase() === props.currentUsername.toLowerCase();
                const msgReactions = reactions[message.id] || {};
                const hasSentRequest = sentFriendRequests[message.username];

                return (
                  <div
                    key={message.id}
                    className={`message-row ${isSentByMe ? "sent" : "received"}`}
                  >
                    {!isSentByMe && (
                      <div className="message-avatar">
                        {message.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="message-bubble-wrap">
                      <div className="message-header-line">
                        {!isSentByMe && <strong className="sender-name">{message.username}</strong>}
                        <span className="message-timestamp">{formatTime(message.createdAt)}</span>
                      </div>

                      <div className="message-body">{message.content}</div>

                      {/* Reactions & Actions */}
                      <div className="message-footer-toolbar">
                        <div className="reaction-pills">
                          {Object.entries(msgReactions).map(([emoji, count]) => (
                            <span key={emoji} className="reaction-badge">
                              {emoji} {count}
                            </span>
                          ))}
                        </div>

                        <div className="quick-action-buttons">
                          <button
                            type="button"
                            className="quick-react-btn"
                            onClick={() => handleAddReaction(message.id, "👍")}
                            title="React with Thumbs Up"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            type="button"
                            className="quick-react-btn"
                            onClick={() => handleAddReaction(message.id, "✓")}
                            title="React with Check"
                          >
                            <Check size={12} />
                          </button>

                          {!isSentByMe && props.onRequestFriend && (
                            <button
                              type="button"
                              className={`add-friend-chat-btn ${hasSentRequest ? "sent" : ""}`}
                              onClick={() => handleSendFriendRequest(message.username)}
                              disabled={hasSentRequest}
                              title={hasSentRequest ? "Friend request sent" : `Add ${message.username} as friend`}
                            >
                              <UserPlus size={12} />
                              <span>{hasSentRequest ? "Sent" : "Add Friend"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Message Input Box */}
          <div className="chat-input-bar">
            {chatTab === "global" ? (
              <form
                className="chat-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (props.chatInput.trim()) {
                    props.onSendGlobalChat();
                  }
                }}
              >
                <input
                  type="text"
                  value={props.chatInput}
                  onChange={(e) => props.onChatInputChange(e.target.value)}
                  placeholder="Type a message in Global Chat..."
                />
                <button type="submit" className="send-btn" disabled={!props.chatInput.trim()}>
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            ) : (
              <form
                className="chat-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (props.groupChatInput.trim() && props.selectedGroupId) {
                    props.onSendGroupChat();
                  }
                }}
              >
                <input
                  type="text"
                  value={props.groupChatInput}
                  onChange={(e) => props.onGroupChatInputChange(e.target.value)}
                  placeholder={
                    props.selectedGroupId
                      ? `Message ${props.selectedGroup?.name || "the group"}...`
                      : "Choose a group from sidebar first"
                  }
                  disabled={!props.selectedGroupId}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={!props.groupChatInput.trim() || !props.selectedGroupId}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}