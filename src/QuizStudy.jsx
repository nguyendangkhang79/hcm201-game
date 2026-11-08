import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "./Layout";
import { quizRequest } from "./quizClient.js";
import "./Quiz.css";

const letters = ["A", "B", "C", "D"];
const pageSize = 20;
const normalize = (value) => value.toLowerCase().normalize("NFD")
  .replace(/\p{M}/gu, "").replaceAll("đ", "d").trim();
const questionText = ({ question, group }) => {
  const prefix = `${group} — `;
  return group && question.startsWith(prefix) ? question.slice(prefix.length) : question;
};

function readProgress(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return { cardId: saved?.cardId ?? null, marks: saved?.marks ?? {}, query: saved?.query ?? "" };
  } catch {
    return { cardId: null, marks: {}, query: "" };
  }
}

function Explanation({ question }) {
  return (
    <div className="study-explanation">
      <p>{question.explanation}</p>
      {question.source && (
        <a href={question.source.url} target="_blank" rel="noopener noreferrer">
          {question.source.title}
        </a>
      )}
    </div>
  );
}

function QuestionList({ questions, openCard }) {
  return (
    <ol className="study-list">
      {questions.map((question, index) => (
        <li key={question.id}>
          {question.group && question.group !== questions[index - 1]?.group && (
            <h2 className="study-group">{question.group}</h2>
          )}
          <article className="study-question">
            {question.code && <span className="study-code">{question.code}</span>}
            <h3>{questionText(question)}</h3>
            <ol className="study-options">
              {question.options.map((option, optionIndex) => (
                <li key={option} className={optionIndex === question.correctAnswer ? "study-correct" : ""}>
                  <span>{letters[optionIndex]}. {option}</span>
                  {optionIndex === question.correctAnswer && <small>✓ Đáp án đúng</small>}
                </li>
              ))}
            </ol>
            <div className="study-question-actions">
              <details>
                <summary>Lời giải và nguồn</summary>
                <Explanation question={question} />
              </details>
              <button type="button" className="text-link" onClick={() => openCard(question.id)}>
                Học câu này bằng thẻ →
              </button>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}

function StudyDeck({ topicId }) {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "cards" ? "cards" : "list";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  const [revealedId, setRevealedId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const toolbarRef = useRef(null);
  const progressKey = `vnr202.quiz.study.${topicId}`;
  const [progress, setProgress] = useState(() => readProgress(progressKey));
  const query = params.get("q") ?? progress.query;

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]);
    quizRequest({ action: "study", topicId }, signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [topicId, request]);

  useEffect(() => {
    try {
      localStorage.setItem(progressKey, JSON.stringify(progress));
    } catch {
      // The study deck remains usable when browser storage is unavailable.
    }
  }, [progressKey, progress]);

  const indexedQuestions = useMemo(() => (data?.questions ?? []).map((item) => ({
    item,
    searchText: normalize([item.code, item.group, item.question, ...item.options].join(" ")),
  })), [data]);
  const questions = data?.questions ?? [];
  const search = normalize(query);
  const results = search ? indexedQuestions.filter(({ searchText }) =>
    searchText.includes(search)).map(({ item }) => item) : questions;
  const review = questions.filter(({ id }) => progress.marks[id] === "review");
  const known = questions.filter(({ id }) => progress.marks[id] === "known").length;
  const cards = needsReview ? review : questions;
  const cardIndex = Math.max(0, cards.findIndex(({ id }) => id === progress.cardId));
  const card = cards[cardIndex];
  const revealed = Boolean(card && revealedId === card.id);

  function flipCard() {
    setRevealedId(revealed ? null : card.id);
  }

  function selectCard(id) {
    setProgress((current) => ({ ...current, cardId: id }));
    setRevealedId(null);
  }

  function changeMode(nextMode) {
    setRevealedId(null);
    toolbarRef.current?.focus();
    setParams(nextMode === "cards" ? { mode: "cards" } : {});
  }

  function openCard(id) {
    setNeedsReview(false);
    selectCard(id);
    changeMode("cards");
  }

  function markCard(mark) {
    setProgress((current) => ({
      ...current,
      cardId: needsReview && mark === "known"
        ? cards[cardIndex + 1]?.id ?? cards[cardIndex - 1]?.id ?? card.id
        : card.id,
      marks: { ...current.marks, [card.id]: mark },
    }));
    if (needsReview && mark === "known") setRevealedId(null);
  }

  function setQuery(value) {
    setVisibleCount(pageSize);
    setProgress((current) => ({ ...current, query: value }));
    if (params.has("q")) setParams({}, { replace: true });
  }

  return (
    <Layout>
      <section className="page-width section-space quiz-page quiz-study">
        <header className="quiz-intro study-intro">
          <div>
            <Link className="quiz-kicker" to="/quiz">← VỀ QUIZ</Link>
            <h1 className="page-title">{data?.topic.title ?? "Ôn theo chương"}</h1>
            {data && <p className="page-intro">{data.topic.description}</p>}
          </div>
          {data && <div className="quiz-hero-index"><strong>{questions.length}</strong><span>câu hỏi</span></div>}
        </header>
        {error ? (
          <div className="quiz-error" role="alert">
            <p>{error}</p>
            <button type="button" className="outline-button" onClick={() => {
              setError("");
              setRequest((value) => value + 1);
            }}>Thử lại</button>
          </div>
        ) : !data ? (
          <p className="quiz-loading" role="status">Đang tải bộ câu hỏi…</p>
        ) : (
          <>
            <div ref={toolbarRef} className="study-toolbar study-modes" role="group" aria-label="Chế độ ôn tập" tabIndex={-1}>
              <button type="button" className="outline-button" aria-pressed={mode === "list"} onClick={() => changeMode("list")}>
                Xem câu và đáp án
              </button>
              <button type="button" className="outline-button" aria-pressed={mode === "cards"} onClick={() => changeMode("cards")}>
                Thẻ ghi nhớ
              </button>
              <Link className="text-link" to={`/quiz?topic=${topicId}`}>Làm quiz chương này →</Link>
            </div>
            {!questions.length ? (
              <p>Chương này chưa có câu hỏi đang bật.</p>
            ) : mode === "list" ? (
              <>
                <div className="study-filter">
                <label className="study-search">
                  Tìm câu hỏi
                  <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nhập từ khóa hoặc mã câu, ví dụ C1-160" />
                </label>
                <p role="status">{results.length}/{questions.length} câu</p>
                </div>
                {results.length ? <>
                  <QuestionList questions={results.slice(0, visibleCount)} openCard={openCard} />
                  {visibleCount < results.length && <div className="study-toolbar study-more">
                    <span>Đang hiện {visibleCount}/{results.length} câu</span>
                    <button type="button" className="outline-button"
                      onClick={() => setVisibleCount((count) => count + pageSize)}>Xem thêm</button>
                    <button type="button" className="text-link"
                      onClick={() => setVisibleCount(results.length)}>Hiện tất cả {results.length} câu</button>
                  </div>}
                </>
                  : <p>Không tìm thấy câu phù hợp. Hãy thử từ khóa hoặc mã khác.</p>}
              </>
            ) : (
              <>
                <div className="study-toolbar study-filter study-card-status">
                  <label>
                    <input type="checkbox" checked={needsReview} onChange={(event) => {
                      setNeedsReview(event.target.checked);
                      setRevealedId(null);
                    }} />
                    {" "}Chỉ xem thẻ cần ôn lại
                  </label>
                  <span role="status">{known} đã nhớ · {review.length} cần ôn lại</span>
                </div>
                {!card ? <p>Bạn chưa có thẻ nào cần ôn lại.</p> : (
                  <>
                    <div className={`study-card ${revealed ? "is-revealed" : ""}`} onClick={(event) => {
                      if (!event.target.closest("button, a")) flipCard();
                    }}>
                      <p className="study-code">Thẻ {cardIndex + 1}/{cards.length}{card.code && ` · ${card.code}`}</p>
                      <progress className="study-card-progress" value={cardIndex + 1} max={cards.length} aria-label="Vị trí trong bộ thẻ" />
                      <h2>{card.question}</h2>
                      <button type="button" className="outline-button" aria-expanded={revealed}
                        onClick={flipCard}>
                        {revealed ? "Ẩn đáp án" : "Lật thẻ xem đáp án"}
                      </button>
                      {revealed && (
                        <div className="study-card-answer">
                          <strong>{card.options[card.correctAnswer]}</strong>
                          <Explanation question={card} />
                          <div className="study-toolbar">
                            <button type="button" className="outline-button" aria-pressed={progress.marks[card.id] === "review"}
                              onClick={() => markCard("review")}>Cần ôn lại</button>
                            <button type="button" className="outline-button" aria-pressed={progress.marks[card.id] === "known"}
                              onClick={() => markCard("known")}>Đã nhớ</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <nav className="study-toolbar study-card-nav" aria-label="Điều hướng thẻ">
                      <button type="button" className="outline-button" disabled={cardIndex === 0}
                        onClick={() => selectCard(cards[cardIndex - 1].id)}>← Thẻ trước</button>
                      <button type="button" className="outline-button" disabled={cardIndex + 1 === cards.length}
                        onClick={() => selectCard(cards[cardIndex + 1].id)}>Thẻ sau →</button>
                      <button type="button" className="text-link" onClick={() => {
                        setQuery(card.code ?? card.question);
                        changeMode("list");
                      }}>Xem câu này trong danh sách</button>
                    </nav>
                  </>
                )}
              </>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}

export default function QuizStudy() {
  const { topicId } = useParams();
  return <StudyDeck key={topicId} topicId={topicId} />;
}
