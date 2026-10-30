import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "./History.css";

export default function Layout({ children }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const label =
      {
        "/": "Khám phá lịch sử qua trải nghiệm",
        "/explore": "Khám phá lịch sử",
        "/quiz": "Quiz ôn tập",
        "/bingo": "Bingo cùng lớp",
      }[pathname] || "VNR202";
    document.title = `${label} · Dấu ấn lịch sử Đảng`;
  }, [pathname]);
  return (
    <div className="history-app">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="history-header">
        <Link className="history-brand" to="/">
          <img src="/brand-mark.svg" alt="" />
          <span>
            <strong>DẤU ẤN LỊCH SỬ ĐẢNG</strong>
            <small>VNR202 · HỌC TỪ NHỮNG BƯỚC NGOẶT</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <NavLink end to="/">
            Trang chủ
          </NavLink>
          <NavLink to="/explore">Khám phá lịch sử</NavLink>
          <NavLink to="/quiz">Quiz</NavLink>
          <NavLink to="/bingo">
            Bingo <span aria-hidden="true">↗</span>
          </NavLink>
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer className="history-footer">
        <Link to="/">
          Dấu ấn lịch sử Đảng<span>VNR202 · Sản phẩm học tập sáng tạo</span>
        </Link>
        <p>
          Khám phá lịch sử – Hiểu những bước ngoặt – Ghi nhớ qua trải nghiệm.
        </p>
        <Link to="/explore">Tư liệu & nguồn ↗</Link>
      </footer>
    </div>
  );
}
