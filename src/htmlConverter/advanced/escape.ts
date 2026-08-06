// Single HTML-escaping helper shared by render/ and config/templates.
// Escapes text content and attribute values (quotes included).

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
