import * as React from "react";
import { useStepWizard } from "@/components/polar/StepWizard";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

export function ReceptStapBereiding() {
  const { formData, setStepData } = useStepWizard();
  const initial = formData.bereiding?.html || "";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Stap 1: Verhit de olie in een pan...\nStap 2: Voeg de uien toe en...",
      }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      setStepData("bereiding", { html: editor.getHTML() });
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {editor && (
        <div className="flex gap-1 p-2 border-b border-border/50">
          <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="B" className="font-bold" />
          <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" className="italic" />
          <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1." />
          <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="•" />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({ active, onClick, label, className }: { active: boolean; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[32px] min-h-[32px] rounded-md text-sm transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
      } ${className || ""}`}
    >
      {label}
    </button>
  );
}
