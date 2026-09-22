import { google } from "googleapis";
import { GoogleDocsDocument, VocabularyItem } from "./types";
import { parseGoogleDocument } from "./google-docs-parser";

/**
 * Formats a private key string to ensure correct RSA PEM format.
 * Vercel environment variables often escape newlines as `\n`.
 */
function formatPrivateKey(key: string): string {
  let cleaned = key.trim();
  // Remove surrounding quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  // Replace literal '\n' characters with actual newlines
  return cleaned.replace(/\\n/g, "\n");
}

/**
 * Initializes authenticated Google Docs API client.
 */
function getGoogleDocsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "Missing Google Service Account credentials. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in your environment."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: formatPrivateKey(privateKey),
    scopes: ["https://www.googleapis.com/auth/documents.readonly"],
  });

  return google.docs({ version: "v1", auth });
}

/**
 * Fetches the Google Docs document by ID using the Google Docs API.
 * Requests includeTabsContent=true to retrieve modern document tabs.
 */
export async function fetchGoogleDocument(documentId: string): Promise<GoogleDocsDocument> {
  const docs = getGoogleDocsClient();

  const response = await docs.documents.get({
    documentId,
    includeTabsContent: true,
  });

  return response.data as GoogleDocsDocument;
}

/**
 * Main orchestrator: fetches the document and parses all daily vocabulary.
 */
export async function fetchVocabularyFromGoogleDocs(): Promise<VocabularyItem[]> {
  const documentId = process.env.GOOGLE_DOC_ID;

  if (!documentId) {
    throw new Error(
      "Missing GOOGLE_DOC_ID. Please set GOOGLE_DOC_ID in your environment variables."
    );
  }

  const doc = await fetchGoogleDocument(documentId);
  return parseGoogleDocument(doc);
}
