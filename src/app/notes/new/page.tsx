import { NoteForm } from "@/components/note-form";
export default function NewNote() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow mb-3">WRITE · PROTECT · SHARE</p>
      <h1 className="mb-3 text-4xl font-semibold tracking-tight">
        A new note.
      </h1>
      <p className="mb-8 text-stone-600">
        You choose the words. You control the access.
      </p>
      <NoteForm />
    </div>
  );
}
