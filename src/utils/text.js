const normalizeWhitespace = (value) =>
  value
    .replace(/\s+/g, " ")
    .replace(/\s([?!.,;:])/g, "$1")
    .trim();

function extractSummary(article) {
  const candidates = [
    article.description,
    article.content,
    article.excerpt,
    article.summary,
  ].filter(Boolean);

  if (!candidates.length) {
    return normalizeWhitespace(article.title || "Latest headline");
  }

  return normalizeWhitespace(candidates[0]);
}

function truncate(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 50 ? lastSpace : maxLength)}…`;
}

module.exports = {
  extractSummary,
  truncate,
  normalizeWhitespace,
};
