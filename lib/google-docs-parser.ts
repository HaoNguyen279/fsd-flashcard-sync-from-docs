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
 * Process a raw word string to separate:
 * 1. cleanWord: The single first word for the front of the flashcard.
 * 2. partOfSpeech: Grammatical parts of speech like (v), (adj), (adv), (n).
 * 3. extraNotes: All other usage notes, synonyms, trailing notes like "= temporary", "(to do something)", "on sth".
 * 
 * Resulting flashcard structure:
 * - Front: [cleanWord] (only 1 word)
 * - Back:  [partOfSpeech] [Vietnamese meaning] [extraNotes]
 * 
 * Examples:
 *   "hesitate (v) (to do something)" + "do dự" → front: "hesitate", back: "(v) do dự (to do something)"
 *   "provisional (adj) = temporary" + "tạm thời" → front: "provisional", back: "(adj) tạm thời = temporary"
 *   "subsequently (adv)" + "sau đó" → front: "subsequently", back: "(adv) sau đó"
 *   "vital = crucial, essential" + "quan trọng" → front: "vital", back: "quan trọng = crucial, essential"
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

  const partOfSpeechList: string[] = [];
  const extraParenNotesList: string[] = [];

  // Collect all parenthesized groups and categorize into part of speech vs extra note
  let match: RegExpExecArray | null;
  const regex = new RegExp(WORD_ANNOTATION_REGEX.source, WORD_ANNOTATION_REGEX.flags);
  while ((match = regex.exec(rawWord)) !== null) {
    const content = match[1]?.trim();
    if (content) {
      if (isPartOfSpeech(content)) {
        partOfSpeechList.push(`(${content})`);
      } else {
        extraParenNotesList.push(`(${content})`);
      }
    }
  }

  // Remove all parenthesized groups from the word
  const withoutParens = rawWord.replace(WORD_ANNOTATION_REGEX, " ").trim();

  if (!withoutParens) {
    const pos = partOfSpeechList.join(" ").trim();
    const extra = extraParenNotesList.join(" ").trim();
    return {
      cleanWord: "",
      partOfSpeech: pos,
      extraNotes: extra,
      annotation: [pos, extra].filter(Boolean).join(" ").trim(),
    };
  }

  // Extract the first word and all trailing text after it
  const matchFirstWord = withoutParens.match(/^([^\s]+)([\s\S]*)$/);

  let cleanWord = withoutParens;
  let trailingText = "";

  if (matchFirstWord) {
    let firstToken = matchFirstWord[1].trim();
    trailingText = matchFirstWord[2].trim();

    // Strip leading quotes or apostrophes (e.g. 'provisional -> provisional)
    firstToken = firstToken.replace(/^['"“‘]+/, "");

    // If the first token ends with a separator like ':', ',', ';', strip it from the word and prepend to trailingText
    const separatorMatch = firstToken.match(/^(.*?)([:;,]+)$/);
    if (separatorMatch) {
      firstToken = separatorMatch[1].trim();
      trailingText = `${separatorMatch[2]} ${trailingText}`.trim();
    }

    // Strip trailing quotes (e.g. "word" -> word)
    cleanWord = firstToken.replace(/['"”’]+$/, "").trim();
  }

  const partOfSpeech = partOfSpeechList.join(" ").trim();
  const extraNotes = [...extraParenNotesList, trailingText].filter(Boolean).join(" ").trim();
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

    const rawWord = rowTexts[colIndices.wordCol] || "";
    const pronunciation = rowTexts[colIndices.pronCol] || "";
    const rawMeaning = rowTexts[colIndices.meaningCol] || "";

    // Separate clean word from part of speech and extra trailing notes
    const { cleanWord, partOfSpeech, extraNotes } = processWordAnnotations(rawWord);

    // Format meaning on the back: [partOfSpeech] [rawMeaning] [extraNotes]
    // Example: "(v) do dự (to do something)"
    // Example: "(adj) tạm thời = temporary"
    const meaning = [partOfSpeech, rawMeaning, extraNotes]
      .filter(Boolean)
      .join(" ")
      .trim();

    // Only include rows that have at least a word or meaning
    if (cleanWord || meaning) {
      items.push({
        date,
        word: cleanWord,
        pronunciation,
        meaning,
      });
    }
  }

  return items;
}

/**
 * Parses Google Docs document structure (supporting both Tabs and Headings).
 * - Tabs: Each parent tab matching "dd/month" is parsed; childTabs are ignored.
 * - Body: Each heading matching "dd/month" marks a daily section.
 */
export function parseGoogleDocument(doc: GoogleDocsDocument): VocabularyItem[] {
  const allItems: VocabularyItem[] = [];

  // 1. Check if document has tabs (Modern Google Docs Tabs structure)
  if (doc.tabs && Array.isArray(doc.tabs) && doc.tabs.length > 0) {
    for (const tab of doc.tabs) {
      const title = tab.tabProperties?.title?.trim() || "";
      // Only process parent tabs matching "dd/month"
      // Child tabs inside tab.childTabs are ignored as per requirements
      if (DATE_SECTION_REGEX.test(title)) {
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
