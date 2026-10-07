import { RunnerConfig, RunnerVocabulary } from "./types";

export const DEFAULT_CONFIG: RunnerConfig = {
  lanes: [-4.5, -1.5, 1.5, 4.5],
  carZ: 2,
  roadWidth: 12,
  recycleLength: 240,
  reactionTime: 5,
  baseSpeed: 20,
  maxSpeed: 32,
  laneSmoothing: 13,
  successDuration: 0.85,
  crashDuration: 1.15,
};

export const MOCK_VOCABULARY: RunnerVocabulary[] = [
  { word: "acquire", meaning: "To get or obtain something", options: ["acquire", "oppose", "hesitate", "disclose"], correctIndex: 0 },
  { word: "oppose", meaning: "To disagree with or resist something", options: ["qualify", "oppose", "acquire", "coincide"], correctIndex: 1 },
  { word: "disclose", meaning: "To reveal information that was secret", options: ["supplement", "revise", "disclose", "hesitate"], correctIndex: 2 },
  { word: "hesitate", meaning: "To pause because you are uncertain", options: ["disclose", "acquire", "oppose", "hesitate"], correctIndex: 3 },
  { word: "reputable", meaning: "Known to be honest and reliable", options: ["reputable", "explicit", "revised", "vacant"], correctIndex: 0 },
  { word: "explicit", meaning: "Stated clearly, leaving no room for doubt", options: ["hesitant", "explicit", "reputable", "outstanding"], correctIndex: 1 },
  { word: "supplement", meaning: "Something added to improve or complete something", options: ["vacancy", "landlord", "supplement", "headquarters"], correctIndex: 2 },
  { word: "coincide", meaning: "To happen at the same time", options: ["hesitate", "qualify", "oppose", "coincide"], correctIndex: 3 },
  { word: "vacancy", meaning: "An unoccupied position or available room", options: ["vacancy", "expenditure", "landlord", "supplement"], correctIndex: 0 },
  { word: "expenditure", meaning: "The act or amount of spending money", options: ["headquarters", "expenditure", "vacancy", "landlord"], correctIndex: 1 },
  { word: "outstanding", meaning: "Exceptionally good or impressive", options: ["explicit", "revised", "outstanding", "hesitant"], correctIndex: 2 },
  { word: "qualify", meaning: "To meet the requirements for something", options: ["coincide", "disclose", "hesitate", "qualify"], correctIndex: 3 },
  { word: "revised", meaning: "Changed or updated to improve it", options: ["revised", "reputable", "explicit", "outstanding"], correctIndex: 0 },
  { word: "landlord", meaning: "Someone who rents property to others", options: ["vacancy", "landlord", "headquarters", "expenditure"], correctIndex: 1 },
  { word: "headquarters", meaning: "The main office of an organization", options: ["supplement", "vacancy", "headquarters", "landlord"], correctIndex: 2 },
];
