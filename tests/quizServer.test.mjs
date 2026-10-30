import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { questions, topics } from "../server/questionBank.js";
import { createQuizService } from "../server/quizService.js";
import { createMemoryStore, createRedisStore } from "../server/quizStore.js";
import { createQuizHandler } from "../server/quizHttp.js";
import { estimateServerNow, secondsRemaining } from "../src/quizClient.js";

function setup() {
  let now = 100000;
  const store = createMemoryStore();
  const service = createQuizService({
    store,
    bank: questions,
    topics,
    clock: () => now,
  });
  const actor = randomUUID(),
    clientId = randomUUID();
  const input = (extra = {}) => ({
    name: "Người học",
    mode: "challenge",
    topicIds: ["unity"],
    count: 10,
    clientId,
    requestId: randomUUID(),
    ...extra,
  });
  return {
    store,
    service,
    actor,
    clientId,
    input,
    time: (value) => {
      now = value;
    },
    start: (extra) => service.start(actor, input(extra)),
    act: (action, state, extra = {}) =>
      service.act(actor, action, { attemptId: state.id, clientId, ...extra }),
  };
}

test("challenge sends only current question and opaque options, no answer keys until finish", async () => {
  const s = setup();
  const state = await s.start();
  assert.equal(state.total, 10);
  assert.equal(state.question.options.length, 4);
  for (const key of [
    "correctOptionId",
    "correctAnswer",
    "explanation",
    "source",
    "round",
    "answers",
    "result",
    "feedback",
  ])
    assert.ok(!JSON.stringify(state).includes(`"${key}"`));
  const full = await s.store.get(state.id);
  assert.equal(new Set(full.round.map((q) => q.id)).size, 10);
  assert.ok(
    full.round.every((q) => q.options.some((o) => o.id === q.correctOptionId)),
  );
  const next = await s.act("answer", state, {
    questionId: state.question.id,
    optionId: full.round[0].correctOptionId,
    points: 99999,
    deadline: 99999999,
  });
  assert.equal(next.index, 1);
  assert.equal(next.answered, 1);
  assert.equal(next.feedback, undefined);
  assert.equal(next.deadline, 550000);
  const done = await s.act("finish", next, {
    points: 99999,
    answers: Array(10).fill("correct"),
  });
  assert.equal(done.result.correct, 1);
  assert.equal(done.result.points, 100);
  assert.equal(done.result.skipped, 9);
});

test("expired session cannot accept answers; resume after sleep/reload returns immutable timeout result", async () => {
  const s = setup();
  const state = await s.start();
  const full = await s.store.get(state.id);
  s.time(state.deadline);
  const expired = await s.act("answer", state, {
    questionId: state.question.id,
    optionId: full.round[0].correctOptionId,
  });
  assert.equal(expired.result.points, 0);
  assert.equal(expired.finishReason, "timeout");
  assert.equal(expired.finishedAt, state.deadline);
  s.time(state.deadline + 3600000);
  const restored = await s.act("resume", state, { clientId: randomUUID() });
  assert.equal(restored.finishedAt, state.deadline);
  assert.equal(restored.result.points, 0);
});

test("valid answer just before deadline counts; client timestamps and clocks cannot extend the exam", async () => {
  const s = setup();
  const state = await s.start();
  const full = await s.store.get(state.id);
  s.time(state.deadline - 1);
  const next = await s.act("answer", state, {
    questionId: state.question.id,
    optionId: full.round[0].correctOptionId,
    receivedAt: 0,
    finishedAt: 0,
  });
  s.time(state.deadline + 5000);
  const done = await s.act("status", next);
  assert.equal(done.result.correct, 1);
  assert.equal(done.result.elapsedSeconds, 450);
});

test("practice locks answer, safely retries next, and reveals only the confirmed current explanation", async () => {
  const s = setup();
  const state = await s.start({ mode: "practice" });
  const confirmed = await s.act("answer", state, {
    questionId: state.question.id,
    optionId: state.question.options[0].id,
  });
  assert.ok(confirmed.feedback.explanation);
  assert.equal(confirmed.index, 0);
  await assert.rejects(
    s.act("answer", state, {
      questionId: state.question.id,
      optionId: state.question.options[1].id,
    }),
    (e) => e.code === "ANSWER_LOCKED",
  );
  const next = await s.act("next", state, { questionId: state.question.id });
  const retry = await s.act("next", state, { questionId: state.question.id });
  assert.equal(next.index, 1);
  assert.equal(retry.index, 1);
  assert.equal(retry.feedback, undefined);
});

test("concurrent conflicting submissions accept exactly one and cannot revise the recorded choice", async () => {
  const s = setup();
  const state = await s.start();
  const responses = await Promise.allSettled(
    state.question.options
      .slice(0, 2)
      .map((o) =>
        s.act("answer", state, {
          questionId: state.question.id,
          optionId: o.id,
        }),
      ),
  );
  assert.equal(responses.filter((r) => r.status === "fulfilled").length, 1);
  const saved = await s.store.get(state.id);
  assert.equal(Object.keys(saved.answers).length, 1);
  assert.equal(saved.index, 1);
});

test("foreign actors, foreign options, out-of-order questions and duplicate active attempts are rejected", async () => {
  const s = setup();
  const state = await s.start();
  const full = await s.store.get(state.id);
  await assert.rejects(
    s.service.act(randomUUID(), "status", {
      attemptId: state.id,
      clientId: s.clientId,
    }),
    (e) => e.code === "NOT_FOUND",
  );
  await assert.rejects(
    s.act("answer", state, {
      questionId: state.question.id,
      optionId: randomUUID(),
    }),
    (e) => e.code === "INVALID_OPTION",
  );
  await assert.rejects(
    s.act("answer", state, {
      questionId: full.round[1].id,
      optionId: full.round[1].options[0].id,
    }),
    (e) => e.code === "OUT_OF_ORDER",
  );
  await assert.rejects(s.start(), (e) => e.code === "ACTIVE_ATTEMPT");
  await assert.rejects(
    s.start({ count: 15 }),
    (e) => e.code === "NOT_ENOUGH_QUESTIONS",
  );
});

test("resume preserves progress and deadline; taking over invalidates the earlier tab", async () => {
  const s = setup();
  const state = await s.start();
  const next = await s.act("answer", state, {
    questionId: state.question.id,
    optionId: state.question.options[0].id,
  });
  const clientId = randomUUID();
  const restored = await s.act("resume", next, { clientId });
  assert.equal(restored.answered, 1);
  assert.equal(restored.deadline, state.deadline);
  await assert.rejects(
    s.act("answer", restored, {
      questionId: restored.question.id,
      optionId: restored.question.options[0].id,
    }),
    (e) => e.code === "SESSION_MOVED",
  );
});

test("focus events are deduplicated and do not deduct points or terminate attempts", async () => {
  const s = setup();
  const state = await s.start();
  const eventId = randomUUID();
  await s.act("focus", state, { eventId });
  const current = await s.act("focus", state, { eventId });
  assert.equal(current.focusLosses, 1);
  assert.equal(current.finishedAt, null);
  assert.equal(current.result, undefined);
});

test("clock display handles backwards clock changes, device sleep and exact deadline", () => {
  const anchor = { serverNow: 1000, wallNow: 5000, monotonicNow: 100 };
  assert.equal(estimateServerNow(anchor, 0, 2100), 3000);
  assert.equal(estimateServerNow(anchor, 65000, 100), 61000);
  assert.equal(secondsRemaining(61000, 61000), 0);
  assert.equal(secondsRemaining(61000, 61001), 0);
  assert.equal(secondsRemaining(null, 0), null);
});

test("Redis requests use atomic Lua compare-and-set with TTL preservation; storage errors fail closed", async () => {
  const calls = [];
  const store = createRedisStore({
    url: "https://example.invalid",
    token: "test-token",
    fetcher: async (_url, init) => {
      calls.push(JSON.parse(init.body));
      return { ok: true, json: async () => ({ result: 1 }) };
    },
  });
  assert.equal(await store.compareAndSet("test", 3, { revision: 4 }), true);
  assert.equal(calls[0][0], "EVAL");
  assert.ok(calls[0][1].includes("KEEPTTL"));
  assert.ok(calls[0][1].includes("revision"));
  const failed = createRedisStore({
    url: "https://example.invalid",
    token: "test-token",
    fetcher: async () => ({ ok: false }),
  });
  await assert.rejects(failed.get("test"), /unavailable/);
});

test("HTTP requires same origin, validates JSON, signs HttpOnly cookies and enforces rate limits", async (t) => {
  const s = setup();
  const handler = createQuizHandler({
    service: s.service,
    store: s.store,
    secret: "test-secret-with-more-than-32-characters",
    development: true,
  });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  const url = `http://127.0.0.1:${server.address().port}`;
  const catalog = await fetch(url);
  const cookie = catalog.headers.get("set-cookie");
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("SameSite=Strict"));
  assert.equal(catalog.headers.get("cache-control"), "no-store, private");
  assert.equal((await catalog.json()).total, 60);
  const bad = await fetch(url, {
    method: "POST",
    headers: {
      Origin: "https://evil.invalid",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(bad.status, 403);
  const broken = await fetch(url, {
    method: "POST",
    headers: { Origin: url, "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(broken.status, 400);
  const post = (input) =>
    fetch(url, {
      method: "POST",
      headers: {
        Origin: url,
        "Content-Type": "application/json",
        Cookie: cookie.split(";")[0],
      },
      body: JSON.stringify(input),
    });
  const created = await post({ action: "start", ...s.input() });
  assert.equal(created.status, 200);
  const state = (await created.json()).state;
  const forged = await fetch(url, {
    method: "POST",
    headers: {
      Origin: url,
      "Content-Type": "application/json",
      Cookie: cookie.split(";")[0].replace(/.$/, "X"),
    },
    body: JSON.stringify({
      action: "status",
      attemptId: state.id,
      clientId: s.clientId,
    }),
  });
  assert.equal(forged.status, 404);
  s.store.limit = async () => false;
  assert.equal(
    (await post({ action: "active", clientId: s.clientId })).status,
    429,
  );
});
