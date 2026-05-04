import type { NoteSummary } from "../../types";

type NotesViewProps = {
  notes: NoteSummary[];
  onAddNote: () => void;
};

export function NotesView(props: NotesViewProps) {
  return (
    <main className="view">
      <section className="panel">
        <h2>My Notes</h2>
        <button onClick={props.onAddNote}>Add sample note</button>
        <ul>
          {props.notes.map((note) => (
            <li key={note.id}>{note.title}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
