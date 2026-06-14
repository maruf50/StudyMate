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

type NoteFormData = { title: string; isPrivate: boolean; content: NoteContent[] };

type NotesViewProps = {
  notes: (NoteSummary & { content?: NoteContent[] })[];
  currentUserId: string;
  onAddNote?: (data: NoteFormData) => Promise<void> | void;
  onUpdateNote?: (noteId: string, data: NoteFormData) => Promise<void> | void;
  onTogglePrivacy?: (noteId: string, isPrivate: boolean) => Promise<void> | void;
  onDeleteNote?: (noteId: string) => Promise<void> | void;
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
  accessRequests?: AccessRequest[];
  errorMessage?: string;
  statusMessage?: string;
};

export function NotesView(props: NotesViewProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [expandedAccessRequests, setExpandedAccessRequests] = useState<string | null>(null);

  const selectedNote = selectedNoteId ? props.notes.find((note) => note.id === selectedNoteId) : null;
  const editingNote = editingNoteId ? props.notes.find((note) => note.id === editingNoteId) : null;

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
            {block.type === "image" && block.content && (
              <img src={block.content} alt={block.metadata || "Note image"} className="note-readonly-image" />
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

  const handleCreateClick = () => {
    setEditingNoteId(null);
    setSelectedNoteId(null);
    setShowEditor(true);
  };

  const handleEditClick = (noteId: string) => {
    setEditingNoteId(noteId);
    setSelectedNoteId(null);
    setShowEditor(true);
  };

  const handleSaveNote = async (data: NoteFormData) => {
    if (editingNoteId) {
      await props.onUpdateNote?.(editingNoteId, data);
    } else {
      await props.onAddNote?.(data);
    }

    setShowEditor(false);
    setEditingNoteId(null);
  };

  const handleCancelEditor = () => {
    setShowEditor(false);
    setEditingNoteId(null);
  };

  const handleNoteAccessRequests = (noteId: string) => {
    return props.accessRequests?.filter((request) => request.noteId === noteId && request.status === "pending") || [];
  };

  if (showEditor) {
    return (
      <main className="view notes-editor-view">
        <NoteEditor
          note={editingNote ?? undefined}
          mode={editingNote ? "edit" : "create"}
          onSave={handleSaveNote}
          onCancel={handleCancelEditor}
        />
      </main>
    );
  }

  if (selectedNoteId) {
    if (!selectedNote) {
      return (
        <main className="view notes-editor-view">
          <section className="panel note-detail-panel">
            <div className="note-detail-header">
              <div>
                <h2>Note not found</h2>
                <p>The note may have been deleted or you may not have access.</p>
              </div>
              <button onClick={() => setSelectedNoteId(null)}>Back</button>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="view notes-editor-view">
        <section className="panel note-detail-panel">
          <div className="note-detail-header">
            <div>
              <h2>{selectedNote.title || "Note"}</h2>
              <p>{selectedNote.ownerUsername || "Unknown author"}</p>
            </div>
            <div className="note-detail-actions">
              {selectedNote.canEdit !== false && (
                <button onClick={() => handleEditClick(selectedNote.id)}>Edit</button>
              )}
              <button onClick={() => setSelectedNoteId(null)}>Back</button>
            </div>
          </div>
          <div className="note-detail-meta">
            <span className={`privacy-badge ${selectedNote.isPrivate ? "private" : "public"}`}>
              {selectedNote.isPrivate ? "🔒 Private" : "🌐 Public"}
            </span>
            {selectedNote.isFriendShared && <span className="privacy-badge public">Friend shared</span>}
          </div>
          {renderBlocks(selectedNote.content)}
        </section>
      </main>
    );
  }

  return (
    <main className="view notes-view">
      <div className="notes-container">
        <div className="notes-header">
          <div>
            <h2>Notes</h2>
            <p className="notes-subtitle">Public notes are visible to every signed-in student. Private notes stay with the owner unless shared.</p>
          </div>
          <button className="new-note-btn" onClick={handleCreateClick}>
            + New Note
          </button>
        </div>

        {props.errorMessage && <div className="notes-alert error">{props.errorMessage}</div>}
        {props.statusMessage && !props.errorMessage && <div className="notes-alert success">{props.statusMessage}</div>}

        {props.notes.length === 0 ? (
          <div className="empty-notes">
            <p>No notes found. Create your first note, or check that the backend is running and connected to the database.</p>
          </div>
        ) : (
          <div className="notes-grid">
            {props.notes.map((note) => {
              const pendingRequests = handleNoteAccessRequests(note.id);
              const isEditable = note.canEdit !== false;

              return (
                <div key={note.id} className="note-card">
                  <div className="note-card-header">
                    <h3 className="note-card-title">{note.title}</h3>
                    <div className="note-card-badges">
                      <span className={`privacy-badge ${note.isPrivate ? "private" : "public"}`}>
                        {note.isPrivate ? "🔒 Private" : "🌐 Public"}
                      </span>
                      {note.ownerUsername && note.ownerUsername !== "Demo Student" && (
                        <span className="privacy-badge public">{note.ownerUsername}</span>
                      )}
                      {note.isFriendShared && <span className="privacy-badge public">Friend</span>}
                    </div>
                  </div>

                  {note.content && note.content.length > 0 && (
                    <div className="note-card-preview">
                      {note.content.slice(0, 2).map((block) => (
                        <div key={block.id} className={`preview-block ${block.type}`}>
                          {block.type === "text" && <p>{block.content.substring(0, 100)}{block.content.length > 100 ? "..." : ""}</p>}
                          {block.type === "image" && <span>[Image]</span>}
                          {block.type === "link" && <span>[Link: {block.metadata || block.content}]</span>}
                        </div>
                      ))}
                      {note.content.length > 2 && <p className="more-content">+{note.content.length - 2} more</p>}
                    </div>
                  )}

                  {isEditable && note.isPrivate && pendingRequests.length > 0 && (
                    <div className="pending-requests-badge">
                      {pendingRequests.length} access request{pendingRequests.length > 1 ? "s" : ""}
                    </div>
                  )}

                  <div className="note-card-actions">
                    <button className="view-btn" onClick={() => setSelectedNoteId(note.id)}>
                      View
                    </button>
                    {isEditable && (
                      <>
                        <button className="edit-btn" onClick={() => handleEditClick(note.id)}>
                          Edit
                        </button>
                        <button
                          className={`privacy-btn ${note.isPrivate ? "make-public" : "make-private"}`}
                          onClick={() => props.onTogglePrivacy?.(note.id, !note.isPrivate)}
                          title={`Make ${note.isPrivate ? "public" : "private"}`}
                        >
                          {note.isPrivate ? "Make Public" : "Make Private"}
                        </button>
                        <button className="delete-btn" onClick={() => props.onDeleteNote?.(note.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>

                  {isEditable && note.isPrivate && pendingRequests.length > 0 && (
                    <div className="access-requests-section">
                      <button
                        className="expand-requests-btn"
                        onClick={() =>
                          setExpandedAccessRequests(expandedAccessRequests === note.id ? null : note.id)
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
                                <button className="approve-btn" onClick={() => props.onApproveRequest?.(request.id)}>
                                  ✓
                                </button>
                                <button className="reject-btn" onClick={() => props.onRejectRequest?.(request.id)}>
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
