import { questions, topics } from "../server/questionBank.js";
import { createQuizService } from "../server/quizService.js";
import { createRedisStore } from "../server/quizStore.js";
import { createQuizHandler } from "../server/quizHttp.js";

let handler;
export default async function quiz(req, res) {
  try {
    if (!handler) {
      const store = createRedisStore({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      handler = createQuizHandler({
        service: createQuizService({ store, bank: questions, topics }),
        store,
        secret: process.env.QUIZ_SESSION_SECRET,
      });
    }
    return await handler(req, res);
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify({
        error: {
          code: "QUIZ_NOT_CONFIGURED",
          message:
            "Quiz chưa được cấu hình máy chủ bảo vệ. Người quản trị cần thiết lập Redis và khóa phiên trên Vercel.",
        },
      }),
    );
  }
}
