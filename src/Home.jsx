import { Link } from "react-router-dom";
import Layout from "./Layout";
import { locations, timeline } from "./data/history";
import LocationCard from "./LocationCard";

export default function Home() {
  return (
    <Layout>
      <section className="history-hero page-width">
        <div className="hero-copy">
          <p className="eyebrow">
            CHỦ ĐỀ 05 <span /> VIỆT NAM 1975–1986
          </p>
          <h1>
            Từ thống nhất
            <br />
            đến bước ngoặt
            <br />
            <em>Đổi mới.</em>
          </h1>
          <p className="hero-lead">
            Một hành trình nhìn lại những lựa chọn làm nên lịch sử. Khám phá địa
            điểm, kết nối sự kiện và ghi nhớ bằng trải nghiệm.
          </p>
          <div className="actions">
            <Link className="button" to="/explore">
              Bắt đầu khám phá <span>↗</span>
            </Link>
            <Link className="text-link" to="/quiz">
              Thử sức với Quiz →
            </Link>
          </div>
          <div className="hero-footnote">
            <span>01 / KHÁM PHÁ</span>
            <span>02 / KẾT NỐI</span>
            <span>03 / GHI NHỚ</span>
          </div>
        </div>
        <figure className="hero-photo">
          <img
            src="/history/palace.jpg"
            alt="Xe tăng trưng bày trong khuôn viên Dinh Độc Lập, ảnh chụp năm 2013"
            fetchPriority="high"
          />
          <div className="hero-date">
            1975<span>Khởi đầu một chương mới</span>
          </div>
          <figcaption>
            <span>DINH ĐỘC LẬP · TP. HỒ CHÍ MINH</span>
            <a href={locations[0].credit.url} target="_blank" rel="noreferrer">
              Ảnh chụp năm 2013: Clay Gilliland · CC BY-SA 2.0 ↗
            </a>
          </figcaption>
        </figure>
      </section>
      <section className="timeline-section">
        <div className="page-width">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DÒNG CHẢY LỊCH SỬ</p>
              <h2>Mười một năm. Những bước ngoặt.</h2>
            </div>
            <span className="section-aside">1975 — 1986</span>
          </div>
          <ol className="history-timeline">
            {timeline.map((item) => (
              <li key={item.year}>
                <a href={item.source.url} target="_blank" rel="noreferrer">
                  <strong>{item.year}</strong>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <span>Đọc tư liệu ↗</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="page-width section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NHỮNG ĐỊA ĐIỂM KỂ CHUYỆN</p>
            <h2>Lịch sử có một tọa độ.</h2>
          </div>
          <Link className="text-link" to="/explore">
            Xem tất cả địa điểm →
          </Link>
        </div>
        <div className="location-grid home-locations">
          {locations.slice(0, 2).map((site, index) => (
            <LocationCard key={site.id} site={site} index={index} />
          ))}
        </div>
      </section>
      <section className="learning-section page-width">
        <div>
          <p className="eyebrow">TỪ KHÁM PHÁ ĐẾN GHI NHỚ</p>
          <h2>
            Bạn nhớ được
            <br />
            <em>bao nhiêu dấu mốc?</em>
          </h2>
          <p>
            Kiểm tra kiến thức của riêng mình hoặc cùng cả lớp kết nối những từ
            khóa lịch sử.
          </p>
        </div>
        <Link className="activity-card" to="/quiz">
          <span className="activity-symbol">?</span>
          <small>01 / TỰ HỌC</small>
          <h3>
            Quiz lịch sử <span>↗</span>
          </h3>
          <p>
            36 câu hỏi · 6 chủ đề
            <br />
            Tự luyện hoặc thử thách tính giờ
          </p>
        </Link>
        <Link className="activity-card bingo-activity" to="/bingo">
          <span className="activity-symbol">▦</span>
          <small>02 / CÙNG LỚP</small>
          <h3>
            Bingo 5 × 5 <span>↗</span>
          </h3>
          <p>
            Xếp thẻ · Kết nối từ khóa
            <br />
            Cùng trọng tài chinh phục bảng Bingo
          </p>
        </Link>
      </section>
    </Layout>
  );
}
