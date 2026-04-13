/**
 * Strip HTML tags from a string to prevent XSS via stored payloads.
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}
