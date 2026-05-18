import { useState } from "react";
import type { NoteSummary } from "../../types";

type NoteContent = {
  type: "text" | "image" | "link";
  id: string;
  content: string;
  metadata?: string;
};

type NoteEditorProps = {
  note?: NoteSummary & { content?: NoteContent[] };
  onSave: (data: { title: string; isPrivate: boolean; content: NoteContent[] }) => void;
  onCancel: () => void;
  isPrivate?: boolean;
};

export function NoteEditor(props: NoteEditorProps) {
  const [title, setTitle] = useState(props.note?.title || "");
  const [isPrivate, setIsPrivate] = useState(props.isPrivate ?? false);
  const [contentBlocks, setContentBlocks] = useState<NoteContent[]>(
    props.note?.content || []
  );

  const handleAddTextBlock = () => {
    const newBlock: NoteContent = {
      type: "text",
      id: `block-${Date.now()}`,
      content: "",
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const handleAddImageBlock = () => {
    const newBlock: NoteContent = {
      type: "image",
      id: `block-${Date.now()}`,
      content: "",
      metadata: "Paste image URL or upload",
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const handleAddLinkBlock = () => {
    const newBlock: NoteContent = {
      type: "link",
      id: `block-${Date.now()}`,
      content: "",
      metadata: "",
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const handleUpdateBlock = (
    id: string,
    content: string,
    metadata?: string
  ) => {
    setContentBlocks(
      contentBlocks.map((block) =>
        block.id === id
          ? { ...block, content, metadata: metadata !== undefined ? metadata : block.metadata }
          : block
      )
    );
  };

  const handleDeleteBlock = (id: string) => {
    setContentBlocks(contentBlocks.filter((block) => block.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a note title");
      return;
    }
    props.onSave({ title, isPrivate, content: contentBlocks });
  };

  return (
    <div className="note-editor">
      <div className="editor-header">
        <input
          type="text"
          className="note-title-input"
          placeholder="Note Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="privacy-controls">
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span className={isPrivate ? "badge private" : "badge public"}>
              {isPrivate ? "🔒 Private" : "🌐 Public"}
            </span>
          </label>
        </div>
      </div>

      <div className="editor-content">
        {contentBlocks.length === 0 && (
          <p className="empty-state">Start adding content to your note</p>
        )}

        {contentBlocks.map((block, index) => (
          <div key={block.id} className={`content-block block-${block.type}`}>
            <div className="block-header">
              <span className="block-type">{block.type.toUpperCase()}</span>
              <button
                className="delete-block-btn"
                onClick={() => handleDeleteBlock(block.id)}
                title="Delete this block"
              >
                ✕
              </button>
            </div>

            {block.type === "text" && (
              <textarea
                className="text-block-input"
                placeholder="Enter your text..."
                value={block.content}
                onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
              />
            )}

            {block.type === "image" && (
              <div className="image-block-input">
                <input
                  type="text"
                  placeholder="Paste image URL"
                  value={block.content}
                  onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
                />
                {block.content && (
                  <div className="image-preview">
                    <img src={block.content} alt="Preview" onError={() => {}} />
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
                  onChange={(e) => handleUpdateBlock(block.id, e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Link title (optional)"
                  value={block.metadata || ""}
                  onChange={(e) => handleUpdateBlock(block.id, block.content, e.target.value)}
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
          <button className="add-block-btn text" onClick={handleAddTextBlock}>
            + Text
          </button>
          <button className="add-block-btn image" onClick={handleAddImageBlock}>
            + Image
          </button>
          <button className="add-block-btn link" onClick={handleAddLinkBlock}>
            + Link
          </button>
        </div>

        <div className="action-buttons">
          <button className="cancel-btn" onClick={props.onCancel}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
