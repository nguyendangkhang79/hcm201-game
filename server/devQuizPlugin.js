import { randomBytes } from "node:crypto";
import { createQuizHandler } from "./quizHttp.js";
import { createQuizService } from "./quizService.js";
import { createMemoryStore, createRedisStore } from "./quizStore.js";
import { questions, topics } from "./questionBank.js";

export function devQuizPlugin(env = {}) {
  return {
    name: "vnr202-development-quiz-api",
    configureServer(server) {
      const durable = Boolean(
        env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
      );
      const store = durable
        ? createRedisStore({
            url: env.UPSTASH_REDIS_REST_URL,
            token: env.UPSTASH_REDIS_REST_TOKEN,
          })
        : createMemoryStore();
      const handler = createQuizHandler({
        service: createQuizService({ store, bank: questions, topics }),
        store,
        secret: env.QUIZ_SESSION_SECRET || randomBytes(32).toString("hex"),
        development: true,
      });
      server.middlewares.use("/api/quiz", handler);
      server.middlewares.use((req, res, next) => {
        let path;
        try {
          path = decodeURIComponent(
            String(req.url || "").split("?")[0],
          ).replaceAll("\\", "/");
        } catch {
          res.statusCode = 400;
          res.end("Invalid path");
          return;
        }
        if (/\/(server|tests)\//.test(path)) {
          res.statusCode = 403;
          res.end("Private server module");
          return;
        }
        next();
      });
    },
  };
}
