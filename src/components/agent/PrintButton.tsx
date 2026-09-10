"use client";

/** window.print() needs a browser event handler, so this is the one
 * small client-side piece of an otherwise server-rendered report page
 * -- "print" doubles as "save as PDF" via the browser's own print
 * dialog, no PDF-generation dependency needed. The page's print:hidden
 * classes (nav, filter form, this button itself) keep the printed
 * output to just the report. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-sand-deep px-3 py-2 text-sm font-semibold text-ink hover:bg-sand"
    >
      Print
    </button>
  );
}
