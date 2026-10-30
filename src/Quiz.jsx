import { useEffect, useRef, useState } from "react";
import Layout from "./Layout";
import { questions, topics } from "./data/quiz";
import { createRound, scoreRound } from "./quizEngine";

const letters = ["A", "B", "C", "D"];
const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function Quiz() {
  const [name, setName] = useState("");
  const [mode, setMode] = useState("practice");
  const [topicIds, setTopicIds] = useState(topics.map((topic) => topic.id));
  const [count, setCount] = useState(10);
  const [session, setSession] = useState(null);
  const [choice, setChoice] = useState(null);
  const [now, setNow] = useState(0);
  const [reviewWrong, setReviewWrong] = useState(false);
  const questionHeading = useRef(null);
  const resultHeading = useRef(null);
  const available = questions.filter((q) => topicIds.includes(q.topic)).length;
  const hasSession = Boolean(session);
  const questionIndex = session?.index;
  const finishedAt = session?.finishedAt;

  useEffect(() => {
    if (!session || session.finishedAt || !session.deadline) return undefined;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= session.deadline) {
        setSession((current) =>
          current && !current.finishedAt
            ? { ...current, finishedAt: current.deadline, timedOut: true }
            : current,
        );
      }
    };
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (finishedAt) resultHeading.current?.focus();
    else if (hasSession) questionHeading.current?.focus();
  }, [questionIndex, finishedAt, hasSession]);

  function start(event) {
    event?.preventDefault();
    if (!name.trim() || !available) return;
    const startedAt = Date.now();
    const round = createRound(questions, topicIds, count);
    setNow(startedAt);
    setChoice(null);
    setReviewWrong(false);
    setSession({
      name: name.trim(),
      mode,
      round,
      index: 0,
      answers: Array(round.length).fill(null),
      startedAt,
      deadline: mode === "challenge" ? startedAt + round.length * 45000 : null,
      finishedAt: null,
    });
  }

  function submit() {
    if (choice === null || session.answers[session.index] !== null) return;
    const time = Date.now();
    if (session.deadline && time >= session.deadline) {
      setSession({ ...session, finishedAt: session.deadline, timedOut: true });
      return;
    }
    const answers = session.answers.map((answer, i) =>
      i === session.index ? choice : answer,
    );
    const last = session.index === session.round.length - 1;
    if (session.mode === "challenge") {
      setSession({
        ...session,
        answers,
        ...(last ? { finishedAt: time } : { index: session.index + 1 }),
      });
      setChoice(null);
    } else setSession({ ...session, answers });
  }

  const current = session?.round[session.index];
  const confirmed = session && session.answers[session.index] !== null;
  const remaining = session?.deadline
    ? Math.max(0, Math.ceil((session.deadline - now) / 1000))
    : null;
  const result = session ? scoreRound(session.round, session.answers) : null;

  return (
    <Layout>
      <section className="page-width section-space quiz-page">
        <p className="eyebrow">KIẾN THỨC QUA TRẢI NGHIỆM / QUIZ VNR202</p>
        {!session ? (
          <>
            <div className="quiz-intro">
              <h1 className="page-title">
                Hiểu bước ngoặt.
                <br />
                <em>Thử trí nhớ.</em>
              </h1>
              <p className="page-intro">
                1975–1986: Đảng lãnh đạo xây dựng CNXH, bảo vệ Tổ quốc và bước
                ngoặt Đại hội VI.
              </p>
            </div>
            <form onSubmit={start} className="quiz-setup">
              <div className="topic-selection">
                <div className="section-heading">
                  <h2>01. Chọn chủ đề ôn tập</h2>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setTopicIds(topics.map((t) => t.id))}
                  >
                    Chọn tất cả
                  </button>
                </div>
                <p>Có thể kết hợp nhiều chủ đề trong một lượt chơi.</p>
                <div className="topic-grid">
                  {topics.map((topic, i) => (
                    <label
                      className={`topic-option ${topicIds.includes(topic.id) ? "selected" : ""}`}
                      key={topic.id}
                    >
                      <input
                        type="checkbox"
                        checked={topicIds.includes(topic.id)}
                        onChange={() =>
                          setTopicIds((ids) =>
                            ids.includes(topic.id)
                              ? ids.filter((id) => id !== topic.id)
                              : [...ids, topic.id],
                          )
                        }
                      />
                      <span className="topic-number">0{i + 1}</span>
                      <strong>{topic.title}</strong>
                      <span>{topic.description}</span>
                      <small>6 câu hỏi</small>
                    </label>
                  ))}
                </div>
              </div>
              <div className="setup-card">
                <h2>02. Sẵn sàng bắt đầu</h2>
                <label htmlFor="quiz-name">Tên người chơi</label>
                <input
                  id="quiz-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  required
                  autoComplete="name"
                  placeholder="Tên của bạn"
                />
                <fieldset>
                  <legend>Chế độ chơi</legend>
                  <label className="mode-option">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "practice"}
                      onChange={() => setMode("practice")}
                    />
                    <span>
                      <strong>Tự luyện</strong>
                      <small>
                        Không giới hạn thời gian · Giải thích sau mỗi câu
                      </small>
                    </span>
                  </label>
                  <label className="mode-option">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "challenge"}
                      onChange={() => setMode("challenge")}
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
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  <option value={10}>10 câu</option>
                  <option value={15}>15 câu</option>
                </select>
                <p role="status">
                  {available
                    ? `Lượt này: ${Math.min(count, available)} câu từ ${available} câu đã chọn.${available < count ? " Chọn thêm chủ đề để có đủ số câu mong muốn." : ""}`
                    : "Hãy chọn ít nhất một chủ đề."}
                </p>
                <button
                  className="button"
                  disabled={!name.trim() || !available}
                >
                  Bắt đầu {mode === "practice" ? "tự luyện" : "thử thách"} →
                </button>
                <p>Không cần tài khoản · 100 điểm/câu đúng</p>
              </div>
            </form>
          </>
        ) : session.finishedAt ? (
          <div className="quiz-results">
            <div className="result-banner">
              <div>
                <p className="eyebrow">
                  {session.timedOut
                    ? "ĐÃ HẾT THỜI GIAN"
                    : "HOÀN THÀNH LƯỢT CHƠI"}
                </p>
                <h1 ref={resultHeading} tabIndex={-1}>
                  Dấu ấn của {session.name}.
                </h1>
                <p>Mỗi câu trả lời là một lần kết nối lại lịch sử.</p>
              </div>
              <div className="result-score">
                {result.percentage}
                <span>% chính xác</span>
              </div>
            </div>
            <div className="result-stats">
              <div>
                <strong>
                  {result.correct}/{session.round.length}
                </strong>
                <span>Câu đúng</span>
              </div>
              <div>
                <strong>{result.points}</strong>
                <span>Tổng điểm</span>
              </div>
              <div>
                <strong>
                  {formatTime(
                    Math.round((session.finishedAt - session.startedAt) / 1000),
                  )}
                </strong>
                <span>Thời gian làm bài</span>
              </div>
              <div>
                <strong>{result.skipped}</strong>
                <span>Chưa trả lời</span>
              </div>
            </div>
            <div className="actions">
              <button className="button" onClick={() => start()}>
                Chơi lại →
              </button>
              <button
                className="outline-button"
                onClick={() => setSession(null)}
              >
                Chọn lại chủ đề
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
            {reviewWrong && result.correct === session.round.length && (
              <p>Bạn đã trả lời đúng tất cả câu hỏi!</p>
            )}
            {session.round.map(
              (q, i) =>
                (!reviewWrong || session.answers[i] !== q.correctAnswer) && (
                  <article className="review-card" key={q.id}>
                    <p className="eyebrow">
                      CÂU {i + 1} ·{" "}
                      {session.answers[i] === q.correctAnswer
                        ? "CHÍNH XÁC"
                        : session.answers[i] === null
                          ? "CHƯA TRẢ LỜI"
                          : "CẦN ÔN LẠI"}
                    </p>
                    <h3>{q.question}</h3>
                    <p>
                      Bạn chọn:{" "}
                      {session.answers[i] === null
                        ? "Chưa trả lời"
                        : `${letters[session.answers[i]]}. ${q.options[session.answers[i]]}`}
                    </p>
                    <p className="correct-answer">
                      Đáp án đúng: {letters[q.correctAnswer]}.{" "}
                      {q.options[q.correctAnswer]}
                    </p>
                    <p>{q.explanation}</p>
                    <a href={q.source.url} target="_blank" rel="noreferrer">
                      {q.source.title} ↗
                    </a>
                  </article>
                ),
            )}
          </div>
        ) : (
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
                  ◷ {formatTime(remaining)}
                </strong>
              ) : (
                <span>Không giới hạn thời gian</span>
              )}
              <button
                className="text-link"
                onClick={() => {
                  if (window.confirm("Kết thúc lượt này và xem kết quả?"))
                    setSession({
                      ...session,
                      finishedAt: Math.min(
                        Date.now(),
                        session.deadline || Infinity,
                      ),
                    });
                }}
              >
                Kết thúc lượt
              </button>
            </div>
            <div className="progress-copy">
              <span>
                Câu {session.index + 1} / {session.round.length}
              </span>
              <span>Đã làm {result.answered} câu</span>
            </div>
            <progress
              value={result.answered}
              max={session.round.length}
              aria-label="Tiến độ bài làm"
            />
            <article className="question-card">
              <p className="eyebrow">
                {topics.find((t) => t.id === current.topic)?.title}
              </p>
              <h1 ref={questionHeading} tabIndex={-1}>
                {current.question}
              </h1>
              <fieldset className="answer-options" disabled={confirmed}>
                <legend className="sr-only">Chọn một đáp án</legend>
                {current.options.map((option, i) => (
                  <label
                    key={option}
                    className={`answer-option ${choice === i ? "selected" : ""} ${confirmed && i === current.correctAnswer ? "correct" : ""} ${confirmed && choice === i && i !== current.correctAnswer ? "incorrect" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`answer-${current.id}`}
                      checked={choice === i}
                      onChange={() => setChoice(i)}
                    />
                    <span className="answer-letter">{letters[i]}</span>
                    <span>{option}</span>
                    {confirmed && i === current.correctAnswer && (
                      <strong>✓</strong>
                    )}
                  </label>
                ))}
              </fieldset>
              {confirmed && (
                <div className="answer-explanation" role="status">
                  <strong>
                    {choice === current.correctAnswer
                      ? "Chính xác!"
                      : "Cùng ghi nhớ lại."}
                  </strong>
                  <p>
                    Đáp án: {letters[current.correctAnswer]}.{" "}
                    {current.explanation}
                  </p>
                  <a href={current.source.url} target="_blank" rel="noreferrer">
                    {current.source.title} ↗
                  </a>
                </div>
              )}
              <div className="question-actions">
                <span>
                  {session.mode === "practice"
                    ? "Chọn đáp án rồi xác nhận để xem lời giải."
                    : "Đáp án và lời giải sẽ xuất hiện khi kết thúc."}
                </span>
                {confirmed ? (
                  <button
                    className="button"
                    onClick={() => {
                      if (session.index === session.round.length - 1)
                        setSession({ ...session, finishedAt: Date.now() });
                      else {
                        setSession({ ...session, index: session.index + 1 });
                        setChoice(null);
                      }
                    }}
                  >
                    {session.index === session.round.length - 1
                      ? "Xem kết quả"
                      : "Câu tiếp theo"}{" "}
                    →
                  </button>
                ) : (
                  <button
                    className="button"
                    disabled={choice === null}
                    onClick={submit}
                  >
                    Xác nhận đáp án →
                  </button>
                )}
              </div>
            </article>
          </div>
        )}
      </section>
    </Layout>
  );
}
