import { QuestionProvider, RunnerQuestion } from "../types";
import { MOCK_VOCABULARY } from "../constants";

export interface RawVocabularyInput {
  word?: string | null;
  meaning?: string | null;
  partOfSpeech?: string | null;
  pronunciation?: string | null;
}

export interface CleanVocabEntry {
  id: string;
  word: string; // Preserved original casing, trimmed
  meaning: string; // Trimmed Vietnamese meaning
  normalizedWord: string; // Lowercased for uniqueness and distractor filtering
  partOfSpeech?: string;
  pronunciation?: string;
}

export type ProviderCreationResult =
  | { success: true; count: number; provider: QuestionProvider }
  | { success: false; count: number; error: string };

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sanitizes and deduplicates raw vocabulary entries.
 * - Trims whitespace
 * - Excludes entries with empty English word or empty Vietnamese meaning
 * - Normalizes for uniqueness by lowercased word while preserving display casing
 */
export function sanitizeVocabularyItems(rawItems: RawVocabularyInput[]): CleanVocabEntry[] {
  if (!Array.isArray(rawItems)) return [];

  const seenWords = new Set<string>();
  const cleanEntries: CleanVocabEntry[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    if (!item || typeof item !== "object") continue;

    const word = typeof item.word === "string" ? item.word.trim() : "";
    const meaning = typeof item.meaning === "string" ? item.meaning.trim() : "";

    // Exclude entries with empty word or meaning
    if (!word || !meaning) continue;

    const normalized = word.toLowerCase();

    // Deduplicate by normalized word to avoid duplicate answer cards
    if (seenWords.has(normalized)) continue;
    seenWords.add(normalized);

    cleanEntries.push({
      id: `vocab-${i}-${normalized}`,
      word,
      meaning,
      normalizedWord: normalized,
      partOfSpeech: typeof item.partOfSpeech === "string" ? item.partOfSpeech.trim() : undefined,
      pronunciation:
        typeof item.pronunciation === "string" ? item.pronunciation.trim() : undefined,
    });
  }

  return cleanEntries;
}

export class VocabularyQuestionProvider implements QuestionProvider {
  private items: CleanVocabEntry[];
  private deck: CleanVocabEntry[] = [];
  private lastTargetWord = "";

  constructor(items: CleanVocabEntry[]) {
    if (items.length < 4) {
      throw new Error(
        `VocabularyQuestionProvider requires at least 4 distinct items, received ${items.length}`
      );
    }
    this.items = [...items];
  }

  public hasEnoughVocabulary(): boolean {
    return this.items.length >= 4;
  }

  public getVocabularyCount(): number {
    return this.items.length;
  }

  public nextQuestion(): RunnerQuestion {
    // 1. Refill and shuffle deck when empty (shuffle bag pattern)
    if (!this.deck.length) {
      this.deck = shuffle(this.items);

      // Prevent immediate repetition of the same target word across deck cycles
      if (
        this.deck.length > 1 &&
        this.deck[this.deck.length - 1].normalizedWord === this.lastTargetWord.toLowerCase()
      ) {
        [this.deck[0], this.deck[this.deck.length - 1]] = [
          this.deck[this.deck.length - 1],
          this.deck[0],
        ];
      }
    }

    // 2. Select the target vocabulary entry
    const target = this.deck.pop()!;
    this.lastTargetWord = target.word;

    // 3. Select 3 distinct distractor English words from other vocabulary entries
    const candidateDistractors = this.items.filter(
      (entry) => entry.normalizedWord !== target.normalizedWord
    );
    const shuffledDistractors = shuffle(candidateDistractors);
    const selectedDistractors = shuffledDistractors.slice(0, 3);

    // 4. Combine target word and 3 distractors
    const choices = [
      target.word,
      selectedDistractors[0].word,
      selectedDistractors[1].word,
      selectedDistractors[2].word,
    ];

    // 5. Shuffle the 4 English answer choices
    const shuffledChoices = shuffle(choices);
    const correctIndex = shuffledChoices.indexOf(target.word);

    // 6. Return RunnerQuestion: Vietnamese meaning as question, 4 English words as lane options
    return {
      id: `${target.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      word: target.word,
      meaning: target.meaning,
      options: shuffledChoices as [string, string, string, string],
      correctIndex,
      partOfSpeech: target.partOfSpeech,
      pronunciation: target.pronunciation,
    };
  }
}

/**
 * Creates a QuestionProvider from raw vocabulary entries.
 * Returns an error result if fewer than 4 valid entries exist.
 */
export function createQuestionProvider(rawItems: RawVocabularyInput[]): ProviderCreationResult {
  const cleanItems = sanitizeVocabularyItems(rawItems);

  if (cleanItems.length < 4) {
    return {
      success: false,
      count: cleanItems.length,
      error: `Not enough vocabulary entries. At least 4 distinct vocabulary items with English words and Vietnamese meanings are required (found ${cleanItems.length}).`,
    };
  }

  return {
    success: true,
    count: cleanItems.length,
    provider: new VocabularyQuestionProvider(cleanItems),
  };
}

/**
 * Creates a QuestionProvider initialized with the prototype's mock vocabulary.
 */
export function createMockQuestionProvider(): QuestionProvider {
  const cleanItems = sanitizeVocabularyItems(MOCK_VOCABULARY);
  return new VocabularyQuestionProvider(cleanItems);
}
