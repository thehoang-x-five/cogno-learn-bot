/**
 * Citation parser utility.
 *
 * Responsibilities:
 * - Parse inline citations like `[file.pdf, trang 3]`
 * - Replace them with `[1]`, `[2]`, ...
 * - Map parsed references back to backend citation data when possible
 * - Strip model-generated bibliography sections because the UI already renders them
 */

export interface Citation {
  chunk_id?: number;
  document_title: string;
  page_number?: number;
  relevance_score?: number;
  quote?: string;
}

export interface ParsedCitation {
  index: number;
  originalText: string;
  documentTitle: string;
  pageNumber: number | null;
  pageNumbers?: number[];
  citationData: Citation | null;
}

export interface ParseResult {
  parsedContent: string;
  citationMap: Map<number, ParsedCitation>;
}

function normalizeVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeTitleForMatch(title: string): string {
  return normalizeVietnamese(title)
    .replace(/\.(pdf|docx?|xlsx?|pptx?|txt|csv|md|png|jpe?g|gif)$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidPageNumber(pageNumber?: number | null): pageNumber is number {
  return typeof pageNumber === 'number' && pageNumber > 0;
}

function isPlaceholderSourceTitle(title: string): boolean {
  const normalized = normalizeVietnamese(title).trim();
  return /^(image|img|figure|fig|hinh|anh)\s*\d+$/i.test(normalized);
}

function titleMatchScore(left?: string | null, right?: string | null): number {
  if (!left || !right) return 0;

  const a = normalizeTitleForMatch(left);
  const b = normalizeTitleForMatch(right);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;

  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  let overlap = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1;
  });

  return overlap;
}

function pickBestCitationMatch(
  title: string,
  pageNumbers: number[],
  citations: Citation[],
  fallbackIndex = 0
): Citation | null {
  if (isPlaceholderSourceTitle(title)) {
    const pageMatch = citations.find((citation) =>
      pageNumbers.length > 0 && isValidPageNumber(citation.page_number)
        ? pageNumbers.includes(citation.page_number)
        : false
    );
    return pageMatch || citations[fallbackIndex] || citations[0] || null;
  }

  const ranked = citations
    .map((citation) => {
      const titleScore = titleMatchScore(title, citation.document_title);
      const pageScore = pageNumbers.length > 0 && isValidPageNumber(citation.page_number) && pageNumbers.includes(citation.page_number) ? 20 : 0;
      const relevanceScore = citation.relevance_score ?? 0;
      return {
        citation,
        titleScore,
        pageScore,
        score: titleScore * 100 + pageScore + relevanceScore,
      };
    })
    .filter((item) => item.titleScore > 0 || item.pageScore > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length > 0) {
    return ranked[0].citation;
  }

  const pageOnlyMatches = citations.filter((citation) =>
    pageNumbers.length > 0 && isValidPageNumber(citation.page_number) ? pageNumbers.includes(citation.page_number) : false
  );

  return pageOnlyMatches[0] || citations[fallbackIndex] || null;
}

export function stripGeneratedReferenceSection(content: string): string {
  if (!content) return content;

  const lines = content.split(/\r?\n/);
  const minStartIndex = Math.floor(lines.length * 0.4);

  for (let index = minStartIndex; index < lines.length; index += 1) {
    const line = normalizeVietnamese(lines[index] || '')
      .replace(/^[#>*\-\s]+/, '')
      .trim();

    const isReferenceHeader = /^(tai lieu tham khao|tham khao|nguon tham khao|nguon)(?:\s*\(\d+\)|\s*:)?$/.test(line);
    if (!isReferenceHeader) continue;

    const trailing = lines.slice(index + 1).filter((item) => item.trim() !== '');
    if (trailing.length === 0) {
      return lines.slice(0, index).join('\n').trimEnd();
    }

    const looksLikeReferenceList = trailing.slice(0, 8).every((item) => {
      const normalized = normalizeVietnamese(item).trim();
      return (
        /^[\-\d[*•(]/.test(item.trim()) ||
        /\.(pdf|docx?|xlsx?|pptx?|txt|csv|md|png|jpe?g|gif)\b/i.test(item) ||
        /\b(trang|page)\b/.test(normalized) ||
        /^\[[^\]]+\]$/.test(item.trim())
      );
    });

    if (looksLikeReferenceList) {
      return lines.slice(0, index).join('\n').trimEnd();
    }
  }

  return content;
}

export function parseCitations(
  content: string,
  citations: Citation[]
): ParseResult {
  let cleanedContent = stripGeneratedReferenceSection(content)
    .replace(/\[\.\.\.\]/g, '')
    .replace(/\[nguồn\]/gi, '')
    .replace(/\[tài liệu\]/gi, '')
    .replace(/\[xem thêm\]/gi, '')
    .replace(/\[tham khảo\]/gi, '')
    .replace(/\[chi tiết\]/gi, '')
    .replace(/\[thông tin\]/gi, '');

  const citationPattern = /\[([^\]]+?)(?:,\s*|\s*-\s*)(?:trang|page)\s+([\d,\-\s]+)\]/gi;
  const citationMap = new Map<number, ParsedCitation>();
  let citationIndex = 0;

  let parsedContent = cleanedContent.replace(citationPattern, (match, title, pageStr) => {
    citationIndex += 1;

    const pageNumbers: number[] = [];
    const parts = pageStr.split(',').map((part: string) => part.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((value: string) => parseInt(value.trim(), 10));
        if (!Number.isNaN(start) && !Number.isNaN(end) && start > 0 && end > 0) {
          for (let value = start; value <= end; value += 1) {
            pageNumbers.push(value);
          }
        }
      } else {
        const value = parseInt(part, 10);
        if (!Number.isNaN(value) && value > 0) {
          pageNumbers.push(value);
        }
      }
    }

    const matchingCitation = pickBestCitationMatch(title, pageNumbers, citations, citationIndex - 1);
    citationMap.set(citationIndex, {
      index: citationIndex,
      originalText: match,
      documentTitle: title.trim(),
      pageNumber: pageNumbers[0] ?? null,
      pageNumbers,
      citationData: matchingCitation,
    });

    return `[${citationIndex}]`;
  });

  const fileExt = '(?:png|jpg|jpeg|gif|pdf|docx?|xlsx?|pptx?|txt|csv|md)';
  const bracketWithFiles = new RegExp(
    `\\[([^\\]\\[]*?\\.${fileExt}(?:\\s*,\\s*[^\\]\\[]*?)*)\\]`,
    'gi'
  );

  parsedContent = parsedContent.replace(bracketWithFiles, (match, inner) => {
    if (/^\[\d+\]$/.test(match)) return match;

    const parts = inner.split(',').map((part: string) => part.trim());
    const fileExtRegex = new RegExp(`\\.${fileExt}$`, 'i');
    const files: string[] = [];
    const pages: number[] = [];

    for (const part of parts) {
      if (fileExtRegex.test(part)) {
        files.push(part);
        continue;
      }

      const pageMatch = part.match(/(?:trang|page)\s*([\d\-,\s]+)/i);
      if (pageMatch) {
        const values = pageMatch[1]
          .split(/[\-,]/)
          .map((item) => parseInt(item.trim(), 10))
          .filter((item) => !Number.isNaN(item) && item > 0);
        pages.push(...values);
        continue;
      }

      const value = parseInt(part, 10);
      if (!Number.isNaN(value) && value > 0) {
        pages.push(value);
      }
    }

    if (files.length === 0) return match;

    const refs: string[] = [];
    for (const file of files) {
      citationIndex += 1;
      const matchingCitation = pickBestCitationMatch(file, pages, citations, citationIndex - 1);

      citationMap.set(citationIndex, {
        index: citationIndex,
        originalText: match,
        documentTitle: file,
        pageNumber: isValidPageNumber(matchingCitation?.page_number) ? matchingCitation.page_number : (pages[0] ?? null),
        pageNumbers: pages.length > 0 ? pages : undefined,
        citationData: matchingCitation,
      });

      refs.push(`[${citationIndex}]`);
    }

    return refs.join(' ');
  });

  return { parsedContent, citationMap };
}

export function groupCitationsByDocument(citations: Citation[]): Map<string, Citation[]> {
  const grouped = new Map<string, Citation[]>();

  citations.forEach((citation) => {
    const title = citation.document_title;
    if (!grouped.has(title)) {
      grouped.set(title, []);
    }
    grouped.get(title)!.push(citation);
  });

  grouped.forEach((group) => {
    group.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  });

  return grouped;
}

export function formatRelevance(score?: number | null): string {
  if (score === undefined || score === null) return '—';

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return '—';
  if (numericScore <= 0) return '<1%';

  const normalizedScore = numericScore < 0.01
    ? Math.min(1, numericScore * 100)
    : Math.min(1, numericScore);

  const pct = Math.round(Math.max(1, normalizedScore * 100));
  return `${pct}%`;
}

export function getRelevanceColor(score?: number | null): string {
  if (score === undefined || score === null) return 'text-gray-500';

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return 'text-gray-500';

  const normalizedScore = numericScore > 0 && numericScore < 0.01
    ? Math.min(1, numericScore * 100)
    : Math.min(1, Math.max(0, numericScore));

  if (normalizedScore >= 0.8) return 'text-green-600 dark:text-green-400';
  if (normalizedScore >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-600 dark:text-gray-400';
}

export function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}
