import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { QuizError } from "./quizService.js";

export function createQuizHandler({
  service,
  store,
  secret,
  development = false,
}) {
  if (!secret || secret.length < 32)
    throw new Error("QUIZ_SESSION_SECRET must contain at least 32 characters");
  const cookieName = development ? "vnr_quiz_actor" : "__Host-vnr_quiz_actor";
  const sign = (text) =>
    createHmac("sha256", secret).update(text).digest("base64url");
  function actorCookie(req, res) {
    const cookies = String(req.headers.cookie || "")
      .split(";")
      .map((v) => v.trim());
    const value = cookies
      .find((v) => v.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (value) {
      const [actor, expiry, signature] = value.split(".");
      const expected = sign(`${actor}.${expiry}`);
      if (
        /^[a-f0-9-]{36}$/.test(actor) &&
        Number(expiry) > Date.now() &&
        /^[A-Za-z0-9_-]{43}$/.test(signature || "") &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      )
        return actor;
    }
    const actor = randomUUID();
    const payload = `${actor}.${Date.now() + 48 * 60 * 60 * 1000}`;
    res.setHeader(
      "Set-Cookie",
      `${cookieName}=${payload}.${sign(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=172800${development ? "" : "; Secure"}`,
    );
    return actor;
  }
  return async function quizHandler(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Vary", "Cookie");
    const send = (status, body) => {
      res.statusCode = status;
      res.end(JSON.stringify(body));
    };
    try {
      if (!["GET", "POST"].includes(req.method)) {
        res.setHeader("Allow", "GET, POST");
        throw new QuizError(
          405,
          "METHOD_NOT_ALLOWED",
          "Phương thức không được hỗ trợ.",
        );
      }
      const host = req.headers.host;
      if (req.method === "POST") {
        const origin = req.headers.origin;
        let validOrigin = false;
        try {
          const parsed = new URL(origin);
          validOrigin =
            parsed.host === host &&
            (development || parsed.protocol === "https:");
        } catch {
          /* No same-origin request. */
        }
        if (!validOrigin || req.headers["sec-fetch-site"] === "cross-site")
          throw new QuizError(
            403,
            "ORIGIN_REJECTED",
            "Yêu cầu phải được gửi từ website Quiz.",
          );
        if (!String(req.headers["content-type"]).startsWith("application/json"))
          throw new QuizError(415, "JSON_REQUIRED", "Yêu cầu phải dùng JSON.");
      }
      const actor = actorCookie(req, res);
      const remote = String(
        req.headers["x-vercel-forwarded-for"] ||
          req.socket?.remoteAddress ||
          "unknown",
      );
      const ipBucket = sign(remote).slice(0, 20);
      if (!(await store.limit(`ip:${ipBucket}`, 1200, 60)))
        throw new QuizError(
          429,
          "RATE_LIMIT",
          "Có quá nhiều yêu cầu. Vui lòng chờ một phút.",
        );
      if (!(await store.limit(`actor:${actor}`, 120, 60)))
        throw new QuizError(
          429,
          "RATE_LIMIT",
          "Thao tác quá nhanh. Vui lòng chờ một phút.",
        );
      if (req.method === "GET")
        return send(200, { ...service.catalog(), development });
      let input;
      if (req.body !== undefined) {
        const raw =
          typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        if (Buffer.byteLength(raw) > 16384)
          throw new QuizError(
            413,
            "BODY_TOO_LARGE",
            "Dữ liệu yêu cầu quá lớn.",
          );
        input = JSON.parse(raw);
      } else {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 16384)
            throw new QuizError(
              413,
              "BODY_TOO_LARGE",
              "Dữ liệu yêu cầu quá lớn.",
            );
        }
        input = JSON.parse(raw);
      }
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw new QuizError(
          400,
          "INVALID_BODY",
          "Dữ liệu yêu cầu không hợp lệ.",
        );
      const actions = [
        "start",
        "active",
        "resume",
        "status",
        "answer",
        "next",
        "finish",
        "focus",
      ];
      if (!actions.includes(input.action))
        throw new QuizError(400, "INVALID_ACTION", "Thao tác không hợp lệ.");
      if (
        input.action === "start" &&
        !(await store.limit(`start:${actor}`, 20, 3600))
      )
        throw new QuizError(
          429,
          "START_LIMIT",
          "Bạn đã tạo nhiều lượt. Hãy quay lại sau.",
        );
      const state =
        input.action === "start"
          ? await service.start(actor, input)
          : input.action === "active"
            ? await service.active(actor, input.clientId)
            : await service.act(actor, input.action, input);
      return send(200, { state, development });
    } catch (error) {
      const known = error instanceof QuizError;
      return send(
        known ? error.status : error instanceof SyntaxError ? 400 : 503,
        {
          error: {
            code: known
              ? error.code
              : error instanceof SyntaxError
                ? "INVALID_JSON"
                : "QUIZ_UNAVAILABLE",
            message: known
              ? error.message
              : error instanceof SyntaxError
                ? "JSON không hợp lệ."
                : "Máy chủ Quiz chưa sẵn sàng. Vui lòng thử lại hoặc báo người quản trị.",
          },
        },
      );
    }
  };
}
