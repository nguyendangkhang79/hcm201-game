import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { bingoWords } from "./data/bingo";

export default function Bingo() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  return (
    <Layout>
      <section className="page-width section-space bingo-entry">
        <div>
          <p className="eyebrow">HỌC TẬP CÙNG LỚP / BINGO 5 × 5</p>
          <h1 className="page-title">
            Kết nối từ khóa.
            <br />
            <em>Chạm mốc Bingo.</em>
          </h1>
          <p className="page-intro">
            Ôn tập Chủ đề 5 qua các sự kiện, văn kiện và khái niệm lịch sử Đảng.
          </p>
          <ol className="bingo-guide">
            <li>
              <strong>01</strong>
              <span>
                Xếp đủ 25 từ khóa vào bảng bằng kéo thả, chọn & chạm hoặc tự
                động xếp.
              </span>
            </li>
            <li>
              <strong>02</strong>
              <span>Xác nhận sẵn sàng và chờ trọng tài bắt đầu ván.</span>
            </li>
            <li>
              <strong>03</strong>
              <span>
                Đánh dấu từ đã được công bố. Đủ 5 ô ngang, dọc hoặc chéo để
                Bingo.
              </span>
            </li>
          </ol>
          <p className="site-note">
            {bingoWords.length} từ khóa VNR202 · Phòng chung dành cho lớp đang
            học.
          </p>
        </div>
        <form
          className="setup-card"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim())
              navigate("/play", { state: { playerName: name.trim() } });
          }}
        >
          <p className="eyebrow">SẴN SÀNG THAM GIA?</p>
          <h2>Vào phòng Bingo</h2>
          <label htmlFor="bingo-name">Tên người chơi</label>
          <input
            id="bingo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={30}
            autoComplete="name"
            placeholder="Tên của bạn"
          />
          <button className="button" disabled={!name.trim()}>
            Vào phòng chơi →
          </button>
          <p>Không cần tài khoản. Phòng chơi cần kết nối mạng.</p>
          <div className="card-actions">
            <Link to="/admin">Dành cho trọng tài ↗</Link>
            <Link to="/live">Theo dõi phòng ↗</Link>
          </div>
        </form>
      </section>
    </Layout>
  );
}
