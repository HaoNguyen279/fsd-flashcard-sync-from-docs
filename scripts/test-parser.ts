import { parseGoogleDocument } from "../lib/google-docs-parser";
import { GoogleDocsDocument } from "../lib/types";

// Helper to construct mock structural table elements in Google Docs API format
function createMockTable(rows: string[][]) {
  return {
    table: {
      rows: rows.length,
      columns: rows[0]?.length || 0,
      tableRows: rows.map((row) => ({
        tableCells: row.map((cellText) => ({
          content: [
            {
              paragraph: {
                elements: [
                  {
                    textRun: {
                      content: cellText + "\n",
                    },
                  },
                ],
              },
            },
          ],
        })),
      })),
    },
  };
}

// 1. Test Mock Document with modern Google Docs Tabs
const mockDocumentWithTabs: GoogleDocsDocument = {
  documentId: "mock-doc-tabs",
  title: "English Daily Vocab",
  tabs: [
    {
      tabProperties: {
        tabId: "tab-1",
        title: "22/09",
        index: 0,
      },
      childTabs: [
        {
          tabProperties: {
            tabId: "child-tab-1",
            title: "Grammar Notes (Child Section - SHOULD BE IGNORED)",
            parentTabId: "tab-1",
          },
          documentTab: {
            body: {
              content: [
                createMockTable([
                  ["Từ vựng", "Phát âm", "Nghĩa"],
                  ["ignored_word", "/ignored/", "từ này phải bị bỏ qua"],
                ]),
              ],
            },
          },
        },
      ],
      documentTab: {
        body: {
          content: [
            createMockTable([
              ["Từ vựng", "Phát âm", "Nghĩa", "Người phụ trách"],
              ["intentionally (adv)", "/ɪnˈtenʃənəli/", "cố tình, cố ý", "Hào"],
              ["soar (v)", "/sɔːr/", "tăng vọt (rất nhanh)", "Hào"],
              ["neglect (v/n)", "/nɪˈɡlekt/", "bỏ bê, sao nhãng", "Hào"],
              ["application (n)", "/ˌæplɪˈkeɪʃn/", "đơn xin việc, hồ sơ ứng tuyển", "Tường"],
              ["appointment (n)", "/əˈpɔɪntmənt/", "cuộc hẹn, lịch hẹn", "Tường"],
              ["demand (v)", "/dɪˈmænd/", "yêu cầu, đòi hỏi", "Tường"],
              ["statement (n)", "/ˈsteɪtmənt/", "sự tuyên bố", "Nhân"],
              ["significantly (adv)", "/sɪɡˈnɪfɪkəntli/", "một cách đáng kể", "Nhân"],
              ["affordable (adj)", "/əˈfɔːrdəbl/", "giá cả hợp lý", "Nhân"],
            ]),
          ],
        },
      },
    },
    {
      tabProperties: {
        tabId: "tab-2",
        title: "23/09",
        index: 1,
      },
      documentTab: {
        body: {
          content: [
            createMockTable([
              ["Từ vựng", "Phát âm", "Nghĩa"],
              ["comply (v)", "/kəmˈplaɪ/", "tuân thủ, chấp hành"],
              ["retain (v)", "/rɪˈteɪn/", "giữ lại, duy trì"],
              ["consecutive", "/kənˈsekjətɪv/", "liên tiếp"],
            ]),
          ],
        },
      },
    },
    {
      tabProperties: {
        tabId: "tab-3",
        title: "General Resources (Should be ignored because it doesn't match dd/month)",
        index: 2,
      },
      documentTab: {
        body: {
          content: [
            createMockTable([
              ["Từ vựng", "Phát âm", "Nghĩa"],
              ["resource", "/rɪˈzɔːs/", "tài nguyên"],
            ]),
          ],
        },
      },
    },
  ],
};

// 2. Test Mock Document with standard Body headings
const mockDocumentWithHeadings: GoogleDocsDocument = {
  documentId: "mock-doc-headings",
  title: "English Daily Vocab (Headings)",
  body: {
    content: [
      {
        paragraph: {
          elements: [{ textRun: { content: "24/09\n" } }],
        },
      },
      createMockTable([
        ["Từ vựng", "Phát âm", "Nghĩa"],
        ["innovative (adj)", "/ˈɪnəveɪtɪv/", "mang tính đổi mới"],
        ["feasible (adj)", "/ˈfiːzəbl/", "khả thi"],
      ]),
      {
        paragraph: {
          elements: [{ textRun: { content: "25/09\n" } }],
        },
      },
      createMockTable([
        ["Từ vựng", "Phát âm", "Nghĩa"],
        ["collaborate (v)", "/kəˈlæbəreɪt/", "hợp tác"],
      ]),
    ],
  },
};

console.log("--- Testing Document with Tabs ---");
const resultTabs = parseGoogleDocument(mockDocumentWithTabs);
console.log(`Extracted ${resultTabs.length} items from Tabs.`);
console.log(JSON.stringify(resultTabs, null, 2));

// Validations
if (resultTabs.length !== 12) {
  throw new Error(`Expected 12 items from Tabs doc, got ${resultTabs.length}`);
}

const day22Items = resultTabs.filter((i) => i.date === "22/09");
if (day22Items.length !== 9) {
  throw new Error(`Expected 9 items for 22/09, got ${day22Items.length}`);
}

// Ensure child tab was ignored
const hasIgnoredWord = resultTabs.some((i) => i.word === "ignored_word");
if (hasIgnoredWord) {
  throw new Error("Child tab was not ignored!");
}

// Ensure non-matching tab "General Resources" was ignored
const hasResourceWord = resultTabs.some((i) => i.word === "resource");
if (hasResourceWord) {
  throw new Error("Tab without dd/month was not ignored!");
}

console.log("--- Testing Document with Headings ---");
const resultHeadings = parseGoogleDocument(mockDocumentWithHeadings);
console.log(`Extracted ${resultHeadings.length} items from Headings.`);
console.log(JSON.stringify(resultHeadings, null, 2));

if (resultHeadings.length !== 3) {
  throw new Error(`Expected 3 items from Headings doc, got ${resultHeadings.length}`);
}

console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
