import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Layout from "./Layout";
import { practiceCounts, topics } from "./data/quiz.js";
import {
  exportQuizResult,
  quizRequest,
  readStoredSettings,
} from "./quizClient";
import "./Quiz.css";

const letters = ["A", "B", "C", "D"];
const draftKey = "vnr202.quiz.draft";
const readDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey) || "null");
  } catch {
    return null;
  }
};

export default function Quiz() {
  const [params] = useSearchParams();
  const [settings, setSettings] = useState(() => {
    const saved = readStoredSettings();
    const topic = params.get("topic");
    return topics.some(({ id }) => id === topic) ? { ...saved, topicIds: [topic] } : saved;
  });
  const [catalog, setCatalog] = useState(null);
  const [session, setSession] = useState(null);
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moved, setMoved] = useState(false);
  const [reviewWrong, setReviewWrong] = useState(false);
  const [clientId] = useState(() => crypto.randomUUID());
  const busyRef = useRef(false);
  const sessionRef = useRef(null);
  const draftRef = useRef(readDraft());
  const headingRef = useRef(null);
  const startedRequestRef = useRef(null);
  const catalogTopicIds = catalog?.topics.map((topic) => topic.id) || [];
  const savedTopicIds = Array.isArray(settings.topicIds) ? settings.topicIds : null;
  const matchingTopicIds = savedTopicIds?.filter((id) => catalogTopicIds.includes(id));
  const topicIds = matchingTopicIds?.length || savedTopicIds?.length === 0
    ? matchingTopicIds
    : catalogTopicIds;
  const available =
    catalog?.topics
      .filter((t) => topicIds.includes(t.id))
      .reduce((sum, t) => sum + t.count, 0) || 0;
  const countOptions = practiceCounts.filter((size) => size < available);
  const preferredCount = practiceCounts.includes(settings.practiceCount)
    ? settings.practiceCount
    : practiceCounts[0];
  const count = settings.practiceCount === "all"
    ? available
    : Math.min(preferredCount, available);

  const apply = useCallback((state) => {
    if (!state) return;
    const previous = sessionRef.current;
    if (previous?.id === state.id && previous.revision > state.revision) return;
    sessionRef.current = state;
    setSession(state);
    const draft = draftRef.current;
    setChoice(
      (current) =>
        state.selectedOptionId ||
        (draft?.attemptId === state.id &&
        draft?.questionId === state.question?.id &&
        state.question?.options.some((o) => o.id === draft.optionId)
          ? draft.optionId
          : previous?.question?.id === state.question?.id
            ? current
            : null),
    );
    if (state.finishedAt) {
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Storage is optional. */
      }
    }
  }, []);

  const run = useCallback(
    async (action, payload = {}) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError("");
      try {
        const data = await quizRequest({
          action,
          clientId,
          ...(sessionRef.current ? { attemptId: sessionRef.current.id } : {}),
          ...payload,
        });
        apply(data.state);
        setMoved(false);
        return data.state;
      } catch (failure) {
        setError(
          failure.message ||
            "Mất kết nối. Đáp án chưa được máy chủ xác nhận; hãy thử đồng bộ lại.",
        );
        if (failure.code === "SESSION_MOVED") setMoved(true);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [apply, clientId],
  );

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        const data = await quizRequest();
        if (!alive) return;
        setCatalog(data);
        const current = await quizRequest({ action: "active", clientId });
        if (alive && current.state) {
          apply(current.state);
          setSettings((value) => ({
            ...value,
            topicIds: current.state.topicIds,
            count: current.state.total,
          }));
        }
      } catch (failure) {
        if (alive)
          setError(failure.message || "Không kết nối được máy chủ Quiz.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    boot();
    return () => {
      alive = false;
    };
  }, [apply, clientId]);

  useEffect(() => {
    try {
      localStorage.setItem("vnr202.quiz.settings", JSON.stringify(settings));
    } catch {
      /* Storage is optional. */
    }
  }, [settings]);

  const active = Boolean(session && !session.finishedAt);
  useEffect(() => {
    if (!active || moved) return undefined;
    const sync = setInterval(() => run("status"), 10000);
    const visibility = () => {
      if (document.visibilityState === "visible") run("status");
    };
    const refresh = () => run("status");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(sync);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [active, moved, run]);

  const questionId = session?.question?.id;
  const finishedAt = session?.finishedAt;
  useEffect(() => {
    headingRef.current?.focus();
  }, [questionId, finishedAt]);

  function setSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    startedRequestRef.current = null;
  }
  async function start(event) {
    event?.preventDefault();
    if (!count || loading) return;
    startedRequestRef.current ||= crypto.randomUUID();
    const result = await run("start", {
      name: "Người học",
      mode: "practice",
      count,
      topicIds,
      requestId: startedRequestRef.current,
    });
    if (result) {
      setReviewWrong(false);
      startedRequestRef.current = null;
    }
  }
  function select(optionId) {
    setChoice(optionId);
    const draft = {
      attemptId: session.id,
      questionId: session.question.id,
      optionId,
    };
    draftRef.current = draft;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      /* Draft storage is optional. */
    }
  }

  const current = session?.question;
  const confirmed = Boolean(session?.selectedOptionId);
  const feedback = session?.feedback;
  const result = session?.result;

  return (
    <Layout>
      <section className="page-width section-space quiz-page">
        {error && (
          <div className="quiz-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="outline-button"
              disabled={busy}
              onClick={() => {
                if (session) run(moved ? "resume" : "status");
                else run("active");
              }}
            >
              {moved ? "Tiếp quản bài làm" : "Đồng bộ bài làm"}
            </button>
            {!catalog && (
              <button
                className="outline-button"
                onClick={() => window.location.reload()}
              >
                Kết nối lại
              </button>
            )}
          </div>
        )}
        {loading ? (
          <p className="quiz-loading" role="status">
            Đang kết nối và kiểm tra bài làm đã lưu…
          </p>
        ) : !session ? (
          <>
            <div className="quiz-intro">
              <div>
              <p className="quiz-kicker">VNR202 · GÓC ÔN TẬP</p>
              <h1 className="page-title">Ôn tập lịch sử Đảng</h1>
              <p className="page-intro">
                {catalog?.studyEnabled
                  ? "Học theo chương, xem đáp án và dùng thẻ ghi nhớ trước khi tự kiểm tra."
                  : "Chọn chủ đề và đọc lời giải sau mỗi câu trả lời."}
              </p>
              </div>
              {catalog && <div className="quiz-hero-index">
                <strong>{catalog.total}</strong><span>câu hỏi</span>
                <span>{catalog.topics.length} chủ đề ôn tập</span>
              </div>}
            </div>
            <form onSubmit={start} className="quiz-setup">
              <div className="topic-selection">
                <div className="section-heading">
                  <h2>Chủ đề ôn tập</h2>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      setSetting(
                        "topicIds",
                        topicIds.length === catalogTopicIds.length ? [] : catalogTopicIds,
                      )
                    }
                    disabled={!catalogTopicIds.length}
                  >
                    {catalogTopicIds.length > 0 && topicIds.length === catalogTopicIds.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
                <p>Bạn có thể ôn một chủ đề hoặc kết hợp nhiều chủ đề.</p>
                <div className="topic-grid">
                  {catalog?.topics.map((topic, i) => (
                    <div
                      key={topic.id}
                      className={`topic-option ${topicIds.includes(topic.id) ? "selected" : ""}`}
                    >
                      <label className="quiz-topic-toggle">
                        <input
                          type="checkbox"
                          checked={topicIds.includes(topic.id)}
                          onChange={() =>
                            setSetting(
                              "topicIds",
                              topicIds.includes(topic.id)
                                ? topicIds.filter((id) => id !== topic.id)
                                : [...topicIds, topic.id],
                            )
                          }
                        />
                        <span className="topic-number">{String(i + 1).padStart(2, "0")}</span>
                        <strong>{topic.title}</strong>
                        <span>{topic.description}</span>
                        <small>{topic.count} câu hỏi</small>
                      </label>
                      {catalog.studyEnabled && <div className="quiz-topic-links">
                        <Link className="quiz-study-link" to={`/quiz/study/${topic.id}`}>Xem đáp án</Link>
                        <Link className="quiz-study-link" to={`/quiz/study/${topic.id}?mode=cards`}>Thẻ ghi nhớ</Link>
                      </div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="setup-card">
                <p className="quiz-kicker">LUYỆN TRẮC NGHIỆM</p>
                <h2>Thiết lập lượt ôn</h2>
                <p className="quiz-selection-summary">{topicIds.length} chủ đề · {available} câu có sẵn</p>
                <fieldset className="quiz-counts" disabled={!available || busy}>
                  <legend>Số câu ôn tập</legend>
                  {countOptions.map((size) => (
                    <label key={size}>
                      <input type="radio" name="quiz-count" checked={count === size}
                        onChange={() => setSetting("practiceCount", size)} />
                      {size} câu
                    </label>
                  ))}
                  {available > 0 && <label className="quiz-count-all">
                    <input type="radio" name="quiz-count" checked={count === available}
                      onChange={() => setSetting("practiceCount", "all")} />
                    Ôn toàn bộ · {available} câu
                  </label>}
                </fieldset>
                <p role="status">
                  {available
                    ? count === available
                      ? "Lượt này gồm toàn bộ câu hỏi trong các chủ đề đã chọn."
                      : `Lấy ngẫu nhiên ${count} trong ${available} câu thuộc các chủ đề đã chọn.`
                    : catalog?.total
                      ? "Hãy chọn chủ đề có câu hỏi."
                      : catalog && "Ngân hàng chưa có câu hỏi đang bật."}
                </p>
                <button
                  className="button"
                  disabled={busy || loading || !count}
                >
                  {busy
                    ? "Đang tạo bài…"
                    : "Bắt đầu ôn tập →"}
                </button>
                <p>
                  Không giới hạn thời gian. Bài làm được lưu tối đa 48 giờ.
                </p>
              </div>
            </form>
          </>
        ) : result ? (
          <div className="quiz-results">
            <div className="result-banner">
              <div>
                <p className="eyebrow">
                  TỔNG KẾT ÔN TẬP
                </p>
                <h1 ref={headingRef} tabIndex={-1}>
                  Xem lại bài ôn tập
                </h1>
                <p>Đọc lời giải và xem lại các câu cần ôn thêm.</p>
              </div>
              <div className="quiz-score"><strong>{Math.round(result.correct * 100 / session.total)}%</strong><span>độ chính xác</span></div>
            </div>
            <div className="result-stats">
              <div>
                <strong>{session.total - result.correct - result.skipped}</strong>
                <span>Câu sai</span>
              </div>
              <div>
                <strong>
                  {result.correct}/{session.total}
                </strong>
                <span>Câu đúng</span>
              </div>
              <div>
                <strong>{result.skipped}</strong>
                <span>Chưa trả lời</span>
              </div>
            </div>
            <div className="actions">
              <button className="button" disabled={busy} onClick={start}>
                Ôn lại →
              </button>
              <button
                className="outline-button"
                onClick={() => {
                  sessionRef.current = null;
                  setSession(null);
                  setChoice(null);
                  setError("");
                  setMoved(false);
                }}
              >
                Chọn lại chủ đề
              </button>
              <button
                className="outline-button"
                onClick={() => exportQuizResult(session)}
              >
                Tải kết quả CSV
              </button>
            </div>
            <div className="section-heading review-heading">
              <h2>Đáp án & lời giải</h2>
              <label>
                <input
                  type="checkbox"
                  checked={reviewWrong}
                  onChange={(e) => setReviewWrong(e.target.checked)}
                />{" "}
                Chỉ câu sai / chưa làm
              </label>
            </div>
            {reviewWrong && result.correct === session.total && (
              <p>Bạn đã trả lời đúng tất cả câu hỏi!</p>
            )}
            {result.review
              .map((q, index) => ({ q, number: index + 1 }))
              .filter(({ q }) => !reviewWrong || !q.correct)
              .map(({ q, number }) => (
                <article className="review-card" key={q.id}>
                  <p className="eyebrow">
                    CÂU {number} ·{" "}
                    {q.correct
                      ? "CHÍNH XÁC"
                      : q.selectedOptionId
                        ? "CẦN ÔN LẠI"
                        : "CHƯA TRẢ LỜI"}
                  </p>
                  <h3>{q.question}</h3>
                  <p>
                    Bạn chọn:{" "}
                    {q.options.find((o) => o.id === q.selectedOptionId)?.text ||
                      "Chưa trả lời"}
                  </p>
                  <p className="correct-answer">
                    Đáp án đúng:{" "}
                    {q.options.find((o) => o.id === q.correctOptionId)?.text}
                  </p>
                  <p>{q.explanation}</p>
                  {q.source && (
                    <a href={q.source.url} target="_blank" rel="noreferrer">
                      {q.source.title} ↗
                    </a>
                  )}
                </article>
              ))}
          </div>
        ) : current ? (
          <div className="quiz-playing">
            <div className="quiz-session-header">
            <div className="quiz-toolbar">
              <span>Ôn tập theo tốc độ của bạn</span>
              <button
                type="button"
                className="text-link"
                disabled={busy || moved}
                onClick={() => {
                  if (window.confirm("Kết thúc buổi ôn tập và xem lời giải?"))
                    run("finish");
                }}
              >
                Kết thúc ôn tập
              </button>
            </div>
            <div className="progress-copy">
              <span>
                Câu {session.index + 1} / {session.total}
              </span>
              <span>Đã lưu {session.answered} câu</span>
            </div>
            <progress
              value={session.answered}
              max={session.total}
              aria-label="Tiến độ bài làm"
            />
            <p className="quiz-save-state" role="status">
              {busy
                ? "Đang đồng bộ với máy chủ…"
                : "Tiến độ đã xác nhận được lưu để bạn có thể tiếp tục sau."}
            </p>
            </div>
            <article className="question-card">
              <p className="eyebrow">
                {catalog?.topics.find((t) => t.id === current.topic)?.title}
              </p>
              <h1 ref={headingRef} tabIndex={-1}>
                {current.question}
              </h1>
              <fieldset
                className="answer-options"
                disabled={confirmed || busy || moved}
              >
                <legend className="sr-only">Chọn một đáp án</legend>
                {current.options.map((option, i) => (
                  <label
                    key={option.id}
                    className={`answer-option ${choice === option.id ? "selected" : ""} ${feedback && feedback.correctOptionId === option.id ? "correct" : ""} ${feedback && choice === option.id && !feedback.correct ? "incorrect" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`answer-${current.id}`}
                      checked={choice === option.id}
                      onChange={() => select(option.id)}
                    />
                    <span className="answer-letter">{letters[i]}</span>
                    <span>{option.text}</span>
                    {feedback?.correctOptionId === option.id && <strong>✓ Đúng</strong>}
                    {feedback && choice === option.id && !feedback.correct && <strong>✕ Sai</strong>}
                  </label>
                ))}
              </fieldset>
              {feedback && (
                <div className={`answer-explanation ${feedback.correct ? "is-correct" : ""}`} role="status">
                  <strong>
                    {feedback.correct ? "Chính xác!" : "Cùng ghi nhớ lại."}
                  </strong>
                  <p>
                    Đáp án:{" "}
                    {
                      current.options.find(
                        (o) => o.id === feedback.correctOptionId,
                      )?.text
                    }
                    . {feedback.explanation}
                  </p>
                  {feedback.source && (
                    <a href={feedback.source.url} target="_blank" rel="noreferrer">
                      {feedback.source.title} ↗
                    </a>
                  )}
                </div>
              )}
              <div className="question-actions">
                <span>
                  {confirmed ? "Đã lưu đáp án." : "Chọn một phương án rồi xác nhận."}
                </span>
                {confirmed ? (
                  <button
                    className="button"
                    disabled={busy || moved}
                    onClick={() => run("next", { questionId: current.id })}
                  >
                    {session.index === session.total - 1
                      ? "Xem kết quả"
                      : "Câu tiếp theo"}{" "}
                    →
                  </button>
                ) : (
                  <button
                    className="button"
                    disabled={!choice || busy || moved}
                    onClick={() =>
                      run("answer", {
                        questionId: current.id,
                        optionId: choice,
                      })
                    }
                  >
                    Xác nhận đáp án →
                  </button>
                )}
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </Layout>
  );
}
