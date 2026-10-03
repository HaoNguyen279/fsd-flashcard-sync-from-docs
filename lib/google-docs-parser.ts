import {
  GoogleDocsDocument,
  GoogleDocsStructuralElement,
  GoogleDocsTableCell,
  GoogleDocsTable,
  VocabularyItem,
} from "./types";

/**
 * Regex to match parenthesized annotations in a vocabulary word.
 * Captures things like: (adv), (v), (n), (adj), (n/v), (hesitate to do something,...), etc.
 * This matches one or more parenthesized groups anywhere in the string.
 */
const WORD_ANNOTATION_REGEX = /\s*\(([^)]*)\)\s*/g;

/**
 * Regex matching standard English parts of speech abbreviations and full names.
 * Supports combinations like v/n, adj, adv, phr v, vi, vt, etc.
 */
const POS_KEYWORD_REGEX =
  /^(adj|adjective|adv|adverb|v|verb|n|noun|prep|preposition|conj|conjunction|pron|pronoun|interj|art|num|vi|vt|phr\s*v|phr|phrase|idiom|colloc|c|u|pl|plural|sing|singular)(\s*[\/,]\s*(adj|adjective|adv|adverb|v|verb|n|noun|prep|preposition|conj|conjunction|pron|pronoun|interj|art|num|vi|vt|phr\s*v|phr|phrase|idiom|colloc|c|u|pl|plural|sing|singular))*$/i;

/**
 * Helper to check if a parenthesized text is a part of speech (từ loại)
 * such as (v), (adj), (adv), (n), (v/n), (vi), (vt), (phr v), etc.
 */
export function isPartOfSpeech(text: string): boolean {
  if (!text) return false;
  const normalized = text.trim().replace(/\./g, "").toLowerCase();
  return POS_KEYWORD_REGEX.test(normalized);
}

/**
 * Delimiters used to separate cleanWord from annotations/notes.
 * Matches: (, [, =, +, :, ;, ,, →, ≈, or a dash surrounded by spaces (\s[-–—]\s).
 * Compound words (well-known) and attached slashes (and/or) are NOT delimiters.
 */
const WORD_DELIMITER_REGEX = /([(\[=+:,;→≈]|\s[-–—]\s)/;

/**
 * Strong delimiters marking the boundary of the "head region" (vùng đầu) for part of speech.
 * Delimiters: =, +, :, ;, →, ≈.
 */
const STRONG_DELIMITER_REGEX = /[=+:,;→≈]/;

/**
 * Process a raw word string from Google Docs to separate:
 * 1. cleanWord: Single word or multi-word phrase for the front of the flashcard.
 * 2. partOfSpeech: Grammatical parts of speech found in the head region (e.g. (v), (adj), (adv), (n), (prep), (v/n)).
 * 3. extraNotes: All usage notes, synonyms, and trailing notes (e.g. "= temporary", "(to do something)", "on sth").
 * 4. annotation: Combined partOfSpeech + extraNotes.
 *
 * Rules:
 * 1. Normalization: Collapse consecutive whitespace to 1 space, trim, strip leading quotes/apostrophes ('"‘’“”`).
 * 2. cleanWord: Text BEFORE the first delimiter.
 *    Strip trailing quotes ('"‘’“”`) and trailing punctuation (,;:), then trim.
 *    Fallback: If cleanWord is empty, strip all (...) and take text before first delimiter or first token.
 * 3. partOfSpeech:
 *    Head region = text before the first STRONG delimiter (=, +, :, ;, →, ≈).
 *    Only parenthesized groups (...) in the head region that satisfy isPartOfSpeech() are included.
 *    Groups after strong delimiters (e.g. +(N), (prep) at the end) remain in notes.
 *    Deduplicate partOfSpeechList (case-insensitive, preserving order).
 * 4. extraNotes:
 *    Remainder of the string after cleanWord, with POS groups removed from the head region of the remainder.
 *    Whitespace collapsed and trimmed.
 * 5. rawWord: Preserved as-is.
 */
export function processWordAnnotations(rawWord: string): {
  cleanWord: string;
  partOfSpeech: string;
  extraNotes: string;
  annotation: string;
} {
  if (!rawWord || typeof rawWord !== "string") {
    return { cleanWord: "", partOfSpeech: "", extraNotes: "", annotation: "" };
  }

  // 1. Chuẩn hóa: gộp whitespace liên tiếp thành 1 dấu cách, trim, xóa quotes/apostrophes ở đầu chuỗi
  let normalized = rawWord.replace(/\s+/g, " ").trim();
  normalized = normalized.replace(/^['"‘’“”`]+/, "").trim();

  if (!normalized) {
    return { cleanWord: "", partOfSpeech: "", extraNotes: "", annotation: "" };
  }

  // 2. Xác định cleanWord: lấy phần text TRƯỚC delimiter đầu tiên tìm thấy trong chuỗi
  const delimiterMatch = normalized.match(WORD_DELIMITER_REGEX);

  let cleanWord = "";
  let remainder = "";

  if (delimiterMatch && delimiterMatch.index !== undefined) {
    const rawClean = normalized.slice(0, delimiterMatch.index);
    cleanWord = rawClean
      .replace(/['"‘’“”`]+$/, "")
      .replace(/[,;:]+$/, "")
      .replace(/['"‘’“”`]+$/, "")
      .trim();

    remainder = normalized.slice(delimiterMatch.index);
  } else {
    // Không có delimiter trong chuỗi
    cleanWord = normalized
      .replace(/['"‘’“”`]+$/, "")
      .replace(/[,;:]+$/, "")
      .replace(/['"‘’“”`]+$/, "")
      .trim();
    remainder = "";
  }

  // Fallback: nếu cleanWord rỗng (vd chuỗi bắt đầu bằng delimiter như "(adj) word" hoặc "= note")
  if (!cleanWord) {
    const withoutParens = normalized.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    const fallbackMatch = withoutParens.match(WORD_DELIMITER_REGEX);
    if (fallbackMatch && fallbackMatch.index !== undefined && fallbackMatch.index > 0) {
      cleanWord = withoutParens
        .slice(0, fallbackMatch.index)
        .replace(/['"‘’“”`]+$/, "")
        .replace(/[,;:]+$/, "")
        .replace(/['"‘’“”`]+$/, "")
        .trim();
    }
    if (!cleanWord) {
      const matchFirstWord = withoutParens.match(/^([^\s]+)([\s\S]*)$/);
      if (matchFirstWord) {
        let firstToken = matchFirstWord[1].trim().replace(/^['"‘’“”`]+/, "");
        firstToken = firstToken.replace(/[,;:]+$/, "").replace(/['"‘’“”`]+$/, "").trim();
        cleanWord = firstToken;
      } else {
        cleanWord = withoutParens;
      }
    }

    const cleanWordIdx = normalized.indexOf(cleanWord);
    if (cleanWordIdx !== -1) {
      remainder = (
        normalized.slice(0, cleanWordIdx) +
        " " +
        normalized.slice(cleanWordIdx + cleanWord.length)
      ).trim();
    }
  }

  // 3. Xác định partOfSpeech:
  // "Vùng đầu" = phần chuỗi trước delimiter MẠNH đầu tiên trong tập: = + : ; → ≈
  const strongMatch = normalized.match(STRONG_DELIMITER_REGEX);
  const headRegion =
    strongMatch && strongMatch.index !== undefined
      ? normalized.slice(0, strongMatch.index)
      : normalized;

  // Chỉ các nhóm (...) nằm trong vùng đầu và thỏa isPartOfSpeech() mới được đưa vào partOfSpeechList
  const partOfSpeechList: string[] = [];
  const parenRegex = /\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenRegex.exec(headRegion)) !== null) {
    const content = match[1]?.trim();
    if (content && isPartOfSpeech(content)) {
      partOfSpeechList.push(`(${content})`);
    }
  }

  // Dedupe partOfSpeechList (giữ thứ tự, so sánh lowercase)
  const seenPos = new Set<string>();
  const deduplicatedPosList: string[] = [];
  for (const pos of partOfSpeechList) {
    const lower = pos.toLowerCase();
    if (!seenPos.has(lower)) {
      seenPos.add(lower);
      deduplicatedPosList.push(pos);
    }
  }
  const partOfSpeech = deduplicatedPosList.join(" ").trim();

  // 4. extraNotes:
  // Phần còn lại của chuỗi sau cleanWord, loại bỏ các nhóm POS đã đưa vào partOfSpeech
  let headOfRemainder = remainder;
  let tailOfRemainder = "";

  const remainderStrongMatch = remainder.match(STRONG_DELIMITER_REGEX);
  if (remainderStrongMatch && remainderStrongMatch.index !== undefined) {
    headOfRemainder = remainder.slice(0, remainderStrongMatch.index);
    tailOfRemainder = remainder.slice(remainderStrongMatch.index);
  }

  // Xóa các nhóm POS đã đưa vào partOfSpeech khỏi headOfRemainder
  for (const posGroup of deduplicatedPosList) {
    const escaped = posGroup.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    headOfRemainder = headOfRemainder.replace(new RegExp(`\\s*${escaped}\\s*`, "i"), " ");
  }

  const extraNotes = `${headOfRemainder} ${tailOfRemainder}`
    .replace(/\s+/g, " ")
    .trim();

  // 5. annotation
  const annotation = [partOfSpeech, extraNotes].filter(Boolean).join(" ").trim();

  return {
    cleanWord,
    partOfSpeech,
    extraNotes,
    annotation,
  };
}

/**
 * Regular expression matching parent daily sections (e.g., "22/09", "23/09", "1/1").
 */
export const DATE_SECTION_REGEX = /^\d{1,2}\/\d{1,2}$/;

/**
 * Extract clean plain text from a structural element (paragraph text runs).
 * Returns the raw joined text WITHOUT trimming so that newlines within
 * multi-paragraph cells are preserved at the cell-extraction level.
 */
export function extractTextFromElement(element: GoogleDocsStructuralElement): string {
  if (!element.paragraph || !element.paragraph.elements) {
    return "";
  }

  let text = "";
  for (const el of element.paragraph.elements) {
    if (el.textRun?.content) {
      text += el.textRun.content;
    }
  }

  return text;
}

/**
 * Extract plain text from all elements inside a table cell.
 * Handles multi-paragraph cells (cells where the user pressed Enter to add
 * a new line in Docs). Each paragraph in the cell becomes a separate
 * structural element in `cell.content`.
 * We collect all non-empty paragraph texts and join them with a single space.
 * The final result is trimmed to remove any leading/trailing whitespace or newlines.
 */
export function extractTextFromCell(cell: GoogleDocsTableCell): string {
  if (!cell.content) {
    return "";
  }

  const parts: string[] = [];
  for (const element of cell.content) {
    // Each element may be a paragraph (normal text) or a nested table – we only handle paragraphs here
    const raw = extractTextFromElement(element);
    // Strip trailing newline that Google Docs always appends to each paragraph
    const cleaned = raw.replace(/\n$/, "").trim();
    if (cleaned) {
      parts.push(cleaned);
    }
  }

  // Join multiple paragraphs within the same cell with a space so the meaning reads naturally
  return parts.join(" ").trim();
}

/**
 * Find the column indices for Word, Pronunciation, and Meaning based on header text.
 * Falls back to default indices [0, 1, 2] if headers are not explicitly labeled.
 */
function resolveColumnIndices(headerCells: string[]): {
  wordCol: number;
  pronCol: number;
  meaningCol: number;
} {
  let wordCol = -1;
  let pronCol = -1;
  let meaningCol = -1;

  headerCells.forEach((rawText, idx) => {
    const text = rawText.toLowerCase();
    if (text.includes("từ vựng") || text.includes("vocabulary") || text.includes("word")) {
      wordCol = idx;
    } else if (
      text.includes("phát âm") ||
      text.includes("pronunciation") ||
      text.includes("phonetic")
    ) {
      pronCol = idx;
    } else if (
      text.includes("nghĩa") ||
      text.includes("meaning") ||
      text.includes("định nghĩa")
    ) {
      meaningCol = idx;
    }
  });

  // Default to standard 0, 1, 2 column positions if not found by name
  return {
    wordCol: wordCol !== -1 ? wordCol : 0,
    pronCol: pronCol !== -1 ? pronCol : 1,
    meaningCol: meaningCol !== -1 ? meaningCol : 2,
  };
}

/**
 * Checks if a row is the header row.
 * A header row must have ALL (or at least 2) cells matching known header keywords.
 * This prevents content rows (e.g. "Từ đồng nghĩa: huge...") from being misidentified as headers.
 */
function isHeaderRow(cells: string[]): boolean {
  const headerKeywords = ["từ vựng", "phát âm", "nghĩa", "vocabulary", "pronunciation", "word", "meaning"];
  let matchCount = 0;
  for (const cell of cells) {
    const lower = cell.toLowerCase().trim();
    // Only count as a header cell if the ENTIRE cell text is (or closely matches) a header keyword
    // not just contains the keyword (to avoid "Từ đồng nghĩa" triggering on "nghĩa")
    const isHeaderCell = headerKeywords.some(
      (kw) => lower === kw || lower === kw + ":" || lower.startsWith(kw) && lower.length <= kw.length + 3
    );
    if (isHeaderCell) matchCount++;
  }
  // Require at least 2 cells to look like headers (e.g. "Từ vựng" + "Phát âm")
  return matchCount >= 2;
}

/**
 * Extract vocabulary items from a Google Docs table structure.
 */
export function extractVocabularyFromTable(
  table: GoogleDocsTable,
  date: string
): VocabularyItem[] {
  if (!table.tableRows || table.tableRows.length === 0) {
    return [];
  }

  const items: VocabularyItem[] = [];
  let colIndices = { wordCol: 0, pronCol: 1, meaningCol: 2 };
  let startRowIndex = 0;

  // Check the first row to detect headers
  const firstRowCells =
    table.tableRows[0].tableCells?.map((cell) => extractTextFromCell(cell)) || [];

  if (isHeaderRow(firstRowCells)) {
    colIndices = resolveColumnIndices(firstRowCells);
    startRowIndex = 1;
  }

  for (let i = startRowIndex; i < table.tableRows.length; i++) {
    const row = table.tableRows[i];
    if (!row.tableCells) continue;

    const rowTexts = row.tableCells.map((cell) => extractTextFromCell(cell));

    // If row is another repeated header, skip it
    if (isHeaderRow(rowTexts)) {
      continue;
    }

    const rawWordCell = rowTexts[colIndices.wordCol] || "";
    const pronunciation = rowTexts[colIndices.pronCol] || "";
    const meaning = rowTexts[colIndices.meaningCol] || "";

    // Extract clean word and part of speech
    const { cleanWord, partOfSpeech } = processWordAnnotations(rawWordCell);

    // Only include rows that have at least a word or meaning
    if (cleanWord || meaning) {
      items.push({
        date,
        word: cleanWord,
        rawWord: rawWordCell, // Full original text e.g. "courteous (adj) + to + someone"
        partOfSpeech,
        pronunciation,
        meaning,             // Raw Vietnamese meaning from docs, no annotation injected
      });
    }
  }

  return items;
}

/**
 * Recursively collects all tabs that match DATE_SECTION_REGEX (dd/mm) from the full tab tree.
 * Handles both:
 * - Flat structure: top-level tabs titled "dd/mm"
 * - Nested structure: top-level tabs titled "Tháng X" with child tabs titled "dd/mm"
 */
function collectDateTabs(tabs: NonNullable<GoogleDocsDocument["tabs"]>): NonNullable<GoogleDocsDocument["tabs"]> {
  const result: NonNullable<GoogleDocsDocument["tabs"]> = [];
  for (const tab of tabs) {
    const title = tab.tabProperties?.title?.trim() || "";
    if (DATE_SECTION_REGEX.test(title)) {
      // This tab itself is a date tab — collect it
      result.push(tab);
    } else if (tab.childTabs && Array.isArray(tab.childTabs) && tab.childTabs.length > 0) {
      // This tab is a group (e.g. "Tháng 9", "Tháng 10") — recurse into children
      result.push(...collectDateTabs(tab.childTabs));
    }
    // Tabs that don't match dd/mm and have no children are ignored (e.g. "General Resources")
  }
  return result;
}

/**
 * Parses Google Docs document structure (supporting both Tabs and Headings).
 *
 * Tab structures supported:
 * - Flat (old):   Top-level tabs titled "dd/mm" directly.
 * - Nested (new): Top-level tabs titled "Tháng 9"/"Tháng 10" containing child tabs titled "dd/mm".
 *
 * Fallback: Body content with "dd/mm" headings above tables.
 */
export function parseGoogleDocument(doc: GoogleDocsDocument): VocabularyItem[] {
  const allItems: VocabularyItem[] = [];

  // 1. Check if document has tabs (Modern Google Docs Tabs structure)
  if (doc.tabs && Array.isArray(doc.tabs) && doc.tabs.length > 0) {
    // Collect all date tabs recursively (handles both flat and nested month-group structures)
    const dateTabs = collectDateTabs(doc.tabs);

    for (const tab of dateTabs) {
      const title = tab.tabProperties?.title?.trim() || "";
      const bodyContent = tab.documentTab?.body?.content;
      if (bodyContent && Array.isArray(bodyContent)) {
        // Find the first table in this daily section
        const tableElement = bodyContent.find((el) => el.table);
        if (tableElement?.table) {
          const items = extractVocabularyFromTable(tableElement.table, title);
          allItems.push(...items);
        }
      }
    }

    if (allItems.length > 0) {
      return allItems;
    }
  }

  // 2. Fallback: Parse body content using date headings (flat document structure)
  const bodyContent = doc.body?.content;
  if (bodyContent && Array.isArray(bodyContent)) {
    let currentDate: string | null = null;
    let tableFoundForCurrentDate = false;

    for (const element of bodyContent) {
      // Check if this element is a date heading (e.g. "22/09")
      if (element.paragraph) {
        const text = extractTextFromElement(element).trim();
        if (DATE_SECTION_REGEX.test(text)) {
          currentDate = text;
          tableFoundForCurrentDate = false;
          continue;
        }
      }

      // If we are within a daily section and encounter a table
      if (currentDate && element.table && !tableFoundForCurrentDate) {
        const items = extractVocabularyFromTable(element.table, currentDate);
        allItems.push(...items);
        tableFoundForCurrentDate = true; // Extract only the first table per daily section
      }
    }
  }

  return allItems;
}
