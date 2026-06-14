import { useEffect, useState } from "react";
import type { NoteSummary } from "../../types";

type NoteContent = {
  type: "text" | "image" | "link";
  id: string;
  content: string;
  metadata?: string;
};

type NoteEditorProps = {
  note?: NoteSummary & { content?: NoteContent[] };
  mode?: "create" | "edit";
  onSave: (data: { title: string; isPrivate: boolean; content: NoteContent[] }) => Promise<void> | void;
  onCancel: () => void;
};

function createBlock(type: NoteContent["type"]): NoteContent {
  return {
    type,
    id: `block-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    content: "",
    metadata: type === "image" ? "Paste image URL or upload" : ""
  };
}

export function NoteEditor(props: NoteEditorProps) {
  const [title, setTitle] = useState(props.note?.title || "");
  const [isPrivate, setIsPrivate] = useState(props.note?.isPrivate ?? false);
  const [contentBlocks, setContentBlocks] = useState<NoteContent[]>(props.note?.content || []);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setTitle(props.note?.title || "");
    setIsPrivate(props.note?.isPrivate ?? false);
    setContentBlocks(props.note?.content || []);
    setErrorMessage("");
  }, [props.note?.id]);

  const handleAddBlock = (type: NoteContent["type"]) => {
    setContentBlocks((current) => [...current, createBlock(type)]);
  };

  const handleUpdateBlock = (id: string, content: string, metadata?: string) => {
    setContentBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, content, metadata: metadata !== undefined ? metadata : block.metadata } : block
      )
    );
  };

  const handleDeleteBlock = (id: string) => {
    setContentBlocks((current) => current.filter((block) => block.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage("Please enter a note title.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      await props.onSave({
        title: title.trim(),
        isPrivate,
        content: contentBlocks.map((block) => ({
          ...block,
          content: block.content || "",
          metadata: block.metadata?.trim() || undefined
        }))
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the note.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        <div>
          <p className="editor-mode-label">{props.mode === "edit" ? "Edit note" : "Create note"}</p>
          <input
            type="text"
            className="note-title-input"
            placeholder="Note title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="privacy-controls">
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => setIsPrivate(event.target.checked)}
            />
            <span className={isPrivate ? "badge private" : "badge public"}>
              {isPrivate ? "🔒 Private" : "🌐 Public"}
            </span>
          </label>
        </div>
      </div>

      {errorMessage && <div className="notes-alert error">{errorMessage}</div>}

      <div className="editor-content">
        {contentBlocks.length === 0 && <p className="empty-state">Start adding content to your note.</p>}

        {contentBlocks.map((block) => (
          <div key={block.id} className={`content-block block-${block.type}`}>
            <div className="block-header">
              <span className="block-type">{block.type.toUpperCase()}</span>
              <button
                className="delete-block-btn"
                onClick={() => handleDeleteBlock(block.id)}
                title="Delete this block"
                type="button"
              >
                ✕
              </button>
            </div>

            {block.type === "text" && (
              <textarea
                className="text-block-input"
                placeholder="Enter your text..."
                value={block.content}
                onChange={(event) => handleUpdateBlock(block.id, event.target.value)}
              />
            )}

            {block.type === "image" && (
              <div className="image-block-input">
                <input
                  type="text"
                  placeholder="Paste image URL"
                  value={block.content}
                  onChange={(event) => handleUpdateBlock(block.id, event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Image alt text / description"
                  value={block.metadata || ""}
                  onChange={(event) => handleUpdateBlock(block.id, block.content, event.target.value)}
                />
                {block.content && (
                  <div className="image-preview">
                    <img src={block.content} alt={block.metadata || "Preview"} onError={() => {}} />
                  </div>
                )}
              </div>
            )}

            {block.type === "link" && (
              <div className="link-block-input">
                <input
                  type="text"
                  placeholder="Link URL"
                  value={block.content}
                  onChange={(event) => handleUpdateBlock(block.id, event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Link title (optional)"
                  value={block.metadata || ""}
                  onChange={(event) => handleUpdateBlock(block.id, block.content, event.target.value)}
                />
                {block.content && (
                  <a href={block.content} target="_blank" rel="noopener noreferrer" className="link-preview">
                    {block.metadata || block.content}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="editor-toolbar">
        <div className="toolbar-buttons">
          <button className="add-block-btn text" onClick={() => handleAddBlock("text")} type="button">
            + Text
          </button>
          <button className="add-block-btn image" onClick={() => handleAddBlock("image")} type="button">
            + Image
          </button>
          <button className="add-block-btn link" onClick={() => handleAddBlock("link")} type="button">
            + Link
          </button>
        </div>

        <div className="action-buttons">
          <button className="cancel-btn" onClick={props.onCancel} disabled={isSaving} type="button">
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={isSaving} type="button">
            {isSaving ? "Saving..." : props.mode === "edit" ? "Update Note" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
