import { useState } from "react";
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
  onChatInputChange: (value: string) => void;
  onGroupChatInputChange: (value: string) => void;
  onSendGlobalChat: () => void;
  onSendGroupChat: () => void;
  onSelectGroup: (groupId: string) => void;
};

export function ChatView(props: ChatViewProps) {
  const [chatTab, setChatTab] = useState<"global" | "group">("global");
  const activeGroups = props.groups
    .filter((group) => group.isMember || group.isActive)
    .slice()
    .sort((left, right) => Number(right.isActive) - Number(left.isActive) || left.name.localeCompare(right.name));

  return (
    <main className="view">
      <section className="panel">
        <div className="chat-tabs" role="tablist" aria-label="Chat mode">
          <button
            className={chatTab === "global" ? "chat-tab-btn active" : "chat-tab-btn"}
            onClick={() => setChatTab("global")}
            role="tab"
            aria-selected={chatTab === "global"}
          >
            Global Chat
          </button>
          <button
            className={chatTab === "group" ? "chat-tab-btn active" : "chat-tab-btn"}
            onClick={() => setChatTab("group")}
            role="tab"
            aria-selected={chatTab === "group"}
          >
            Group Chat
          </button>
        </div>

        {chatTab === "global" && (
          <>
            <h2>Global Chat</h2>
            <div className="chat-list">
              {props.globalMessages.map((message) => (
                <div key={message.id} className="chat-item">
                  <strong>{message.username}</strong> {message.content}
                </div>
              ))}
            </div>
            <div className="row">
              <input value={props.chatInput} onChange={(e) => props.onChatInputChange(e.target.value)} />
              <button onClick={props.onSendGlobalChat}>Send</button>
            </div>
          </>
        )}

        {chatTab === "group" && (
          <>
            <div className="chat-group-layout">
              <aside className="chat-group-sidebar">
                <h2>Your Groups</h2>
                <p>Pick one to open its chat thread.</p>
                <div className="chat-group-list">
                  {activeGroups.length === 0 ? (
                    <div className="chat-group-empty">Join or create a group to start chatting here.</div>
                  ) : (
                    activeGroups.map((group) => (
                      <button
                        key={group.id}
                        className={group.id === props.selectedGroupId ? "chat-group-item active" : "chat-group-item"}
                        onClick={() => props.onSelectGroup(group.id)}
                        type="button"
                      >
                        <span className="chat-group-title-row">
                          <strong>{group.name}</strong>
                          {group.isActive && <span className="active-badge">Active</span>}
                        </span>
                        <span className="chat-group-meta">
                          {group.studyTopic} • {group.memberCount}/{group.maxMembers} members
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </aside>

              <section className="chat-group-panel">
                <h2>{props.selectedGroup ? `${props.selectedGroup.name} Chat` : "Group Chat"}</h2>
                <p>
                  {props.selectedGroup
                    ? `Showing the conversation for ${props.selectedGroup.name}.`
                    : "Select a group from the list to view its messages."}
                </p>
                {props.activeSessionId && props.selectedGroupId && (
                  <div className="session-banner">
                    Session Active in {props.selectedGroup ? props.selectedGroup.name : `Group ${props.selectedGroupId}`} | Session ID: {props.activeSessionId}
                  </div>
                )}
                <div className="chat-list">
                  {props.groupMessages.length === 0 ? (
                    <div className="chat-group-empty">
                      {props.selectedGroup ? "No messages yet in this group." : "Select a group to see messages."}
                    </div>
                  ) : (
                    props.groupMessages.map((message) => (
                      <div key={message.id} className="chat-item">
                        <strong>{message.username}</strong> {message.content}
                      </div>
                    ))
                  )}
                </div>
                <div className="row">
                  <input
                    value={props.groupChatInput}
                    onChange={(e) => props.onGroupChatInputChange(e.target.value)}
                    placeholder={props.selectedGroupId ? `Message ${props.selectedGroup?.name || "the group"}` : "Choose a group first"}
                  />
                  <button onClick={props.onSendGroupChat} disabled={!props.selectedGroupId}>
                    Send
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}