import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroImage from './assets/hero-ho-chi-minh.webp';
import './Home.css';
import './HomeTours.css';

const TOURS = [
  {
    id: 'kim-lien',
    title: 'Làng Sen – Kim Liên',
    location: 'Nghệ An',
    description:
      'Khám phá quê hương Chủ tịch Hồ Chí Minh qua các không gian Làng Sen và Hoàng Trù.',
    url: 'https://langsenkimlien.hochiminh.vn/',
    image:
      'https://langsenkimlien.hochiminh.vn/KimLiendata/pano/thumb/thumb_01.jpg',
  },
  {
    id: 'chau-van-liem',
    title: 'Nhà số 5 Châu Văn Liêm',
    location: 'Thành phố Hồ Chí Minh',
    description:
      'Tìm hiểu nơi Nguyễn Tất Thành từng ở trước khi ra đi tìm đường cứu nước.',
    url: 'https://so5chauvanliem.hochiminh.vn/',
    image:
      'https://so5chauvanliem.hochiminh.vn/So5CVLdata/pano/thumb/thumb_01.jpg',
  },
  {
    id: 'ben-nha-rong',
    title: 'Bến Nhà Rồng',
    location: 'Thành phố Hồ Chí Minh',
    description:
      'Tham quan Bến Nhà Rồng và các không gian trưng bày của Bảo tàng Hồ Chí Minh.',
    url: 'https://bennharong.hochiminh.vn/',
    image:
      'https://bennharong.hochiminh.vn/BenNhaRongdata/pano/thumb/thumb_01.jpg',
  },
  {
    id: 'hang-ngang',
    title: 'Nhà số 48 Hàng Ngang',
    location: 'Hà Nội',
    description:
      'Khám phá nơi Chủ tịch Hồ Chí Minh viết Tuyên ngôn Độc lập.',
    url: 'https://48hangngang.hochiminh.vn/',
    image:
      'https://48hangngang.hochiminh.vn/48HangNgangdata/pano/thumb/thumb_01.jpg',
  },
  {
    id: 'van-phuc',
    title: 'Nhà lưu niệm tại Vạn Phúc',
    location: 'Hà Nội',
    description:
      'Tìm hiểu nơi Chủ tịch Hồ Chí Minh viết Lời kêu gọi toàn quốc kháng chiến.',
    url: 'https://vanphuc.hochiminh.vn/',
    image:
      'https://vanphuc.hochiminh.vn/VanPhucdata/pano/thumb/thumb_01.jpg',
  },
  {
    id: 'phu-chu-tich',
    title: 'Khu di tích tại Phủ Chủ tịch',
    location: 'Hà Nội',
    description:
      'Khám phá không gian gắn với đời sống và công việc của Chủ tịch Hồ Chí Minh.',
    url: 'http://phuchutich.egal.vn/',
    image:
      'https://nhasanbacho.vn/wp-content/uploads/2023/08/080814181932.png',
  },
];

const HELP_STEPS = [
  [
    'Tham gia phòng',
    'Nhập tên của bạn và chọn “Vào phòng chơi”.',
  ],
  [
    'Tạo thẻ Bingo',
    'Kéo thả hoặc chọn từ khóa để điền đủ 25 ô trên bảng 5 × 5.',
  ],
  [
    'Xác nhận sẵn sàng',
    'Kiểm tra thẻ, xác nhận sẵn sàng và chờ Trọng tài bắt đầu.',
  ],
  [
    'Đánh dấu từ khóa',
    'Chọn các ô trùng với từ khóa được Trọng tài công bố.',
  ],
  [
    'Hoàn thành Bingo',
    'Đạt 5 ô liên tiếp theo hàng ngang, hàng dọc hoặc đường chéo.',
  ],
];

function Icon({ name }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    external: (
      <>
        <path d="M14 3h7v7M21 3 10 14" />
        <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    building: (
      <path d="m3 9 9-6 9 6H3ZM5 10v9m5-9v9m4-9v9m5-9v9M3 21h18" />
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function TourCard({ tour, index }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="tour-card">
      <div className="tour-cover">
        {tour.image && !imageFailed ? (
          <img
            src={tour.image}
            alt={`Không gian tham quan ${tour.title}`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="tour-cover-fallback">
            <Icon name="building" />
            <span>{tour.title}</span>
          </div>
        )}

        <span className="tour-tag">THAM QUAN 3D</span>

        <span className="tour-number">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="tour-body">
        <p className="tour-location">
          <Icon name="pin" />
          {tour.location}
        </p>

        <h3>{tour.title}</h3>

        <p className="tour-description">{tour.description}</p>

        <a
          className="tour-link"
          href={tour.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Khám phá 3D ${tour.title}, mở trong tab mới`}
        >
          Khám phá 3D
          <Icon name="external" />
        </a>
      </div>
    </article>
  );
}

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

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
    };
  }, [dialog]);

  const handleJoinRoom = (event) => {
    event.preventDefault();

    const name = playerName.trim();

    if (name) {
      navigate('/play', {
        state: { playerName: name },
      });
    }
  };

  return (
    <div className="light-home tours-home">
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
          <button
            type="button"
            onClick={() => setDialog('intro')}
          >
            Giới thiệu
          </button>

          <a href="#di-tich-3d">Di tích 3D</a>

          <button
            type="button"
            onClick={() => setDialog('help')}
          >
            Cách chơi
          </button>

          <a className="home-nav-play" href="#tham-gia-bingo">
            Chơi Bingo
            <Icon name="arrow" />
          </a>
        </nav>
      </header>

      <main>
        <div className="home-main">
          <section
            className="home-copy"
            aria-labelledby="home-title"
          >
            <p className="topic-label">
              <span aria-hidden="true" />
              KHÁM PHÁ LỊCH SỬ · KẾT NỐI KIẾN THỨC
            </p>

            <h1 id="home-title">
              <span>Quá trình hình thành</span>
              <span>tư tưởng</span>
              <em>Hồ Chí Minh</em>
            </h1>

            <p className="home-lead">
              Theo dấu chân Người qua những địa danh lịch sử bằng
              trải nghiệm tham quan 3D. Tìm hiểu cuộc đời, sự nghiệp
              và cùng ôn tập chủ đề qua trò chơi Bingo.
            </p>

            <div className="tour-hero-actions">
              <a className="tour-primary" href="#di-tich-3d">
                Khám phá di tích 3D
                <Icon name="arrow" />
              </a>

              <a
                className="tour-secondary"
                href="#tham-gia-bingo"
              >
                Tham gia Bingo
              </a>
            </div>

            <div
              className="home-features"
              aria-label="Thông tin trải nghiệm"
            >
              <div>
                <strong>06</strong>
                <span>Địa danh lịch sử</span>
              </div>

              <div>
                <strong>3D</strong>
                <span>Tham quan trực tuyến</span>
              </div>

              <div>
                <strong>5 × 5</strong>
                <span>Thử thách Bingo</span>
              </div>
            </div>
          </section>

          <figure className="topic-visual-column">
            <div className="topic-image-stage">
              <div className="topic-image-frame">
                <img
                  className="topic-hero-image"
                  src={heroImage}
                  alt="Chân dung Chủ tịch Hồ Chí Minh trên nền minh họa lịch sử"
                  width={1080}
                  height={1080}
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </div>

            <figcaption className="topic-caption">
              Khám phá · Ghi nhớ · Kết nối
            </figcaption>
          </figure>

          <ol
            className="topic-steps"
            aria-label="Hành trình trải nghiệm"
          >
            <li className="topic-step">
              <strong>01</strong>
              <span>Khám phá di tích 3D</span>
            </li>

            <li className="topic-step">
              <strong>02</strong>
              <span>Tìm hiểu và ghi nhớ</span>
            </li>

            <li className="topic-step">
              <strong>03</strong>
              <span>Tham gia Bingo</span>
            </li>
          </ol>
        </div>

        <section
          id="di-tich-3d"
          className="tour-section"
          aria-labelledby="tours-title"
        >
          <div className="tour-section-heading">
            <div>
              <p className="topic-label">
                <span aria-hidden="true" />
                KHÔNG GIAN THAM QUAN TRỰC TUYẾN
              </p>

              <h2 id="tours-title">
                Hành trình qua những di tích
              </h2>
            </div>

            <p>
              Từ quê hương đến những dấu mốc lịch sử. Chọn một
              địa danh để bắt đầu khám phá.
            </p>
          </div>

          <div className="tour-grid">
            {TOURS.map((tour, index) => (
              <TourCard
                key={tour.id}
                tour={tour}
                index={index}
              />
            ))}
          </div>

          <p className="tour-note">
            <Icon name="external" />
            Các trải nghiệm tham quan mở trong tab mới. Quay lại
            trang này để tiếp tục chơi Bingo.
          </p>
        </section>

        <section
          id="tham-gia-bingo"
          className="bingo-section"
          aria-labelledby="bingo-title"
        >
          <div className="bingo-intro">
            <p className="topic-label">
              <span aria-hidden="true" />
              CÙNG CỦNG CỐ KIẾN THỨC
            </p>

            <h2 id="bingo-title">
              Từ trải nghiệm
              <br />
              <em>đến kiến thức</em>
            </h2>

            <p>
              Tiếp nối hành trình khám phá bằng trò chơi Bingo về
              quá trình hình thành tư tưởng Hồ Chí Minh. Nhập tên,
              xếp thẻ và tham gia cùng lớp.
            </p>

            <div
              className="bingo-details"
              aria-label="Thông tin bảng Bingo"
            >
              <span>
                <strong>5 × 5</strong>
                Bảng chơi
              </span>

              <span>
                <strong>25 ô</strong>
                Trên mỗi thẻ
              </span>

              <span>
                <strong>Cùng lớp</strong>
                Chơi tương tác
              </span>
            </div>

            <button
              className="bingo-help"
              type="button"
              onClick={() => setDialog('help')}
            >
              Xem hướng dẫn chơi
              <Icon name="arrow" />
            </button>
          </div>

          <form
            className="join-card"
            onSubmit={handleJoinRoom}
          >
            <div className="bingo-form-header">
              <span
                className="bingo-form-mark"
                aria-hidden="true"
              >
                ★
              </span>

              <div>
                <p className="bingo-form-kicker">
                  HỌC TẬP QUA TRÒ CHƠI
                </p>

                <h3>Tham gia phòng Bingo</h3>
              </div>
            </div>

            <p className="bingo-form-description">
              Nhập tên của bạn để bắt đầu xếp thẻ.
            </p>

            <label htmlFor="player-name">Tên người chơi</label>

            <div className="join-row">
              <div className="home-input-wrap">
                <Icon name="user" />

                <input
                  id="player-name"
                  type="text"
                  value={playerName}
                  onChange={(event) =>
                    setPlayerName(event.target.value)
                  }
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
              <span
                className="online-dot"
                aria-hidden="true"
              />
              Không cần tài khoản · Tham gia cùng lớp
            </p>
          </form>
        </section>
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
            if (event.target !== event.currentTarget) return;

            const bounds =
              event.currentTarget.getBoundingClientRect();

            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            ) {
              setDialog(null);
            }
          }}
        >
          <div className="help-header">
            <div>
              <p className="topic-label">
                <span aria-hidden="true" />
                {dialog === 'intro'
                  ? 'CHỦ ĐỀ HỌC TẬP'
                  : 'HƯỚNG DẪN'}
              </p>

              <h2 id="help-title">
                {dialog === 'intro'
                  ? 'Bingo Hồ Chí Minh'
                  : 'Cách chơi Bingo'}
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
              <h3>Khám phá lịch sử, kết nối kiến thức</h3>

              <p>
                Website kết hợp giới thiệu các trải nghiệm tham quan
                di tích 3D với trò chơi Bingo về quá trình hình thành
                tư tưởng Hồ Chí Minh.
              </p>

              <p>
                Các di tích cung cấp thêm bối cảnh về cuộc đời và
                sự nghiệp của Người. Nội dung ôn tập trong game do
                người điều khiển buổi học chuẩn bị và công bố.
              </p>
            </div>
          ) : (
            <ol className="help-steps">
              {HELP_STEPS.map(
                ([title, description], index) => (
                  <li key={title}>
                    <span>
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div>
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}

          <button
            type="button"
            className="help-confirm"
            onClick={() => setDialog(null)}
          >
            Đã hiểu
            <Icon name="arrow" />
          </button>
        </dialog>
      )}
    </div>
  );
}