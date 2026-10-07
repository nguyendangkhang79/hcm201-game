import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroImage from './assets/hero-ho-chi-minh.webp';
import './Home.css';

function Icon({ name }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    people: (
      <>
        <circle cx="10" cy="7" r="3" />
        <path d="M3 21v-3a7 7 0 0 1 14 0v3M16 4a3 3 0 0 1 0 6m3 4a6 6 0 0 1 3 5v2" />
      </>
    ),
    cards: (
      <>
        <rect x="7" y="3" width="13" height="18" rx="2" />
        <path d="m5 5-3 1 3 15M11 7h5M11 11h5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="7.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const steps = [
  { number: '01', icon: 'cards', label: 'Xếp thẻ' },
  { number: '02', icon: 'search', label: 'Theo dõi từ khóa' },
  { number: '03', icon: 'check', label: 'Hoàn thành Bingo' },
];

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!dialog) return undefined;

    const element = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    element.showModal();
    document.body.style.overflow = 'hidden';

    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [dialog]);

  const handleJoinRoom = (event) => {
    event.preventDefault();

    const name = playerName.trim();

    if (name) {
      navigate('/play', { state: { playerName: name } });
    }
  };

  return (
    <div className="light-home">
      <header className="home-header">
        <a
          className="home-brand"
          href="/"
          aria-label="Bingo Hồ Chí Minh - Trang chủ"
        >
          <span className="home-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" />
              <circle cx="28" cy="28" r="20" />
              <path d="m28 13 4.4 9 9.9 1.4-7.2 7 1.7 9.9-8.8-4.7-8.8 4.7 1.7-9.9-7.2-7 9.9-1.4Z" />
            </svg>
          </span>

          <span>
            <strong>BINGO HỒ CHÍ MINH</strong>
            <small>HỌC TẬP QUA TRÒ CHƠI</small>
          </span>
        </a>

        <nav className="home-nav" aria-label="Điều hướng chính">
          <button type="button" onClick={() => setDialog('intro')}>
            Giới thiệu
          </button>
          <span className="nav-divider" aria-hidden="true" />
          <button type="button" onClick={() => setDialog('help')}>
            Cách chơi
          </button>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-copy" aria-labelledby="home-title">
          <p className="topic-label">
            <span aria-hidden="true" />
            TRÒ CHƠI BINGO TƯƠNG TÁC
          </p>

          <h1 id="home-title">
            <span>Quá trình hình thành</span>
            <span>tư tưởng</span>
            <em>Hồ Chí Minh</em>
          </h1>

          <p className="home-lead">
            Khám phá những dấu mốc trong quá trình hình thành tư tưởng
            Hồ Chí Minh qua trò chơi Bingo. Kết nối từ khóa, ghi nhớ
            kiến thức và cùng lớp chinh phục thử thách.
          </p>

          <form className="join-card" onSubmit={handleJoinRoom}>
            <label htmlFor="player-name">Tên người chơi</label>

            <div className="join-row">
              <div className="home-input-wrap">
                <Icon name="user" />
                <input
                  id="player-name"
                  type="text"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Nhập tên của bạn"
                  maxLength={30}
                  autoComplete="name"
                  required
                />
              </div>

              <button
                type="submit"
                className="join-button"
                disabled={!playerName.trim()}
              >
                Vào phòng chơi
                <Icon name="arrow" />
              </button>
            </div>

            <p>
              <span className="online-dot" aria-hidden="true" />
              Không cần tài khoản · Tham gia cùng lớp
            </p>
          </form>

          <div className="home-features" aria-label="Thông tin trò chơi">
            <div>
              <strong>25</strong>
              <span>Từ khóa</span>
            </div>

            <div>
              <strong>5 × 5</strong>
              <span>Bảng Bingo</span>
            </div>

            <div>
              <Icon name="people" />
              <span>Chơi cùng lớp</span>
            </div>
          </div>
        </section>

        <figure className="topic-visual-column">
          <div className="topic-image-stage">
            <div className="topic-image-frame">
              <img
                className="topic-hero-image"
                src={heroImage}
                alt="Chân dung Chủ tịch Hồ Chí Minh, bản đồ Việt Nam và cờ đỏ sao vàng trên nền giấy cổ điển"
                width={1080}
                height={1080}
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>

          <figcaption className="topic-caption">
            Học tập · Ghi nhớ · Kết nối
          </figcaption>
        </figure>

        <ol className="topic-steps" aria-label="Các bước chơi">
          {steps.map((step) => (
            <li className="topic-step" key={step.number}>
              <strong>{step.number}</strong>
              <Icon name={step.icon} />
              <span>{step.label}</span>
            </li>
          ))}
        </ol>
      </main>

      <footer className="home-footer">
        <span>Bingo Hồ Chí Minh</span>
        <span>Học tập qua trải nghiệm</span>
      </footer>

      {dialog && (
        <dialog
          ref={dialogRef}
          className="help-modal"
          aria-labelledby="help-title"
          onCancel={() => setDialog(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const bounds = event.currentTarget.getBoundingClientRect();

              if (
                event.clientX < bounds.left ||
                event.clientX > bounds.right ||
                event.clientY < bounds.top ||
                event.clientY > bounds.bottom
              ) {
                setDialog(null);
              }
            }
          }}
        >
          <div className="help-header">
            <div>
              <p className="topic-label">
                <span aria-hidden="true" />
                {dialog === 'intro' ? 'CHỦ ĐỀ HỌC TẬP' : 'HƯỚNG DẪN'}
              </p>

              <h2 id="help-title">
                {dialog === 'intro' ? 'Bingo Hồ Chí Minh' : 'Cách chơi Bingo'}
              </h2>
            </div>

            <button
              type="button"
              className="modal-close"
              onClick={() => setDialog(null)}
              aria-label="Đóng hộp thoại"
            >
              <Icon name="close" />
            </button>
          </div>

          {dialog === 'intro' ? (
            <div className="intro-copy">
              <h3>Quá trình hình thành tư tưởng Hồ Chí Minh</h3>
              <p>
                Khám phá chủ đề qua các từ khóa và những dấu mốc được
                giới thiệu trong buổi học. Trò chơi giúp bạn ôn tập,
                ghi nhớ kiến thức và tương tác cùng lớp.
              </p>
              <p>
                Nhập tên để tham gia. Người điều khiển buổi học chuẩn bị
                bộ từ khóa và công bố từng từ trong ván chơi.
              </p>
            </div>
          ) : (
            <ol className="help-steps">
              <li>
                <span>01</span>
                <div>
                  <strong>Tham gia phòng</strong>
                  <p>Nhập tên của bạn và chọn “Vào phòng chơi”.</p>
                </div>
              </li>

              <li>
                <span>02</span>
                <div>
                  <strong>Tạo thẻ Bingo</strong>
                  <p>
                    Kéo thả hoặc chọn 25 từ khóa để điền vào bảng 5 × 5.
                  </p>
                </div>
              </li>

              <li>
                <span>03</span>
                <div>
                  <strong>Xác nhận sẵn sàng</strong>
                  <p>Kiểm tra thẻ và chờ Trọng tài bắt đầu trò chơi.</p>
                </div>
              </li>

              <li>
                <span>04</span>
                <div>
                  <strong>Đánh dấu từ khóa</strong>
                  <p>
                    Chọn các ô trùng với từ khóa được Trọng tài công bố.
                  </p>
                </div>
              </li>

              <li>
                <span>05</span>
                <div>
                  <strong>Hoàn thành Bingo</strong>
                  <p>
                    Đạt 5 ô liên tiếp theo hàng ngang, dọc hoặc chéo.
                  </p>
                </div>
              </li>
            </ol>
          )}

          <button
            type="button"
            className="help-confirm"
            onClick={() => setDialog(null)}
          >
            Đã hiểu, bắt đầu chơi
            <Icon name="arrow" />
          </button>
        </dialog>
      )}
    </div>
  );
}