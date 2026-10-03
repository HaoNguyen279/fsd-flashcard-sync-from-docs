export interface VocabularyItem {
  date: string;
  word: string;
  rawWord: string; // Full original cell text e.g. "courteous (adj) + to + someone"
  partOfSpeech?: string; // e.g. "(adj)", "(v)", "(adv)", "(n)"
  pronunciation: string;
  meaning: string;
}

export interface VocabApiResponse {
  success: boolean;
  data: VocabularyItem[];
  count?: number;
  dates?: string[];
  error?: string;
  warning?: string;
}

// Google Docs API structural types helper
export interface GoogleDocsTextRun {
  content?: string | null;
}

export interface GoogleDocsParagraphElement {
  textRun?: GoogleDocsTextRun | null;
}

export interface GoogleDocsParagraph {
  elements?: GoogleDocsParagraphElement[] | null;
}

export interface GoogleDocsTableCell {
  content?: GoogleDocsStructuralElement[] | null;
}

export interface GoogleDocsTableRow {
  tableCells?: GoogleDocsTableCell[] | null;
}

export interface GoogleDocsTable {
  rows?: number | null;
  columns?: number | null;
  tableRows?: GoogleDocsTableRow[] | null;
}

export interface GoogleDocsStructuralElement {
  startIndex?: number | null;
  endIndex?: number | null;
  paragraph?: GoogleDocsParagraph | null;
  table?: GoogleDocsTable | null;
}

export interface GoogleDocsTabProperties {
  tabId?: string | null;
  title?: string | null;
  index?: number | null;
  parentTabId?: string | null;
}

export interface GoogleDocsTab {
  tabProperties?: GoogleDocsTabProperties | null;
  documentTab?: {
    body?: {
      content?: GoogleDocsStructuralElement[] | null;
    } | null;
  } | null;
  childTabs?: GoogleDocsTab[] | null;
}

export interface GoogleDocsDocument {
  documentId?: string | null;
  title?: string | null;
  body?: {
    content?: GoogleDocsStructuralElement[] | null;
  } | null;
  tabs?: GoogleDocsTab[] | null;
}
