import { randomInt, randomUUID } from "node:crypto";

export class QuizError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const reject = (status, code, message) => {
  throw new QuizError(status, code, message);
};
const uuid = (value) =>
  typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
const shuffled = (values) => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export function createQuizService({
  store,
  bank,
  topics,
  clock = Date.now,
  secondsPerQuestion = 45,
}) {
  function catalog() {
    return {
      topics: topics.map((t) => ({
        ...t,
        count: bank.filter((q) => q.topic === t.id).length,
      })),
      total: bank.length,
      secondsPerQuestion,
    };
  }
  function finish(attempt, reason, now) {
    attempt.finishedAt = reason === "timeout" ? attempt.deadline : now;
    attempt.finishReason = reason;
  }
  function publicState(attempt) {
    const {
      id,
      name,
      mode,
      index,
      startedAt,
      deadline,
      finishedAt,
      finishReason,
      topicIds,
    } = attempt;
    const current = attempt.round[index];
    const { correctOptionId, explanation, source, ...question } = current;
    const answer = attempt.answers[index];
    const answered = Object.keys(attempt.answers).length;
    const state = {
      id,
      name,
      mode,
      index,
      startedAt,
      deadline,
      finishedAt,
      finishReason,
      topicIds,
      total: attempt.round.length,
      answered,
      revision: attempt.revision,
      serverNow: clock(),
      focusLosses: attempt.focusLosses,
      question: finishedAt ? null : question,
      selectedOptionId: answer?.optionId ?? null,
    };
    if (!finishedAt && mode === "practice" && answer)
      state.feedback = {
        correctOptionId,
        explanation,
        source,
        correct: answer.optionId === correctOptionId,
      };
    if (finishedAt) {
      const review = attempt.round.map((q, i) => ({
        ...q,
        selectedOptionId: attempt.answers[i]?.optionId ?? null,
        correct: attempt.answers[i]?.optionId === q.correctOptionId,
      }));
      const correct = review.filter((q) => q.correct).length;
      state.result = {
        correct,
        answered,
        skipped: review.length - answered,
        points: correct * 100,
        percentage: Math.round((correct / review.length) * 100),
        elapsedSeconds: Math.max(
          0,
          Math.round((finishedAt - startedAt) / 1000),
        ),
        review,
      };
    }
    return state;
  }
  async function start(actor, input) {
    const { name, mode, topicIds, count, clientId, requestId } = input;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 30 ||
      !["practice", "challenge"].includes(mode) ||
      ![10, 15].includes(count) ||
      !uuid(clientId) ||
      !uuid(requestId)
    )
      reject(
        400,
        "INVALID_SETTINGS",
        "Tên hoặc cấu hình bài làm không hợp lệ.",
      );
    if (
      !Array.isArray(topicIds) ||
      topicIds.length < 1 ||
      topicIds.length > topics.length ||
      new Set(topicIds).size !== topicIds.length ||
      topicIds.some((id) => !topics.some((t) => t.id === id))
    )
      reject(400, "INVALID_TOPICS", "Hãy chọn chủ đề hợp lệ.");
    const candidates = bank.filter((q) => topicIds.includes(q.topic));
    if (candidates.length < count)
      reject(
        400,
        "NOT_ENOUGH_QUESTIONS",
        "Chọn thêm chủ đề hoặc giảm số câu của lượt chơi.",
      );
    // Store an immutable question snapshot so a later content deployment cannot change this attempt.
    const round = shuffled(candidates)
      .slice(0, count)
      .map((q) => {
        const options = shuffled(
          q.options.map((text, i) => ({
            id: randomUUID(),
            text,
            correct: i === q.correctAnswer,
          })),
        );
        return {
          id: randomUUID(),
          topic: q.topic,
          question: q.question,
          options: options.map(({ id, text }) => ({ id, text })),
          correctOptionId: options.find((o) => o.correct).id,
          explanation: q.explanation,
          source: q.source,
        };
      });
    const now = clock();
    const attempt = {
      id: randomUUID(),
      actor,
      name: name.trim(),
      mode,
      topicIds,
      round,
      index: 0,
      answers: {},
      revision: 0,
      clientId,
      requestId,
      startedAt: now,
      deadline:
        mode === "challenge" ? now + count * secondsPerQuestion * 1000 : null,
      finishedAt: null,
      focusLosses: 0,
      focusEvents: [],
    };
    const active = await store.start(actor, attempt);
    if (
      active.requestId !== requestId &&
      !active.finishedAt &&
      (!active.deadline || clock() < active.deadline)
    )
      reject(
        409,
        "ACTIVE_ATTEMPT",
        "Bạn còn một bài đang làm. Hãy tiếp tục hoặc kết thúc bài đó trước.",
      );
    if (active.id !== attempt.id && active.requestId !== requestId)
      return act(actor, "resume", { attemptId: active.id, clientId });
    return publicState(active);
  }
  async function act(actor, action, input) {
    const { attemptId, clientId } = input;
    if (!uuid(attemptId) || !uuid(clientId))
      reject(400, "INVALID_ATTEMPT", "Mã bài làm không hợp lệ.");
    for (let retry = 0; retry < 8; retry++) {
      const saved = await store.get(attemptId);
      if (!saved || saved.actor !== actor)
        reject(
          404,
          "NOT_FOUND",
          "Không tìm thấy bài làm hoặc phiên đã hết hạn.",
        );
      const attempt = structuredClone(saved);
      const now = clock();
      const timedOut =
        !attempt.finishedAt && attempt.deadline && now >= attempt.deadline;
      if (timedOut) finish(attempt, "timeout", now);
      else if (!attempt.finishedAt) {
        if (action === "resume") attempt.clientId = clientId;
        else if (attempt.clientId !== clientId)
          reject(
            409,
            "SESSION_MOVED",
            "Bài làm đã được mở ở tab khác. Quay về để tiếp quản bài làm.",
          );
        if (action === "answer") {
          const index = attempt.round.findIndex(
            (q) => q.id === input.questionId,
          );
          const previous = attempt.answers[index];
          if (previous && previous.optionId === input.optionId)
            return publicState(attempt); // Safe network retry.
          if (previous)
            reject(
              409,
              "ANSWER_LOCKED",
              "Đáp án đã được xác nhận và không thể sửa.",
            );
          if (index !== attempt.index)
            reject(409, "OUT_OF_ORDER", "Câu hỏi không phải câu hiện tại.");
          if (
            !attempt.round[index].options.some((o) => o.id === input.optionId)
          )
            reject(400, "INVALID_OPTION", "Phương án trả lời không hợp lệ.");
          attempt.answers[index] = {
            optionId: input.optionId,
            receivedAt: now,
          };
          if (attempt.mode === "challenge") {
            if (index === attempt.round.length - 1)
              finish(attempt, "completed", now);
            else attempt.index++;
          }
        } else if (action === "next") {
          // questionId makes retries idempotent: a repeated next cannot skip a question.
          if (input.questionId === attempt.round[attempt.index]?.id) {
            if (!attempt.answers[attempt.index])
              reject(
                409,
                "ANSWER_REQUIRED",
                "Hãy xác nhận đáp án trước khi chuyển câu.",
              );
            if (attempt.index === attempt.round.length - 1)
              finish(attempt, "completed", now);
            else attempt.index++;
          }
        } else if (action === "finish") finish(attempt, "submitted", now);
        else if (action === "focus") {
          if (!uuid(input.eventId))
            reject(400, "INVALID_EVENT", "Sự kiện không hợp lệ.");
          if (
            !attempt.focusEvents.includes(input.eventId) &&
            attempt.focusEvents.length < 100
          ) {
            attempt.focusEvents.push(input.eventId);
            attempt.focusLosses++;
          }
        } else if (!["status", "resume", "answer"].includes(action))
          reject(400, "INVALID_ACTION", "Thao tác không hợp lệ.");
      }
      if (JSON.stringify(attempt) === JSON.stringify(saved))
        return publicState(attempt);
      attempt.revision = saved.revision + 1;
      if (await store.compareAndSet(attemptId, saved.revision, attempt))
        return publicState(attempt);
    }
    reject(
      409,
      "CONCURRENT_UPDATE",
      "Bài làm vừa thay đổi. Đồng bộ lại rồi thử lại.",
    );
  }
  async function active(actor, clientId) {
    const id = await store.active(actor);
    return id ? act(actor, "resume", { attemptId: id, clientId }) : null;
  }
  return { catalog, start, act, active };
}
