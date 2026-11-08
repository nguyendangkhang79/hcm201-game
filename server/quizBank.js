import { randomUUID } from "node:crypto";
import { QuizError } from "./quizError.js";
import { parseQuizImport, questionKey } from "./quizImport.js";

const maxQuestions = 1000;

export function createQuizBank(repository, topics) {
  async function list() {
    return Object.entries(await repository.read()).map(([id, question]) => ({
      ...question,
      id,
      source: question.source ?? null,
    }));
  }

  async function addQuestions(questions) {
    const entries = questions.map((question) => [
      randomUUID(),
      { ...question, enabled: true, revision: 0 },
    ]);
    const result = await repository.transact((current) => {
      const keys = new Set(Object.values(current).map(questionKey));
      const additions = {};
      for (const [id, question] of entries) {
        const key = questionKey(question);
        if (keys.has(key)) continue;
        keys.add(key);
        additions[id] = question;
      }
      const added = Object.keys(additions).length;
      if (Object.keys(current).length + added > maxQuestions) return { result: null };
      return {
        questions: { ...current, ...additions },
        result: { added, skipped: entries.length - added },
      };
    });
    if (!result)
      throw new QuizError(409, "BANK_LIMIT", `Ngân hàng chỉ chứa tối đa ${maxQuestions} câu.`);
    return result;
  }

  function importQuestions(rows) {
    return addQuestions(parseQuizImport(rows, topics));
  }

  function importBatch(rows) {
    const questions = [];
    for (let index = 0; index < rows.length; index += 100) {
      questions.push(...parseQuizImport(rows.slice(index, index + 100), topics));
    }
    return addQuestions(questions);
  }

  function importLegacy(rows) {
    return importBatch(rows.map((question) => ({
      ...question,
      answer: "ABCD"[question.correctAnswer],
    })));
  }

  async function changeQuestion(action, { id, revision, question, enabled }) {
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id) ||
        !Number.isInteger(revision) || revision < 0)
      throw new QuizError(400, "INVALID_QUESTION", "Mã hoặc phiên bản câu hỏi không hợp lệ.");
    if (action === "bank-toggle" && typeof enabled !== "boolean")
      throw new QuizError(400, "INVALID_QUESTION", "Trạng thái câu hỏi không hợp lệ.");
    const edited = action === "bank-edit" ? parseQuizImport([question], topics)[0] : null;
    const result = await repository.transact((current) => {
      const existing = current[id];
      if (!existing) return { result: "missing" };
      if (existing.revision !== revision) return { result: "stale" };
      if (edited && Object.entries(current).some(([otherId, other]) =>
        otherId !== id && questionKey(other) === questionKey(edited),
      )) return { result: "duplicate" };

      const questions = { ...current };
      if (action === "bank-delete") delete questions[id];
      else questions[id] = {
        ...existing,
        ...edited,
        enabled: action === "bank-toggle" ? enabled : existing.enabled,
        revision: revision + 1,
      };
      return { questions, result: "saved" };
    });
    if (result === "missing")
      throw new QuizError(404, "QUESTION_NOT_FOUND", "Câu hỏi không còn trong ngân hàng.");
    if (result === "stale")
      throw new QuizError(409, "QUESTION_CHANGED", "Câu hỏi đã thay đổi. Hãy tải lại danh sách.");
    if (result === "duplicate")
      throw new QuizError(409, "DUPLICATE_QUESTION", "Đã có câu hỏi trùng trong chủ đề này.");
    return { saved: true };
  }

  return { list, importQuestions, importBatch, importLegacy, changeQuestion };
}
