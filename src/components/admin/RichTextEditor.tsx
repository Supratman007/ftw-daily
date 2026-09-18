"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const toolbarBtnClass = (active: boolean) =>
  `rounded px-2 py-1 text-xs font-semibold ${
    active ? "bg-teal text-white" : "text-ink-soft hover:bg-sand"
  }`;

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${toolbarBtnClass(Boolean(active))} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {label}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-sand-deep bg-sand/50 px-2 py-1">
      <ToolbarButton
        label="Normal"
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
      />
      <ToolbarButton
        label="H1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label="H2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="H3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <span className="mx-1 h-4 w-px bg-sand-deep" aria-hidden="true" />
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <span className="mx-1 h-4 w-px bg-sand-deep" aria-hidden="true" />
      <ToolbarButton
        label="• List"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="1. List"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink} />
      <span className="mx-1 h-4 w-px bg-sand-deep" aria-hidden="true" />
      <ToolbarButton
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolbarButton
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  );
}

/**
 * A small WYSIWYG editor for the product "Full description" field
 * (and its Indonesian translation) -- before this, admins could only
 * type plain text here, with no way to set a heading or bold a word.
 * Built on Tiptap, restricted to exactly what a product description
 * needs: headings 1-3, bold/italic/underline, links, and bullet/
 * numbered lists -- deliberately not a full document editor (no
 * tables, images, code blocks, colors) to keep it simple for a
 * non-technical admin and to keep the output easy to render safely.
 *
 * Renders a real `<textarea>`-shaped form field via a hidden input:
 * Server Actions read plain FormData, so whatever HTML the editor
 * currently holds needs to be in the DOM as an actual input value at
 * submit time, not just live in React/Tiptap's own state. The server
 * sanitizes it again on the way in regardless (see
 * sanitizeDescriptionHtml.ts) -- this component's allowlist and that
 * one's are meant to match, but the server is the one that's trusted.
 */
export function RichTextEditor({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true },
      }),
    ],
    content: defaultValue,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-content min-h-[10rem] px-3 py-2 text-sm outline-none",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-sand-deep focus-within:border-teal">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
