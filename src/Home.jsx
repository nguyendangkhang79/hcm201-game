import { Link } from "react-router-dom";
import Layout from "./Layout";
import { locations } from "./data/history";
import CongressTimeline from "./CongressTimeline";
import LocationCard from "./LocationCard";

const palace = locations.find(({ id }) => id === "thong-nhat");

export default function Home() {
  return (
    <Layout>
      <div className="hero-backdrop">
        <section className="history-hero page-width">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> VNR202 · LỊCH SỬ ĐẢNG CỘNG SẢN VIỆT NAM
            </p>
            <h1>
              Dấu ấn lịch sử Đảng
              <br />
              <em>qua 13 kỳ Đại hội.</em>
            </h1>
            <p className="hero-lead">
              Cuộn qua các kỳ Đại hội từ 1935 đến 2021, rồi ghé những di tích
              gắn với hành trình giành độc lập, kháng chiến và thống nhất.
            </p>
            <div className="hero-actions">
              <a className="hero-action hero-action-primary" href="#dong-thoi-gian">
                <span>Xem dòng thời gian</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 5v14m-5-5 5 5 5-5" />
                </svg>
              </a>
              <Link className="hero-action hero-action-secondary" to="/explore">
                <span>Tham quan di tích</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M5 12h14m-5-5 5 5-5 5" />
                </svg>
              </Link>
            </div>
          </div>
          <figure className="hero-photo">
            <div className="hero-image">
              <img
                src={palace.image}
                alt="Xe tăng trưng bày trong khuôn viên Dinh Độc Lập, ảnh chụp năm 2013"
                fetchPriority="high"
              />
              <span className="hero-date">MỐC LỊCH SỬ <strong>1975</strong></span>
            </div>
            <figcaption>
              <span>DINH ĐỘC LẬP · TP. HỒ CHÍ MINH</span>
              <a href={palace.credit.url} target="_blank" rel="noreferrer">
                Ảnh chụp năm 2013: Clay Gilliland · CC BY-SA 2.0 ↗
              </a>
            </figcaption>
          </figure>
        </section>
      </div>
      <CongressTimeline />
      <section className="home-places page-width section-space" aria-labelledby="places-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> 02 / THAM QUAN</p>
            <h2 id="places-title">Di tích và tour 3D</h2>
          </div>
          <Link className="text-link" to="/explore">
            Xem tất cả địa điểm →
          </Link>
        </div>
        <div className="location-grid home-locations">
          {["pac-bo", "tan-trao", "dinh-hoa", "thong-nhat"].map((id, index) => (
            <LocationCard key={id} site={locations.find((site) => site.id === id)} index={index} compact />
          ))}
        </div>
      </section>
      <div className="home-learning">
        <section className="learning-section page-width" aria-labelledby="learning-title">
          <header className="learning-heading">
            <div>
              <p className="eyebrow"><span /> TỪ KHÁM PHÁ ĐẾN GHI NHỚ</p>
              <h2 id="learning-title">Bạn nhớ được bao nhiêu dấu mốc?</h2>
            </div>
            <p>
              Kiểm tra kiến thức của riêng mình hoặc cùng cả lớp kết nối những từ
              khóa lịch sử.
            </p>
          </header>
          <Link className="activity-card" to="/quiz">
            <span className="activity-symbol" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <path d="m8 9 1.5 1.5L12 8m2 2h2m-8 5h8m-8 3h5" />
              </svg>
            </span>
            <div className="activity-copy">
              <small>01 / TỰ HỌC</small>
              <h3>Quiz lịch sử</h3>
              <p>Ôn tập 6 chủ đề lịch sử và xem lời giải.</p>
            </div>
            <span className="activity-arrow" aria-hidden="true">↗</span>
          </Link>
          <Link className="activity-card" to="/bingo">
            <span className="activity-symbol" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                <path d="m10.5 12 1 1 2-2" />
              </svg>
            </span>
            <div className="activity-copy">
              <small>02 / CÙNG LỚP</small>
              <h3>Bingo 5 × 5</h3>
              <p>Kết nối từ khóa giai đoạn 1975–1986 trong phòng chơi cùng lớp.</p>
            </div>
            <span className="activity-arrow" aria-hidden="true">↗</span>
          </Link>
        </section>
      </div>
    </Layout>
  );
}
