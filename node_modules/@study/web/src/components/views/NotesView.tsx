import { useState } from "react";
import { NoteEditor } from "./NoteEditor";
import type { NoteSummary } from "../../types";

type NoteContent = {
  type: "text" | "image" | "link";
  id: string;
  content: string;
  metadata?: string;
};

type AccessRequest = {
  id: string;
  noteId: string;
  requesterId: string;
  requesterUsername: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type FriendRequest = {
  id: string;
  requesterId: string;
  requesterUsername: string;
  addresseeId: string;
  addresseeUsername: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  isIncoming?: boolean;
  isOutgoing?: boolean;
};

type NotesViewProps = {
  notes: (NoteSummary & { content?: NoteContent[] })[];
  currentUserId: string;
  onAddNote?: (data: { title: string; isPrivate: boolean; content: NoteContent[] }) => void;
  onTogglePrivacy?: (noteId: string, isPrivate: boolean) => void;
  onDeleteNote?: (noteId: string) => void;
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
  friendRequests?: FriendRequest[];
  onAcceptFriendRequest?: (requestId: string) => void;
  onRejectFriendRequest?: (requestId: string) => void;
  accessRequests?: AccessRequest[];
};

export function NotesView(props: NotesViewProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [expandedAccessRequests, setExpandedAccessRequests] = useState<string | null>(null);

  const selectedNote = selectedNoteId ? props.notes.find((n) => n.id === selectedNoteId) : null;
  const incomingFriendRequests = (props.friendRequests || []).filter((request) => request.status === "pending" && request.isIncoming);
  const outgoingFriendRequests = (props.friendRequests || []).filter((request) => request.status === "pending" && request.isOutgoing);

  const renderBlocks = (content?: NoteContent[]) => {
    if (!content || content.length === 0) {
      return <p className="empty-state">No content yet.</p>;
    }

    return (
      <div className="note-readonly-content">
        {content.map((block) => (
          <div key={block.id} className={`content-block block-${block.type}`}>
            <div className="block-header">
              <span className="block-type">{block.type.toUpperCase()}</span>
            </div>
            {block.type === "text" && <p>{block.content}</p>}
            {block.type === "image" && block.content && <img src={block.content} alt={block.metadata || "Note image"} className="note-readonly-image" />}
            {block.type === "link" && (
              <a href={block.content} target="_blank" rel="noopener noreferrer">
                {block.metadata || block.content}
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleCreateNote = (data: { title: string; isPrivate: boolean; content: NoteContent[] }) => {
    props.onAddNote?.(data);
    setShowEditor(false);
  };

  const handleNoteAccessRequests = (noteId: string) => {
    return props.accessRequests?.filter((r) => r.noteId === noteId && r.status === "pending") || [];
  };

  if (showEditor) {
    return (
      <main className="view notes-editor-view">
        <NoteEditor
          note={selectedNote ?? undefined}
          isPrivate={selectedNote?.isPrivate}
          onSave={handleCreateNote}
          onCancel={() => {
            setShowEditor(false);
            setSelectedNoteId(null);
          }}
        />
      </main>
    );
  }

  if (selectedNoteId) {
    return (
      <main className="view notes-editor-view">
        <section className="panel note-detail-panel">
          <div className="note-detail-header">
            <div>
              <h2>{selectedNote?.title || "Note"}</h2>
              <p>{selectedNote?.ownerUsername || "Unknown author"}</p>
            </div>
            <button onClick={() => setSelectedNoteId(null)}>Back</button>
          </div>
          <div className="note-detail-meta">
            <span className={`privacy-badge ${selectedNote?.isPrivate ? "private" : "public"}`}>
              {selectedNote?.isPrivate ? "🔒 Private" : "🌐 Public"}
            </span>
            {selectedNote?.isFriendShared && <span className="privacy-badge public">Friend shared</span>}
          </div>
          {renderBlocks(selectedNote?.content)}
        </section>
      </main>
    );
  }

  return (
    <main className="view notes-view">
      <div className="notes-container">
        {(incomingFriendRequests.length > 0 || outgoingFriendRequests.length > 0) && (
          <section className="friend-requests-panel">
            <h3>Friend Requests</h3>
            {incomingFriendRequests.length > 0 && (
              <div>
                <h4>Incoming</h4>
                <div className="requests-list">
                  {incomingFriendRequests.map((request) => (
                    <div key={request.id} className="request-item">
                      <span className="requester-name">{request.requesterUsername}</span>
                      <div className="request-actions">
                        <button className="approve-btn" onClick={() => props.onAcceptFriendRequest?.(request.id)}>
                          ✓
                        </button>
                        <button className="reject-btn" onClick={() => props.onRejectFriendRequest?.(request.id)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {outgoingFriendRequests.length > 0 && (
              <div>
                <h4>Sent</h4>
                <ul className="friend-request-summary-list">
                  {outgoingFriendRequests.map((request) => (
                    <li key={request.id}>{request.addresseeUsername} - {request.status}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <div className="notes-header">
          <h2>My Notes</h2>
          <button className="new-note-btn" onClick={() => setShowEditor(true)}>
            + New Note
          </button>
        </div>

        {props.notes.length === 0 ? (
          <div className="empty-notes">
            <p>No notes yet. Create your first note!</p>
          </div>
        ) : (
          <div className="notes-grid">
            {props.notes.map((note) => {
              const pendingRequests = handleNoteAccessRequests(note.id);

              return (
                <div key={note.id} className="note-card">
                  <div className="note-card-header">
                    <h3 className="note-card-title">{note.title}</h3>
                    <div className="note-card-badges">
                      <span className={`privacy-badge ${note.isPrivate ? "private" : "public"}`}>
                        {note.isPrivate ? "🔒" : "🌐"}
                      </span>
                      {note.ownerUsername && note.ownerUsername !== "Demo Student" && (
                        <span className="privacy-badge public">{note.ownerUsername}</span>
                      )}
                      {note.isFriendShared && <span className="privacy-badge public">Friend</span>}
                    </div>
                  </div>

                  {note.content && note.content.length > 0 && (
                    <div className="note-card-preview">
                      {note.content.slice(0, 2).map((block, idx) => (
                        <div key={idx} className={`preview-block ${block.type}`}>
                          {block.type === "text" && (
                            <p>{block.content.substring(0, 100)}...</p>
                          )}
                          {block.type === "image" && <span>[Image]</span>}
                          {block.type === "link" && (
                            <span>[Link: {block.metadata || block.content}]</span>
                          )}
                        </div>
                      ))}
                      {note.content.length > 2 && (
                        <p className="more-content">+{note.content.length - 2} more</p>
                      )}
                    </div>
                  )}

                  {note.canEdit !== false && note.isPrivate && pendingRequests.length > 0 && (
                    <div className="pending-requests-badge">
                      {pendingRequests.length} access request{pendingRequests.length > 1 ? "s" : ""}
                    </div>
                  )}

                  <div className="note-card-actions">
                    <button
                      className="view-btn"
                      onClick={() => setSelectedNoteId(note.id)}
                    >
                      View
                    </button>
                    {note.canEdit !== false && (
                      <>
                        <button
                          className={`privacy-btn ${note.isPrivate ? "make-public" : "make-private"}`}
                          onClick={() => props.onTogglePrivacy?.(note.id, !note.isPrivate)}
                          title={`Make ${note.isPrivate ? "public" : "private"}`}
                        >
                          {note.isPrivate ? "Make Public" : "Make Private"}
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => props.onDeleteNote?.(note.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>

                  {note.canEdit !== false && note.isPrivate && pendingRequests.length > 0 && (
                    <div className="access-requests-section">
                      <button
                        className="expand-requests-btn"
                        onClick={() =>
                          setExpandedAccessRequests(
                            expandedAccessRequests === note.id ? null : note.id
                          )
                        }
                      >
                        {expandedAccessRequests === note.id
                          ? "Hide requests"
                          : `Show ${pendingRequests.length} request${pendingRequests.length > 1 ? "s" : ""}`}
                      </button>

                      {expandedAccessRequests === note.id && (
                        <div className="requests-list">
                          {pendingRequests.map((request) => (
                            <div key={request.id} className="request-item">
                              <span className="requester-name">{request.requesterUsername}</span>
                              <div className="request-actions">
                                <button
                                  className="approve-btn"
                                  onClick={() => props.onApproveRequest?.(request.id)}
                                >
                                  ✓
                                </button>
                                <button
                                  className="reject-btn"
                                  onClick={() => props.onRejectRequest?.(request.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
