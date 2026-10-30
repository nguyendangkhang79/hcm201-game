export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createRound(bank, topicIds, count, random = Math.random) {
  return shuffle(
    bank.filter((q) => topicIds.includes(q.topic)),
    random,
  ).slice(0, count);
}

export function scoreRound(round, answers) {
  const correct = round.reduce(
    (sum, q, i) => sum + (answers[i] === q.correctAnswer ? 1 : 0),
    0,
  );
  const answered = answers.filter((answer) => Number.isInteger(answer)).length;
  return {
    correct,
    answered,
    skipped: round.length - answered,
    points: correct * 100,
    percentage: round.length ? Math.round((correct / round.length) * 100) : 0,
  };
}
