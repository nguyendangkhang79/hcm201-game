import { bingoWords } from './data/bingo.js';

// Firebase removes empty arrays/objects. false persists an intentionally empty bank.
export function readBingoWords(value) {
  const words = value === null ? bingoWords : Object.values(value ?? {});
  return [...new Set(words.filter(word => typeof word === 'string' && word.trim()))];
}

export function seedBingoWords(current) {
  return current === null ? bingoWords : undefined;
}

export function clearedBingoState() {
  return {
    wordList: false,
    activeWords: null,
    status: 'waiting',
    winners: null,
    winnerCount: null,
  };
}
