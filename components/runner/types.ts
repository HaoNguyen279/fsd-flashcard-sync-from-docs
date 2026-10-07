export type GameState = "START" | "PLAYING" | "SUCCESS" | "CRASH" | "GAME_OVER";

export interface RunnerConfig {
  lanes: number[];
  carZ: number;
  roadWidth: number;
  recycleLength: number;
  reactionTime: number;
  baseSpeed: number;
  maxSpeed: number;
  laneSmoothing: number;
  successDuration: number;
  crashDuration: number;
}

export interface RunnerQuestion {
  id: string;
  word: string; // correct English vocabulary word
  meaning: string; // Vietnamese meaning shown as the question
  options: [string, string, string, string]; // four English answer choices
  correctIndex: number; // index of the correct English word in options (0..3)
  pronunciation?: string;
  partOfSpeech?: string;
}

export interface QuestionProvider {
  nextQuestion(): RunnerQuestion;
  hasEnoughVocabulary(): boolean;
  getVocabularyCount(): number;
}

// Retained for backward-compatibility with mock data
export interface RunnerVocabulary {
  word: string;
  meaning: string;
  options: string[];
  correctIndex: number;
}

export interface GameStats {
  score: number;
  distance: number;
  streak: number;
  longestStreak: number;
  bestScore: number;
  speed: number;
  gateNumber: number;
}

export interface GameOverRecap {
  reason: string;
  correctWord: string;
  chosenWord: string;
  score: number;
  distance: number;
  longestStreak: number;
}

export interface HUDReferences {
  container: HTMLElement;
  canvasContainer: HTMLElement;
  hud: HTMLElement;
  laneLabelsContainer: HTMLElement;
  laneLabelItems: HTMLElement[];
  startScreen: HTMLElement;
  gameOverScreen: HTMLElement;
  startButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  closeGameOverButton?: HTMLButtonElement;
  questionPanel: HTMLElement;
  questionNumber: HTMLElement;
  meaning: HTMLElement;
  timerFill: HTMLElement;
  timerValue: HTMLElement;
  progressBar: HTMLElement;
  scoreValue: HTMLElement;
  distanceValue: HTMLElement;
  streakValue: HTMLElement;
  bestValue: HTMLElement;
  speedValue: HTMLElement;
  toast: HTMLElement;
  flash: HTMLElement;
  liveStatus: HTMLElement;
  soundToggle: HTMLButtonElement;
  leftButton: HTMLButtonElement;
  rightButton: HTMLButtonElement;
  crashReason: HTMLElement;
  correctRecap: HTMLElement;
  chosenRecap: HTMLElement;
  finalScore: HTMLElement;
  finalDistance: HTMLElement;
  finalStreak: HTMLElement;
}
