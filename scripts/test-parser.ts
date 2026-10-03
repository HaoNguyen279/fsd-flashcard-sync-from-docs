import { parseGoogleDocument } from "../lib/google-docs-parser";
import { GoogleDocsDocument } from "../lib/types";
import { cleanMeaningForHardcore } from "../components/HardcoreView";

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

// 3. Test Mock Document with NEW nested structure: "Tháng 9" → child tabs "dd/mm"
const mockDocumentNested: GoogleDocsDocument = {
  documentId: "mock-doc-nested",
  title: "English Daily Vocab (Nested Month Groups)",
  tabs: [
    {
      // "Tháng 10" group — does NOT match dd/mm, so we recurse into its childTabs
      tabProperties: { tabId: "month-10", title: "Tháng 10", index: 0 },
      childTabs: [
        {
          tabProperties: { tabId: "day-1-10", title: "1/10", index: 0, parentTabId: "month-10" },
          documentTab: {
            body: {
              content: [
                createMockTable([
                  ["Từ vựng", "Phát âm", "Nghĩa"],
                  ["mandatory (adj)", "/ˈmændətɔːri/", "bắt buộc"],
                  ["comply (v)", "/kəmˈplaɪ/", "tuân thủ"],
                ]),
              ],
            },
          },
        },
        {
          tabProperties: { tabId: "day-2-10", title: "2/10", index: 1, parentTabId: "month-10" },
          documentTab: {
            body: {
              content: [
                createMockTable([
                  ["Từ vựng", "Phát âm", "Nghĩa"],
                  ["significant (adj)", "/sɪɡˈnɪfɪkənt/", "đáng kể"],
                ]),
              ],
            },
          },
        },
      ],
      documentTab: { body: { content: [] } },
    },
    {
      // "Tháng 9" group
      tabProperties: { tabId: "month-9", title: "Tháng 9", index: 1 },
      childTabs: [
        {
          tabProperties: { tabId: "day-30-9", title: "30/9", index: 0, parentTabId: "month-9" },
          documentTab: {
            body: {
              content: [
                createMockTable([
                  ["Từ vựng", "Phát âm", "Nghĩa"],
                  ["innovative (adj)", "/ˈɪnəveɪtɪv/", "mang tính đổi mới"],
                ]),
              ],
            },
          },
        },
      ],
      documentTab: { body: { content: [] } },
    },
    {
      // Non-matching tab with no children — should be ignored
      tabProperties: { tabId: "general", title: "General Resources", index: 2 },
      documentTab: {
        body: {
          content: [
            createMockTable([
              ["Từ vựng", "Phát âm", "Nghĩa"],
              ["ignored_nested", "/x/", "phải bị bỏ qua"],
            ]),
          ],
        },
      },
    },
  ],
};

console.log("--- Testing Document with NEW Nested Month-Group Tabs ---");
const resultNested = parseGoogleDocument(mockDocumentNested);
console.log(`Extracted ${resultNested.length} items from Nested doc.`);
console.log(JSON.stringify(resultNested, null, 2));

if (resultNested.length !== 4) {
  throw new Error(`Expected 4 items from nested doc, got ${resultNested.length}`);
}
const has1_10 = resultNested.some((i) => i.date === "1/10" && i.word === "mandatory");
if (!has1_10) throw new Error("Expected item from 1/10 not found!");
const has30_9 = resultNested.some((i) => i.date === "30/9" && i.word === "innovative");
if (!has30_9) throw new Error("Expected item from 30/9 not found!");
const hasIgnoredNested = resultNested.some((i) => i.word === "ignored_nested");
if (hasIgnoredNested) throw new Error("Non-matching tab was not ignored in nested structure!");

console.log("Nested month-group tab test PASSED ✓");


console.log("--- Testing Document with Tabs (flat/old structure) ---");
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

// Verify rawWord is stored and word is clean
const intentionallyItem = resultTabs.find((i) => i.word === "intentionally");
if (!intentionallyItem) throw new Error("Could not find 'intentionally' item");
if (intentionallyItem.rawWord !== "intentionally (adv)") {
  throw new Error(`Expected rawWord "intentionally (adv)", got "${intentionallyItem.rawWord}"`);
}
if (intentionallyItem.meaning !== "cố tình, cố ý") {
  throw new Error(`Expected meaning "cố tình, cố ý" (raw, no annotation), got "${intentionallyItem.meaning}"`);
}
if (intentionallyItem.partOfSpeech !== "(adv)") {
  throw new Error(`Expected partOfSpeech "(adv)", got "${intentionallyItem.partOfSpeech}"`);
}
console.log("rawWord + partOfSpeech + clean meaning test PASSED ✓");

console.log("--- Testing Document with Headings ---");
const resultHeadings = parseGoogleDocument(mockDocumentWithHeadings);
console.log(`Extracted ${resultHeadings.length} items from Headings.`);
console.log(JSON.stringify(resultHeadings, null, 2));

if (resultHeadings.length !== 3) {
  throw new Error(`Expected 3 items from Headings doc, got ${resultHeadings.length}`);
}

// 3. Test Multi-layer Word Annotation Processing
console.log("--- Testing processWordAnnotations ---");
import { processWordAnnotations } from "../lib/google-docs-parser";

const testCases = [
  {
    input: "provisional (adj) = temporary",
    rawMeaning: "tạm thời",
    expectedWord: "provisional",
    expectedPOS: "(adj)",
    expectedExtraNotes: "= temporary",
    expectedMeaning: "(adj) tạm thời = temporary",
  },
  {
    input: "'provisional (adj) = temporary",
    rawMeaning: "tạm thời",
    expectedWord: "provisional",
    expectedPOS: "(adj)",
    expectedExtraNotes: "= temporary",
    expectedMeaning: "(adj) tạm thời = temporary",
  },
  {
    input: "subsequently (adv)",
    rawMeaning: "sau đó",
    expectedWord: "subsequently",
    expectedPOS: "(adv)",
    expectedExtraNotes: "",
    expectedMeaning: "(adv) sau đó",
  },
  {
    input: "hesitate (v) (to do something)",
    rawMeaning: "do dự",
    expectedWord: "hesitate",
    expectedPOS: "(v)",
    expectedExtraNotes: "(to do something)",
    expectedMeaning: "(v) do dự (to do something)",
  },
  {
    input: "embark (v) on/upon sth",
    rawMeaning: "dấn thân, bắt đầu",
    expectedWord: "embark",
    expectedPOS: "(v)",
    expectedExtraNotes: "on/upon sth",
    expectedMeaning: "(v) dấn thân, bắt đầu on/upon sth",
  },
  {
    input: "vital = crucial, essential",
    rawMeaning: "quan trọng",
    expectedWord: "vital",
    expectedPOS: "",
    expectedExtraNotes: "= crucial, essential",
    expectedMeaning: "quan trọng = crucial, essential",
  },
  {
    input: "apple",
    rawMeaning: "quả táo",
    expectedWord: "apple",
    expectedPOS: "",
    expectedExtraNotes: "",
    expectedMeaning: "quả táo",
  },
];

for (const tc of testCases) {
  const result = processWordAnnotations(tc.input);
  const formattedMeaning = [result.partOfSpeech, tc.rawMeaning, result.extraNotes]
    .filter(Boolean)
    .join(" ")
    .trim();

  console.log(`Input: "${tc.input}" + Meaning: "${tc.rawMeaning}" -> Word: "${result.cleanWord}", Back: "${formattedMeaning}"`);

  if (result.cleanWord !== tc.expectedWord) {
    throw new Error(`Expected word "${tc.expectedWord}", got "${result.cleanWord}" for input "${tc.input}"`);
  }
  if (result.partOfSpeech !== tc.expectedPOS) {
    throw new Error(`Expected POS "${tc.expectedPOS}", got "${result.partOfSpeech}" for input "${tc.input}"`);
  }
  if (result.extraNotes !== tc.expectedExtraNotes) {
    throw new Error(`Expected extraNotes "${tc.expectedExtraNotes}", got "${result.extraNotes}" for input "${tc.input}"`);
  }
  if (formattedMeaning !== tc.expectedMeaning) {
    throw new Error(`Expected formatted meaning "${tc.expectedMeaning}", got "${formattedMeaning}" for input "${tc.input}"`);
  }
}

console.log("\n--- Testing 15 Required Multi-Word Phrase & Delimiter Test Cases ---");
const multiWordTestCases = [
  {
    rawWord: "Owing to (prep) = Due to= Because of=As a result of +(N) (prep)",
    expectedWord: "Owing to",
    expectedPOS: "(prep)",
  },
  {
    rawWord: "courteous (adj) + [to] + [someone]",
    expectedWord: "courteous",
    expectedPOS: "(adj)",
  },
  {
    rawWord: "apart from= a side from=except for+O",
    expectedWord: "apart from",
    expectedPOS: "",
  },
  {
    rawWord: "diplomat(n)",
    expectedWord: "diplomat",
    expectedPOS: "(n)",
  },
  {
    rawWord: "beautiful (adj)",
    expectedWord: "beautiful",
    expectedPOS: "(adj)",
  },
  {
    rawWord: "hesitate (v) (to do something)",
    expectedWord: "hesitate",
    expectedPOS: "(v)",
  },
  {
    rawWord: "provisional (adj) = temporary",
    expectedWord: "provisional",
    expectedPOS: "(adj)",
  },
  {
    rawWord: "'provisional (adj) = temporary",
    expectedWord: "provisional",
    expectedPOS: "(adj)",
  },
  {
    rawWord: "embark (v) on/upon sth",
    expectedWord: "embark",
    expectedPOS: "(v)",
  },
  {
    rawWord: "vital = crucial, essential",
    expectedWord: "vital",
    expectedPOS: "",
  },
  {
    rawWord: "neglect (v/n)",
    expectedWord: "neglect",
    expectedPOS: "(v/n)",
  },
  {
    rawWord: "because of (prep) = since",
    expectedWord: "because of",
    expectedPOS: "(prep)",
  },
  {
    rawWord: "owing to, due to, because of",
    expectedWord: "owing to",
    expectedPOS: "",
  },
  {
    rawWord: "well-known (adj)",
    expectedWord: "well-known",
    expectedPOS: "(adj)",
  },
  {
    rawWord: "apple",
    expectedWord: "apple",
    expectedPOS: "",
  },
];

for (const tc of multiWordTestCases) {
  const result = processWordAnnotations(tc.rawWord);
  console.log(`Test: "${tc.rawWord}" -> Word: "${result.cleanWord}", POS: "${result.partOfSpeech}"`);
  if (result.cleanWord !== tc.expectedWord) {
    throw new Error(`[FAIL] Expected word "${tc.expectedWord}", got "${result.cleanWord}" for "${tc.rawWord}"`);
  }
  if (result.partOfSpeech !== tc.expectedPOS) {
    throw new Error(`[FAIL] Expected POS "${tc.expectedPOS}", got "${result.partOfSpeech}" for "${tc.rawWord}"`);
  }
}
console.log("✓ All 15 required multi-word & delimiter test cases passed successfully!");

console.log("\n--- Testing cleanMeaningForHardcore ---");
const hardcoreMeaningTestCases = [
  { input: "(v) tuân thủ, chấp hành", expected: "tuân thủ, chấp hành" },
  { input: "(adj) đáng kể", expected: "đáng kể" },
  { input: "(v/n) bỏ bê, sao nhãng", expected: "bỏ bê, sao nhãng" },
  { input: "(v, n) bỏ bê", expected: "bỏ bê" },
  { input: "bỏ bê, sao nhãng (v/n)", expected: "bỏ bê, sao nhãng" },
  { input: "(n): sự tuyên bố", expected: "sự tuyên bố" },
  { input: "v. tuân thủ", expected: "tuân thủ" },
  { input: "tuân thủ (v)", expected: "tuân thủ" },
  { input: "tuân thủ (ghi chú: thường đi với with)", expected: "tuân thủ" },
  { input: "(v) tuân thủ (ghi chú: đi với to)", expected: "tuân thủ" },
  { input: "ghi nhớ từ vựng", expected: "ghi nhớ từ vựng" },
  { input: "ghi nhận đóng góp", expected: "ghi nhận đóng góp" },
  { input: "(phrase) từng bước một", expected: "từng bước một" },
  { input: "cố tình, cố ý", expected: "cố tình, cố ý" },
];

for (const tc of hardcoreMeaningTestCases) {
  const actual = cleanMeaningForHardcore(tc.input);
  console.log(`Hardcore meaning: "${tc.input}" -> "${actual}"`);
  if (actual !== tc.expected) {
    throw new Error(`Expected "${tc.expected}", got "${actual}" for input "${tc.input}"`);
  }
}

console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
