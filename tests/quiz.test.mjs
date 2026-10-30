import test from "node:test";
import assert from "node:assert/strict";
import { questions, topics } from "../server/questionBank.js";
import { bingoWords } from "../src/data/bingo.js";
import { createRound, scoreRound } from "../src/quizEngine.js";

test("bank has 60 complete questions across six topics, valid answers and sources", () => {
  assert.equal(questions.length, 60);
  assert.equal(new Set(questions.map((q) => q.id)).size, 60);
  for (const q of questions) {
    assert.ok(topics.some((t) => t.id === q.topic));
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.correctAnswer >= 0 && q.correctAnswer < 4);
    assert.ok(q.explanation.length > 15);
    assert.equal(new URL(q.source.url).protocol, "https:");
  }
  for (const topic of topics)
    assert.equal(questions.filter((q) => q.topic === topic.id).length, 10);
});

test("round selection respects topics and size without duplicates or mutating bank", () => {
  const original = questions.map((q) => q.id);
  const round = createRound(questions, ["unity", "defense"], 10, () => 0.3);
  assert.equal(round.length, 10);
  assert.equal(new Set(round.map((q) => q.id)).size, 10);
  assert.ok(round.every((q) => ["unity", "defense"].includes(q.topic)));
  assert.deepEqual(
    questions.map((q) => q.id),
    original,
  );
  assert.equal(createRound(questions, ["unity"], 15).length, 10);
  assert.deepEqual(createRound(questions, [], 10), []);
});

test("score distinguishes A (index zero), wrong answers and timeout omissions", () => {
  const round = [
    { correctAnswer: 0 },
    { correctAnswer: 2 },
    { correctAnswer: 1 },
  ];
  assert.deepEqual(scoreRound(round, [0, 3, null]), {
    correct: 1,
    answered: 2,
    skipped: 1,
    points: 100,
    percentage: 33,
  });
  assert.equal(scoreRound(round, [0, 2, 1]).points, 300);
  assert.equal(scoreRound(round, [null, null, null]).percentage, 0);
  assert.equal(scoreRound([], []).percentage, 0);
});

test("Bingo supports a complete 25-cell board with unique VNR202 terms", () => {
  assert.ok(bingoWords.length >= 25);
  assert.equal(new Set(bingoWords).size, bingoWords.length);
  for (const word of ["Đại hội IV", "Đại hội V", "Đại hội VI", "Khoán 100"])
    assert.ok(bingoWords.includes(word));
});
