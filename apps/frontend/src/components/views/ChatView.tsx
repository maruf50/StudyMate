import { useState } from "react";
import type { Message } from "../../types";

type ChatViewProps = {
  globalMessages: Message[];
  groupMessages: Message[];
  selectedGroupId: string;
  activeSessionId: string;
  chatInput: string;
  groupChatInput: string;
  onChatInputChange: (value: string) => void;
  onGroupChatInputChange: (value: string) => void;
  onSendGlobalChat: () => void;
  onSendGroupChat: () => void;
};

export function ChatView(props: ChatViewProps) {
  const [chatTab, setChatTab] = useState<"global" | "group">("global");

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
            <h2>Group Chat {props.selectedGroupId ? `(${props.selectedGroupId})` : ""}</h2>
            <p>Select any group from the Groups page and open its chat.</p>
            {props.activeSessionId && props.selectedGroupId && (
              <div className="session-banner">
                Session Active in Group {props.selectedGroupId} | Session ID: {props.activeSessionId}
              </div>
            )}
            <div className="chat-list">
              {props.groupMessages.map((message) => (
                <div key={message.id} className="chat-item">
                  <strong>{message.username}</strong> {message.content}
                </div>
              ))}
            </div>
            <div className="row">
              <input
                value={props.groupChatInput}
                onChange={(e) => props.onGroupChatInputChange(e.target.value)}
                placeholder={props.selectedGroupId ? "Message the group" : "Open a group chat first"}
              />
              <button onClick={props.onSendGroupChat} disabled={!props.selectedGroupId}>
                Send
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}