import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "./Layout";
import {
  estimateServerNow,
  exportQuizResult,
  quizRequest,
  readStoredSettings,
  secondsRemaining,
} from "./quizClient";
import "./Quiz.css";

const letters = ["A", "B", "C", "D"];
const timeText = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const draftKey = "vnr202.quiz.draft";
const readDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey) || "null");
  } catch {
    return null;
  }
};

export default function Quiz() {
  const [settings, setSettings] = useState(readStoredSettings);
  const [catalog, setCatalog] = useState(null);
  const [session, setSession] = useState(null);
  const [choice, setChoice] = useState(null);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moved, setMoved] = useState(false);
  const [reviewWrong, setReviewWrong] = useState(false);
  const [clientId] = useState(() => crypto.randomUUID());
  const busyRef = useRef(false);
  const sessionRef = useRef(null);
  const clockRef = useRef(null);
  const draftRef = useRef(readDraft());
  const headingRef = useRef(null);
  const startedRequestRef = useRef(null);
  const name = typeof settings.name === "string" ? settings.name : "";
  const mode = settings.mode === "challenge" ? "challenge" : "practice";
  const count = settings.count === 15 ? 15 : 10;
  const topicIds = Array.isArray(settings.topicIds)
    ? settings.topicIds
    : catalog?.topics.map((t) => t.id) || [];
  const available =
    catalog?.topics
      .filter((t) => topicIds.includes(t.id))
      .reduce((sum, t) => sum + t.count, 0) || 0;
  const remaining = secondsRemaining(session?.deadline, now);

  const apply = useCallback((state) => {
    if (!state) return;
    const previous = sessionRef.current;
    if (previous?.id === state.id && previous.revision > state.revision) return;
    clockRef.current = {
      serverNow: state.serverNow,
      wallNow: Date.now(),
      monotonicNow: performance.now(),
    };
    setNow(state.serverNow);
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
            name: current.state.name,
            mode: current.state.mode,
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
    const tick = () =>
      setNow(
        estimateServerNow(clockRef.current, Date.now(), performance.now()),
      );
    const timer = setInterval(tick, 250);
    const sync = setInterval(() => run("status"), 10000);
    const visibility = () => {
      if (
        document.visibilityState === "hidden" &&
        sessionRef.current?.mode === "challenge"
      )
        run("focus", { eventId: crypto.randomUUID() });
      else if (document.visibilityState === "visible") run("status");
    };
    const refresh = () => run("status");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(timer);
      clearInterval(sync);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [active, moved, run]);

  useEffect(() => {
    if (!active || remaining !== 0 || moved) return undefined;
    // Ask the server to finalize. Never invent a result on the client, even offline.
    const timer = setInterval(() => run("status"), 2000);
    const immediate = setTimeout(() => run("status"), 0);
    return () => {
      clearInterval(timer);
      clearTimeout(immediate);
    };
  }, [active, remaining, moved, run]);

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
    if (!name.trim() || available < count || loading) return;
    startedRequestRef.current ||= crypto.randomUUID();
    const result = await run("start", {
      name: name.trim(),
      mode,
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
        <p className="eyebrow">KIẾN THỨC QUA TRẢI NGHIỆM / QUIZ VNR202</p>
        {catalog?.development && (
          <p className="quiz-notice">
            Bản chạy tại máy để kiểm thử. Bài làm trên Vercel cần cấu hình máy
            chủ riêng; khởi động lại máy chủ local có thể mất phiên.
          </p>
        )}
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
              <h1 className="page-title">
                Hiểu bước ngoặt.
                <br />
                <em>Thử trí nhớ.</em>
              </h1>
              <p className="page-intro">
                1975–1986: xây dựng CNXH, bảo vệ Tổ quốc và bước ngoặt Đại hội
                VI. Mỗi chủ đề có 10 câu để tự luyện.
              </p>
            </div>
            <form onSubmit={start} className="quiz-setup">
              <div className="topic-selection">
                <div className="section-heading">
                  <h2>01. Chọn chủ đề ôn tập</h2>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      setSetting(
                        "topicIds",
                        catalog.topics.map((t) => t.id),
                      )
                    }
                    disabled={!catalog}
                  >
                    Chọn tất cả
                  </button>
                </div>
                <p>Kết hợp nhiều chủ đề để tạo lượt 15 câu.</p>
                <div className="topic-grid">
                  {catalog?.topics.map((topic, i) => (
                    <label
                      key={topic.id}
                      className={`topic-option ${topicIds.includes(topic.id) ? "selected" : ""}`}
                    >
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
                      <span className="topic-number">0{i + 1}</span>
                      <strong>{topic.title}</strong>
                      <span>{topic.description}</span>
                      <small>{topic.count} câu hỏi</small>
                    </label>
                  ))}
                </div>
                <div className="quiz-policy">
                  <strong>Cách bảo vệ lượt thử thách</strong>
                  <p>
                    Câu hỏi và phương án được đảo ngẫu nhiên. Máy chủ khóa đáp
                    án khi xác nhận, tính giờ và chấm điểm. Tải lại trang tiếp
                    tục bài cũ; mở bài ở tab khác sẽ chuyển quyền thao tác sang
                    tab đó.
                  </p>
                  <p>
                    Lượt rời tab được ghi nhận để tham khảo, không tự trừ điểm.
                    Hệ thống không dùng camera và không thể ngăn tra cứu bằng
                    thiết bị khác.
                  </p>
                  <p>
                    Ngân hàng có nguồn tham khảo; nhóm cần đối chiếu với giáo
                    trình của lớp trước khi dùng để đánh giá.
                  </p>
                </div>
              </div>
              <div className="setup-card">
                <h2>02. Sẵn sàng bắt đầu</h2>
                <label htmlFor="quiz-name">Tên người chơi</label>
                <input
                  id="quiz-name"
                  value={name}
                  maxLength={30}
                  required
                  autoComplete="name"
                  onChange={(e) => setSetting("name", e.target.value)}
                  placeholder="Tên của bạn"
                />
                <fieldset>
                  <legend>Chế độ chơi</legend>
                  <label className="mode-option">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "practice"}
                      onChange={() => setSetting("mode", "practice")}
                    />
                    <span>
                      <strong>Tự luyện</strong>
                      <small>Không tính giờ · Lời giải sau khi xác nhận</small>
                    </span>
                  </label>
                  <label className="mode-option">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "challenge"}
                      onChange={() => setSetting("mode", "challenge")}
                    />
                    <span>
                      <strong>Thử thách</strong>
                      <small>
                        45 giây/câu, tính chung cả bài · Đáp án cuối lượt
                      </small>
                    </span>
                  </label>
                </fieldset>
                <label htmlFor="quiz-count">Số câu mỗi lượt</label>
                <select
                  id="quiz-count"
                  value={count}
                  onChange={(e) => setSetting("count", Number(e.target.value))}
                >
                  <option value={10}>10 câu</option>
                  <option value={15}>15 câu</option>
                </select>
                <p role="status">
                  {available >= count
                    ? `${count} câu từ ${available} câu đã chọn.`
                    : `Đã chọn ${available} câu. Hãy chọn thêm chủ đề hoặc chuyển sang 10 câu.`}
                </p>
                <button
                  className="button"
                  disabled={
                    busy || !catalog || !name.trim() || available < count
                  }
                >
                  {busy
                    ? "Đang tạo bài…"
                    : `Bắt đầu ${mode === "practice" ? "tự luyện" : "thử thách"} →`}
                </button>
                <p>
                  Không cần tài khoản · 100 điểm/câu đúng · Lưu bài tối đa 48
                  giờ
                </p>
              </div>
            </form>
          </>
        ) : result ? (
          <div className="quiz-results">
            <div className="result-banner">
              <div>
                <p className="eyebrow">
                  {session.finishReason === "timeout"
                    ? "ĐÃ HẾT THỜI GIAN"
                    : "HOÀN THÀNH LƯỢT CHƠI"}
                </p>
                <h1 ref={headingRef} tabIndex={-1}>
                  Dấu ấn của {session.name}.
                </h1>
                <p>Kết quả được chấm và lưu bởi máy chủ.</p>
              </div>
              <div className="result-score">
                {result.percentage}
                <span>% chính xác</span>
              </div>
            </div>
            <div className="result-stats">
              <div>
                <strong>
                  {result.correct}/{session.total}
                </strong>
                <span>Câu đúng</span>
              </div>
              <div>
                <strong>{result.points}</strong>
                <span>Tổng điểm</span>
              </div>
              <div>
                <strong>{timeText(result.elapsedSeconds)}</strong>
                <span>Thời gian làm bài</span>
              </div>
              <div>
                <strong>{result.skipped}</strong>
                <span>Chưa trả lời</span>
              </div>
            </div>
            <p className="quiz-notice">
              Rời tab được ghi nhận: {session.focusLosses} lần. Chỉ là dấu hiệu
              tham khảo, không phải kết luận gian lận.
            </p>
            <div className="actions">
              <button className="button" disabled={busy} onClick={start}>
                Chơi lại →
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
              .filter((q) => !reviewWrong || !q.correct)
              .map((q) => (
                <article className="review-card" key={q.id}>
                  <p className="eyebrow">
                    CÂU {result.review.indexOf(q) + 1} ·{" "}
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
                  <a href={q.source.url} target="_blank" rel="noreferrer">
                    {q.source.title} ↗
                  </a>
                </article>
              ))}
          </div>
        ) : current ? (
          <div className="quiz-playing">
            <div className="quiz-toolbar">
              <span>
                {session.name} /{" "}
                {session.mode === "practice" ? "Tự luyện" : "Thử thách"}
              </span>
              {remaining !== null ? (
                <strong
                  className={remaining <= 30 ? "time-warning" : ""}
                  role="timer"
                  aria-label="Thời gian còn lại"
                >
                  ◷ {timeText(remaining)}
                </strong>
              ) : (
                <span>Không giới hạn thời gian</span>
              )}
              <button
                type="button"
                className="text-link"
                disabled={busy || moved}
                onClick={() => {
                  if (
                    window.confirm(
                      "Nộp bài và xem kết quả? Các câu chưa trả lời sẽ không được tính điểm.",
                    )
                  )
                    run("finish");
                }}
              >
                Nộp bài
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
                : remaining === 0
                  ? "Đã hết thời gian hiển thị. Đang chờ máy chủ xác nhận kết quả…"
                  : "Bài làm được lưu khi máy chủ xác nhận. Có thể tải lại để tiếp tục."}
            </p>
            <article className="question-card">
              <p className="eyebrow">
                {catalog?.topics.find((t) => t.id === current.topic)?.title}
              </p>
              <h1 ref={headingRef} tabIndex={-1}>
                {current.question}
              </h1>
              <fieldset
                className="answer-options"
                disabled={confirmed || busy || moved || remaining === 0}
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
                    {feedback?.correctOptionId === option.id && (
                      <strong>✓</strong>
                    )}
                  </label>
                ))}
              </fieldset>
              {feedback && (
                <div className="answer-explanation" role="status">
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
                  <a
                    href={feedback.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {feedback.source.title} ↗
                  </a>
                </div>
              )}
              <div className="question-actions">
                <span>
                  {session.mode === "practice"
                    ? "Xác nhận đáp án để xem lời giải; không thể sửa sau khi đã gửi."
                    : "Máy chủ chỉ trả đáp án và lời giải khi kết thúc bài."}
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
                    disabled={!choice || busy || moved || remaining === 0}
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
