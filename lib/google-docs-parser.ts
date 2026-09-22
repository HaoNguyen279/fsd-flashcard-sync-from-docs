import {
  GoogleDocsDocument,
  GoogleDocsStructuralElement,
  GoogleDocsTableCell,
  GoogleDocsTable,
  VocabularyItem,
} from "./types";

/**
 * Regular expression matching parent daily sections (e.g., "22/09", "23/09", "1/1").
 */
export const DATE_SECTION_REGEX = /^\d{1,2}\/\d{1,2}$/;

/**
 * Extract clean plain text from a structural element (paragraph text runs).
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

  return text.trim();
}

/**
 * Extract plain text from all elements inside a table cell.
 */
export function extractTextFromCell(cell: GoogleDocsTableCell): string {
  if (!cell.content) {
    return "";
  }

  const parts: string[] = [];
  for (const element of cell.content) {
    const text = extractTextFromElement(element);
    if (text) {
      parts.push(text);
    }
  }

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
 */
function isHeaderRow(cells: string[]): boolean {
  const combined = cells.join(" ").toLowerCase();
  return (
    combined.includes("từ vựng") ||
    combined.includes("phát âm") ||
    combined.includes("nghĩa") ||
    combined.includes("vocabulary") ||
    combined.includes("pronunciation")
  );
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

    const word = rowTexts[colIndices.wordCol] || "";
    const pronunciation = rowTexts[colIndices.pronCol] || "";
    const meaning = rowTexts[colIndices.meaningCol] || "";

    // Only include rows that have at least a word or meaning
    if (word || meaning) {
      items.push({
        date,
        word,
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
        const text = extractTextFromElement(element);
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
