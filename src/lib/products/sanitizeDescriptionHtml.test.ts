import { describe, expect, it } from "vitest";
import {
  isBlankHtml,
  sanitizeDescriptionHtml,
  sanitizeDescriptionHtmlOrNull,
} from "./sanitizeDescriptionHtml";

// The one boundary where raw admin-entered HTML (from RichTextEditor)
// gets cleaned before it's stored and later rendered with
// dangerouslySetInnerHTML on the public product page -- worth real
// test coverage, same reasoning as any other security boundary.

describe("sanitizeDescriptionHtml", () => {
  it("keeps everything the editor's toolbar can produce", () => {
    const input =
      "<h1>Trip</h1><h2>Day one</h2><h3>Morning</h3>" +
      "<p>Some <strong>bold</strong>, <em>italic</em> and <u>underlined</u> text.</p>" +
      '<ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>' +
      '<p><a href="https://example.com">a link</a></p>';
    expect(sanitizeDescriptionHtml(input)).toBe(
      "<h1>Trip</h1><h2>Day one</h2><h3>Morning</h3>" +
        "<p>Some <strong>bold</strong>, <em>italic</em> and <u>underlined</u> text.</p>" +
        "<ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>" +
        '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">a link</a></p>'
    );
  });

  it("strips a script tag entirely, including its content", () => {
    const clean = sanitizeDescriptionHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(clean).toBe("<p>Hello</p>");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("alert");
  });

  it("drops an inline event handler attribute but keeps the text", () => {
    const clean = sanitizeDescriptionHtml('<p onclick="steal()">Click me</p>');
    expect(clean).toBe("<p>Click me</p>");
    expect(clean).not.toContain("onclick");
  });

  it("blocks a javascript: link href", () => {
    const clean = sanitizeDescriptionHtml('<p><a href="javascript:alert(1)">go</a></p>');
    expect(clean).not.toContain("javascript:");
  });

  it("drops tags it doesn't allow (image, table, style) but keeps their text", () => {
    const clean = sanitizeDescriptionHtml(
      '<img src="x.jpg" alt="x"><table><tr><td>Cell</td></tr></table><style>body{}</style>'
    );
    expect(clean).toBe("Cell");
  });

  it("forces target/rel on every link, even one the editor didn't set them on", () => {
    const clean = sanitizeDescriptionHtml('<p><a href="https://example.com">link</a></p>');
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });
});

describe("isBlankHtml", () => {
  it("treats an empty Tiptap document as blank", () => {
    expect(isBlankHtml("<p></p>")).toBe(true);
  });

  it("treats whitespace-only content as blank", () => {
    expect(isBlankHtml("<p>   </p>")).toBe(true);
  });

  it("is not blank once there's real text", () => {
    expect(isBlankHtml("<p>Hello</p>")).toBe(false);
  });
});

describe("sanitizeDescriptionHtmlOrNull", () => {
  it("returns null for an empty editor", () => {
    expect(sanitizeDescriptionHtmlOrNull("<p></p>")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(sanitizeDescriptionHtmlOrNull("")).toBeNull();
  });

  it("returns the sanitized HTML when there's real content", () => {
    expect(sanitizeDescriptionHtmlOrNull("<p>Hello</p>")).toBe("<p>Hello</p>");
  });
});
