import test from 'node:test';
import assert from 'node:assert/strict';
import { bingoWords } from '../src/data/bingo.js';
import { clearedBingoState, readBingoWords, seedBingoWords } from '../src/bingoStore.js';

test('cleared bank stays empty for admin and players and is not reseeded on login', () => {
  const saved = JSON.parse(JSON.stringify(clearedBingoState()));
  assert.deepEqual(readBingoWords(saved.wordList), []);
  assert.equal(seedBingoWords(saved.wordList), undefined);
  assert.equal(saved.status, 'waiting');
  assert.equal(saved.activeWords, null);
  assert.equal(saved.winners, null);
  assert.equal(saved.winnerCount, null);
});

test('only a bank that has never been initialized gets defaults', () => {
  assert.deepEqual(readBingoWords(null), bingoWords);
  assert.deepEqual(seedBingoWords(null), bingoWords);
  assert.equal(seedBingoWords({ key: 'Từ mới' }), undefined);
});

test('adding a Firebase push entry after clear shows only new words', () => {
  assert.deepEqual(readBingoWords({ '-new-key': 'Từ mới' }), ['Từ mới']);
  assert.deepEqual(readBingoWords(['Từ mới', 'Từ mới', null, true]), ['Từ mới']);
});
