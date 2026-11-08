import { createHash } from "node:crypto";
import { QuizError } from "./quizError.js";

export const importBodyLimit = 256 * 1024;

export function questionKey({ topic, question }) {
  const normalized = question.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
  return createHash("sha256").update(JSON.stringify([topic, normalized])).digest("hex");
}

export function parseQuizImport(rows, topics) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100)
    throw new QuizError(400, "INVALID_IMPORT", "Tệp phải chứa mảng từ 1 đến 100 câu hỏi.");

  return rows.map((row, index) => {
    const invalid = (message) => {
      throw new QuizError(400, "INVALID_IMPORT", `Câu ${index + 1}: ${message}`);
    };
    const read = (value, field, max) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed || trimmed.length > max)
        invalid(`${field} phải có từ 1 đến ${max} ký tự.`);
      return trimmed;
    };
    const { topic, question, options, answer, explanation, source, study } = row ?? {};
    if (!topics.some(({ id }) => id === topic))
      invalid("Mã chủ đề không hợp lệ.");
    if (!Array.isArray(options) || options.length !== 4)
      invalid("Cần đúng 4 phương án.");
    const choices = options.map((option) => read(option, "Phương án", 300));
    if (new Set(choices.map((choice) => choice.normalize("NFC").toLowerCase())).size !== 4)
      invalid("Các phương án phải khác nhau.");
    const correctAnswer = ["A", "B", "C", "D"].indexOf(
      typeof answer === "string" ? answer.trim().toUpperCase() : answer,
    );
    if (correctAnswer < 0) invalid("Đáp án phải là A, B, C hoặc D.");

    let citation = null;
    if (source != null) {
      const title = read(source.title, "Tên nguồn", 200);
      const url = read(source.url, "Địa chỉ nguồn", 500);
      const parsed = URL.parse(url);
      if (!parsed || !["http:", "https:"].includes(parsed.protocol))
        invalid("Địa chỉ nguồn phải là URL HTTP hoặc HTTPS.");
      citation = { title, url: parsed.href };
    }
    const metadata = study == null ? null : {
      code: read(study.code, "Mã câu", 32),
      group: read(study.group, "Nhóm nội dung", 200),
    };
    return {
      topic,
      question: read(question, "Câu hỏi", 500),
      options: choices,
      correctAnswer,
      explanation: read(explanation, "Lời giải", 1000),
      source: citation,
      ...(metadata && { study: metadata }),
    };
  });
}
