export class QuizApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export async function quizRequest(input, signal) {
  let response;
  try {
    response = await fetch("/api/quiz", {
      method: input ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: input ? { "Content-Type": "application/json" } : {},
      ...(input ? { body: JSON.stringify(input) } : {}),
      signal: signal || AbortSignal.timeout(12000),
    });
  } catch {
    throw new QuizApiError(
      "NETWORK_ERROR",
      "Mất kết nối với máy chủ. Đáp án có thể chưa được lưu; hãy đồng bộ bài làm trước khi thử lại.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new QuizApiError(
      "INVALID_RESPONSE",
      "Không kết nối được API Quiz. Hãy chạy npm run dev hoặc kiểm tra cấu hình Vercel.",
    );
  }
  if (!response.ok)
    throw new QuizApiError(
      data.error?.code,
      data.error?.message || "Không thể đồng bộ bài làm.",
    );
  return data;
}

// Monotonic elapsed time survives a backwards wall-clock change. Wall time covers Windows sleep.
export function estimateServerNow(anchor, wallNow, monotonicNow) {
  if (!anchor) return 0;
  return (
    anchor.serverNow +
    Math.max(0, wallNow - anchor.wallNow, monotonicNow - anchor.monotonicNow)
  );
}

export function secondsRemaining(deadline, serverNow) {
  return deadline
    ? Math.max(0, Math.ceil((deadline - serverNow) / 1000))
    : null;
}

export function readStoredSettings() {
  try {
    return (
      JSON.parse(localStorage.getItem("vnr202.quiz.settings") || "{}") || {}
    );
  } catch {
    return {};
  }
}

export function exportQuizResult(session) {
  const safe = (value) =>
    `"${String(value ?? "")
      .replaceAll('"', '""')
      .replace(/^[\s\uFEFF]*[=+@-]/, "'$&")}"`;
  const rows = [
    ["Tên", session.name],
    ["Điểm", session.result.points],
    ["Đúng", session.result.correct],
    ["Tổng câu", session.total],
    ["Thời gian (giây)", session.result.elapsedSeconds],
    ["Lần ghi nhận rời tab", session.focusLosses],
    [],
    [
      "Câu",
      "Câu hỏi",
      "Bạn chọn",
      "Đáp án đúng",
      "Kết quả",
      "Giải thích",
      "Nguồn",
    ],
  ];
  session.result.review.forEach((q, i) =>
    rows.push([
      i + 1,
      q.question,
      q.options.find((o) => o.id === q.selectedOptionId)?.text ||
        "Chưa trả lời",
      q.options.find((o) => o.id === q.correctOptionId)?.text,
      q.correct ? "Đúng" : "Sai / chưa làm",
      q.explanation,
      q.source.url,
    ]),
  );
  const url = URL.createObjectURL(
    new Blob(
      ["\ufeff" + rows.map((row) => row.map(safe).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `vnr202-quiz-${session.id}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
