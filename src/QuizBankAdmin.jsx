import { useEffect, useRef, useState } from "react";
import { topics } from "./data/quiz.js";
import { quizRequest } from "./quizClient.js";

const letters = ["A", "B", "C", "D"];

function searchableText(value) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("đ", "d")
    .trim()
    .replace(/\s+/gu, " ");
}

const emptyQuestion = {
  topic: topics[0].id,
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
};

const template = JSON.stringify([{
  topic: topics[0].id,
  question: "Điền câu hỏi của bạn",
  options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
  answer: "A",
  explanation: "Điền lời giải của bạn",
}], null, 2);

function QuestionEditor({ item, onSave, onCancel }) {
  const heading = useRef(null);
  useEffect(() => heading.current?.focus(), []);

  function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = fields.get("sourceTitle").trim();
    const url = fields.get("sourceUrl").trim();
    onSave({
      topic: fields.get("topic"),
      question: fields.get("question"),
      options: letters.map((letter) => fields.get(letter)),
      answer: fields.get("answer"),
      explanation: fields.get("explanation"),
      source: title || url ? { title, url } : null,
    });
  }

  return (
    <form onSubmit={submit} className="admin-quiz-editor">
      <h3 ref={heading} tabIndex={-1}>{item.id ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h3>
      <label>Chủ đề
        <select className="admin-input" name="topic" defaultValue={item.topic}>
          {topics.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
        </select>
      </label>
      <label>Câu hỏi
        <textarea className="admin-input" name="question" defaultValue={item.question} maxLength={500} required />
      </label>
      {letters.map((letter, index) => (
        <label key={letter}>Phương án {letter}
          <input className="admin-input" name={letter} defaultValue={item.options[index]} maxLength={300} required />
        </label>
      ))}
      <label>Đáp án đúng
        <select className="admin-input" name="answer" defaultValue={letters[item.correctAnswer]}>
          {letters.map((letter) => <option key={letter}>{letter}</option>)}
        </select>
      </label>
      <label>Lời giải
        <textarea className="admin-input" name="explanation" defaultValue={item.explanation} maxLength={1000} required />
      </label>
      <label>Tên nguồn (tùy chọn)
        <input className="admin-input" name="sourceTitle" defaultValue={item.source?.title} maxLength={200} />
      </label>
      <label>URL nguồn (tùy chọn)
        <input className="admin-input" name="sourceUrl" type="url" defaultValue={item.source?.url} maxLength={500} />
      </label>
      <div className="admin-quiz-actions">
        <button className="admin-button admin-button-primary" type="submit">Lưu câu hỏi</button>
        <button className="admin-button" type="button" onClick={onCancel}>Hủy</button>
      </div>
    </form>
  );
}

export default function QuizBankAdmin() {
  const [key, setKey] = useState("");
  const [questions, setQuestions] = useState(null);
  const [topic, setTopic] = useState("");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  async function run(input, success) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await quizRequest(input, undefined, key.trim());
      if (input.action === "bank-list") {
        setQuestions(result.questions);
        setEditor(null);
        return;
      }
      success?.(result);
      try {
        const refreshed = await quizRequest({ action: "bank-list" }, undefined, key.trim());
        setQuestions(refreshed.questions);
      } catch {
        setQuestions(null);
        setNotice({ error: true, message: "Đã lưu thay đổi. Hãy mở lại ngân hàng để tải danh sách." });
      }
    } catch (error) {
      setNotice({ error: true, message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function importFile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("questions");
    if (!file?.size || file.size > 256 * 1024) {
      setNotice({ error: true, message: "Chọn tệp JSON có dung lượng từ 1 byte đến 256 KB." });
      return;
    }
    let rows;
    try {
      rows = JSON.parse(await file.text());
    } catch {
      setNotice({ error: true, message: "Không đọc được tệp JSON. Hãy kiểm tra cú pháp." });
      return;
    }
    await run({ action: "import", questions: rows }, ({ added, skipped }) => {
      form.reset();
      setNotice({ message: `Đã thêm ${added} câu, bỏ qua ${skipped} câu trùng.` });
    });
  }

  function save(question) {
    const input = editor.id
      ? { action: "bank-edit", id: editor.id, revision: editor.revision, question }
      : { action: "import", questions: [question] };
    run(input, (result) => {
      if (result.skipped) {
        setNotice({ error: true, message: "Đã có câu hỏi trùng trong chủ đề này." });
        return;
      }
      setEditor(null);
      setNotice({ message: "Đã lưu câu hỏi." });
    });
  }

  const query = searchableText(search);
  const visible = questions?.filter((item) =>
    (!topic || item.topic === topic) &&
    (!query || [item.question, ...item.options].some((text) => searchableText(text).includes(query))),
  ) ?? [];
  const topicNames = Object.fromEntries(topics.map(({ id, title }) => [id, title]));

  return (
    <section className="admin-panel admin-quiz-import" aria-labelledby="quiz-bank-heading">
      <div className="admin-panel-heading">
        <div>
          <h2 id="quiz-bank-heading">Ngân hàng câu hỏi ôn tập</h2>
          <p>Thêm, sửa, ẩn hoặc xóa câu hỏi lưu trong Firebase.</p>
        </div>
      </div>
      {questions === null ? (
        <form onSubmit={(event) => { event.preventDefault(); run({ action: "bank-list" }); }}>
          <fieldset disabled={busy} className="admin-quiz-import-fields">
            <label className="admin-field-label" htmlFor="quiz-bank-key">Khóa quản lý Quiz</label>
            <input className="admin-input" id="quiz-bank-key" type="password" autoComplete="off" minLength={32} required value={key} onChange={(event) => setKey(event.target.value)} />
            <button className="admin-button admin-button-primary" type="submit">Mở ngân hàng</button>
          </fieldset>
        </form>
      ) : (
        <fieldset disabled={busy} className="admin-quiz-bank-fields">
          <div className="admin-quiz-actions">
            <button className="admin-button admin-button-primary" type="button" onClick={() => setEditor(emptyQuestion)}>Thêm câu hỏi</button>
            <button className="admin-button" type="button" onClick={() => run({ action: "bank-list" })}>Tải lại</button>
            <button className="admin-button" type="button" onClick={() => { setQuestions(null); setKey(""); setEditor(null); setNotice(null); }}>Khóa ngân hàng</button>
          </div>
          {editor && <QuestionEditor key={editor.id ?? "new"} item={editor} onSave={save} onCancel={() => setEditor(null)} />}
          <details>
            <summary>Nhập nhiều câu từ JSON</summary>
            <p className="admin-field-hint">Tối đa 100 câu mỗi tệp. Mã chủ đề: {topics.map(({ id }) => id).join(", ")}.</p>
            <a download="quiz-mau.json" href={`data:application/json;charset=utf-8,${encodeURIComponent(template)}`}>Tải tệp mẫu JSON</a>
            <form className="admin-quiz-import-fields" onSubmit={importFile}>
              <label className="admin-field-label" htmlFor="quiz-import-file">Tệp câu hỏi</label>
              <input className="admin-input" id="quiz-import-file" name="questions" type="file" accept=".json,application/json" required />
              <button className="admin-button admin-button-primary" type="submit">Nhập câu hỏi</button>
            </form>
            <p className="admin-field-hint">Nếu đã nhập câu ở phiên bản dùng Redis, bạn có thể chuyển chúng sang Firebase.</p>
            <button className="admin-button" type="button" onClick={() => run({ action: "bank-migrate" }, ({ added, skipped }) => {
              setNotice({ message: `Đã chuyển ${added} câu, bỏ qua ${skipped} câu trùng.` });
            })}>Chuyển câu đã nhập từ Redis</button>
          </details>
          <label className="admin-field-label">Tìm câu hỏi
            <input
              className="admin-input"
              type="search"
              placeholder="Nhập một phần câu hỏi hoặc phương án"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="admin-field-label">Lọc theo chủ đề
            <select className="admin-input" value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="">Tất cả chủ đề</option>
              {topics.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
            </select>
          </label>
          <p>{visible.length} câu hiển thị · {questions.filter((item) => item.enabled).length} câu đang bật</p>
          {visible.length === 0 && (
            <p>{query || topic ? "Không tìm thấy câu hỏi phù hợp." : "Ngân hàng chưa có câu hỏi."}</p>
          )}
          <ul className="admin-quiz-bank-list">
            {visible.map((item) => (
              <li key={item.id}>
                <small>{topicNames[item.topic]} · {item.enabled ? "Đang bật" : "Đã ẩn"}</small>
                <p>{item.question}</p>
                <div className="admin-quiz-actions">
                  <button className="admin-button" type="button" onClick={() => setEditor(item)}>Sửa</button>
                  <button className="admin-button" type="button" onClick={() => run({
                    action: "bank-toggle", id: item.id, revision: item.revision, enabled: !item.enabled,
                  }, () => { setEditor(null); setNotice({ message: item.enabled ? "Đã ẩn câu hỏi." : "Đã bật câu hỏi." }); })}>
                    {item.enabled ? "Ẩn" : "Bật lại"}
                  </button>
                  <button className="admin-button admin-button-delete" type="button" onClick={() => {
                    if (window.confirm(`Xóa vĩnh viễn câu hỏi này?\n${item.question}`))
                      run({ action: "bank-delete", id: item.id, revision: item.revision }, () => {
                        setEditor(null);
                        setNotice({ message: "Đã xóa câu hỏi." });
                      });
                  }}>Xóa</button>
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      {busy && <p role="status">Đang đồng bộ ngân hàng câu hỏi…</p>}
      {notice && <p role={notice.error ? "alert" : "status"}>{notice.message}</p>}
    </section>
  );
}
