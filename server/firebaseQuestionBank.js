import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { QuizError } from "./quizError.js";

export function createFirebaseQuestionBank(env) {
  let ref;
  let checkedUntil = 0;
  async function bankRef() {
    const url = env.QUIZ_FIREBASE_DATABASE_URL;
    const credentials = env.QUIZ_FIREBASE_SERVICE_ACCOUNT;
    if (!url || !credentials)
      throw new QuizError(503, "BANK_NOT_CONFIGURED", "Chưa cấu hình Firebase cho ngân hàng câu hỏi.");
    const database = new URL(url);
    if (
      database.protocol !== "https:" ||
      !/\.(firebaseio\.com|firebasedatabase\.app)$/.test(database.hostname) ||
      database.pathname !== "/" || database.search || database.hash
    )
      throw new QuizError(503, "BANK_NOT_CONFIGURED", "Địa chỉ Firebase Realtime Database không hợp lệ.");
    if (Date.now() >= checkedUntil) {
      // Refuse access until the deployed rules prevent anonymous access.
      const response = await fetch(new URL("/quizBank.json?shallow=true", database), {
        signal: AbortSignal.timeout(5000),
      });
      if (response.status !== 401 && response.status !== 403)
        throw new QuizError(503, "BANK_RULES_REQUIRED", "Hãy triển khai Firebase Rules bảo vệ quizBank trước khi sử dụng.");
      checkedUntil = Date.now() + 60_000;
    }
    if (!ref) {
      const name = "vnr202-quiz-bank";
      const app = getApps().find((item) => item.name === name) ?? initializeApp({
        credential: cert(JSON.parse(credentials)),
        databaseURL: database.origin,
        databaseAuthVariableOverride: { uid: "vnr202-quiz-server" },
      }, name);
      ref = getDatabase(app).ref("quizBank");
    }
    return ref;
  }

  return {
    async read() {
      const snapshot = await (await bankRef()).get();
      return snapshot.val() ?? {};
    },
    async transact(change) {
      let result;
      const transaction = await (await bankRef()).transaction((value) => {
        const next = change(value ?? {});
        result = next.result;
        // Return the current value on a no-op so Firebase can retry if its
        // initial local snapshot was empty or stale.
        return next.questions ?? value;
      }, undefined, false);
      if (!transaction.committed) throw new Error("Quiz bank transaction aborted");
      return result;
    },
  };
}
