import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useStepWizard } from "@/components/polar/StepWizard";

export function GerechtStapBereiding() {
  const { formData, setStepData } = useStepWizard();
  const initialContent = formData.bereidingswijze?.html || "";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Stap 1: Verwarm het bord voor...\nStap 2: Schep de...",
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[250px] p-4 focus:outline-none text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      setStepData("bereidingswijze", { html: editor.getHTML() });
    },
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {editor && (
        <div className="flex gap-1 p-2 border-b border-border/50">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="B"
            className="font-bold"
          />
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="I"
            className="italic"
          />
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="1."
          />
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="•"
          />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[36px] min-h-[36px] rounded-md text-sm transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
      } ${className || ""}`}
    >
      {label}
    </button>
  );
}
