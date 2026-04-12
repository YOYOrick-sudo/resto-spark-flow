import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ReceptDetail } from "@/hooks/useRecept";
import { useReceptMutations } from "@/hooks/useReceptMutations";

interface BereidingTabProps {
  recept: ReceptDetail;
}

export function BereidingTab({ recept }: BereidingTabProps) {
  const { updateRecept } = useReceptMutations();
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Voeg bereidingsstappen toe...",
      }),
    ],
    content: recept.bereiding || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateRecept.mutate({
          id: recept.id,
          bereiding: editor.getHTML(),
        });
      }, 2000);
    },
    onBlur: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      updateRecept.mutate({
        id: recept.id,
        bereiding: editor.getHTML(),
      });
    },
  });

  // Update content when recept changes
  React.useEffect(() => {
    if (editor && recept.bereiding !== editor.getHTML()) {
      editor.commands.setContent(recept.bereiding || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recept.id]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
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
      className={`min-w-[32px] min-h-[32px] rounded-md text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent"
      } ${className || ""}`}
    >
      {label}
    </button>
  );
}
