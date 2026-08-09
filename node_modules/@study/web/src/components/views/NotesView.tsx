import { useState } from "react";
import { Lock, Globe, Check, X, Plus, FileText, ChevronDown, ChevronUp } from "lucide-react";
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

type NotesViewProps = {
  notes: (NoteSummary & { content?: NoteContent[] })[];
  currentUserId: string;
  onAddNote?: (data: { title: string; isPrivate: boolean; content: NoteContent[] }) => void;
  onTogglePrivacy?: (noteId: string, isPrivate: boolean) => void;
  onDeleteNote?: (noteId: string) => void;
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
  accessRequests?: AccessRequest[];
};

export function NotesView(props: NotesViewProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [expandedAccessRequests, setExpandedAccessRequests] = useState<string | null>(null);

  const selectedNote = selectedNoteId
    ? props.notes.find((n) => n.id === selectedNoteId)
    : null;

  const renderBlocks = (content?: NoteContent[]) => {
    if (!content || content.length === 0) {
      return <p className="empty-state">No content yet.</p>;
    }
    return (
      <div className="note-readonly-content">
        {content.map((block) => (
          <div key={block.id} className={`content-block block-${block.type}`}>
            <div className="block-type-label">{block.type}</div>
            {block.type === "text" && <p>{block.content}</p>}
            {block.type === "image" && block.content && (
              <img
                src={block.content}
                alt={block.metadata || "Note image"}
                className="note-readonly-image"
              />
            )}
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

  const handleCreateNote = (data: {
    title: string;
    isPrivate: boolean;
    content: NoteContent[];
  }) => {
    props.onAddNote?.(data);
    setShowEditor(false);
  };

  const getPendingRequests = (noteId: string) =>
    props.accessRequests?.filter((r) => r.noteId === noteId && r.status === "pending") || [];

  // Note Editor
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

  // Note Detail
  if (selectedNoteId) {
    return (
      <main className="view notes-editor-view">
        <div className="note-detail-panel">
          <div className="note-detail-header">
            <div>
              <h2>{selectedNote?.title || "Note"}</h2>
              <p className="note-detail-author">{selectedNote?.ownerUsername || "Unknown author"}</p>
            </div>
            <button className="btn-secondary" onClick={() => setSelectedNoteId(null)}>
              ← Back
            </button>
          </div>
          <div className="note-detail-meta">
            <span
              className={`privacy-badge ${selectedNote?.isPrivate ? "private" : "public"}`}
            >
              {selectedNote?.isPrivate ? (
                <><Lock size={12} /> Private</>
              ) : (
                <><Globe size={12} /> Public</>
              )}
            </span>
            {selectedNote?.isFriendShared && (
              <span className="privacy-badge public">Friend shared</span>
            )}
          </div>
          {renderBlocks(selectedNote?.content)}
        </div>
      </main>
    );
  }

  // Notes Grid
  return (
    <main className="view notes-view">
      <div className="notes-header-row">
        <div className="section-header">
          <FileText size={18} className="section-title-icon" />
          <h3>My Notes</h3>
          <span className="count-badge">{props.notes.length}</span>
        </div>
        <button className="btn-primary" onClick={() => setShowEditor(true)}>
          <Plus size={16} /> New Note
        </button>
      </div>

      {props.notes.length === 0 ? (
        <div className="empty-state-block">
          <FileText size={28} />
          <p>No notes yet. Create your first note to get started!</p>
        </div>
      ) : (
        <div className="notes-grid">
          {props.notes.map((note) => {
            const pendingRequests = getPendingRequests(note.id);

            return (
              <div key={note.id} className="note-card">
                <div className="note-card-header">
                  <h4 className="note-card-title">{note.title}</h4>
                  <div className="note-card-badges">
                    <span
                      className={`privacy-badge ${note.isPrivate ? "private" : "public"}`}
                    >
                      {note.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
                    </span>
                    {note.ownerUsername && note.ownerUsername !== "Demo Student" && (
                      <span className="author-badge">{note.ownerUsername}</span>
                    )}
                    {note.isFriendShared && (
                      <span className="privacy-badge public">Friend</span>
                    )}
                  </div>
                </div>

                {note.content && note.content.length > 0 && (
                  <div className="note-card-preview">
                    {note.content.slice(0, 2).map((block, idx) => (
                      <div key={idx} className="preview-block">
                        {block.type === "text" && (
                          <p>{block.content.substring(0, 120)}...</p>
                        )}
                        {block.type === "image" && (
                          <span className="preview-badge">📷 Image</span>
                        )}
                        {block.type === "link" && (
                          <span className="preview-badge">🔗 {block.metadata || block.content}</span>
                        )}
                      </div>
                    ))}
                    {note.content.length > 2 && (
                      <p className="more-content">+{note.content.length - 2} more blocks</p>
                    )}
                  </div>
                )}

                {note.canEdit !== false && note.isPrivate && pendingRequests.length > 0 && (
                  <div className="pending-requests-badge">
                    {pendingRequests.length} access request{pendingRequests.length > 1 ? "s" : ""}
                  </div>
                )}

                <div className="note-card-actions">
                  <button className="btn-secondary view-btn" onClick={() => setSelectedNoteId(note.id)}>
                    View
                  </button>
                  {note.canEdit !== false && (
                    <>
                      <button
                        className="btn-secondary"
                        onClick={() => props.onTogglePrivacy?.(note.id, !note.isPrivate)}
                        title={`Make ${note.isPrivate ? "public" : "private"}`}
                      >
                        {note.isPrivate ? <Globe size={13} /> : <Lock size={13} />}
                      </button>
                      <button
                        className="btn-danger icon-btn"
                        onClick={() => props.onDeleteNote?.(note.id)}
                      >
                        <X size={13} />
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
                      {expandedAccessRequests === note.id ? (
                        <><ChevronUp size={13} /> Hide requests</>
                      ) : (
                        <><ChevronDown size={13} /> {pendingRequests.length} pending request{pendingRequests.length > 1 ? "s" : ""}</>
                      )}
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
                                <Check size={13} />
                              </button>
                              <button
                                className="reject-btn"
                                onClick={() => props.onRejectRequest?.(request.id)}
                              >
                                <X size={13} />
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
    </main>
  );
}
