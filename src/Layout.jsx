import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "./History.css";

export default function Layout({ children }) {
  const { pathname, search, hash } = useLocation();
  const isHome = pathname === "/";
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    const label =
      {
        "/": "Khám phá lịch sử qua trải nghiệm",
        "/explore": "Khám phá lịch sử",
        "/quiz": "Quiz ôn tập",
        "/bingo": "Bingo cùng lớp",
      }[pathname] || "VNR202";
    document.title = `${label} · Dấu ấn lịch sử Đảng`;
  }, [pathname, search, hash]);
  return (
    <div className={isHome ? "history-app history-home" : "history-app"}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="history-header">
        <Link className="history-brand" to="/">
          {isHome ? (
            <svg className="home-book" viewBox="0 0 52 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
              <path d="M26 34C20 29 12 27 3 29L7 7c7-2 14 0 19 5 5-5 12-7 19-5l4 22c-9-2-17 0-23 5Zm0 0V12" />
              <path d="M26 34C19 31 10 31 1 33L5 11m21 23c7-3 16-3 25-1l-4-22M10 14c4 0 8 1 11 3m-12 3c4 0 8 1 11 3m22-9c-4 0-8 1-11 3m12 3c-4 0-8 1-11 3" />
            </svg>
          ) : (
            <img src="/brand-mark.svg" alt="" />
          )}
          <span>
            <strong>DẤU ẤN LỊCH SỬ ĐẢNG</strong>
            <small>{isHome ? "VNR202" : "VNR202 · HỌC TỪ NHỮNG BƯỚC NGOẶT"}</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <NavLink end to="/">
            Trang chủ
          </NavLink>
          <NavLink to="/explore">Tham quan</NavLink>
          <NavLink to="/quiz">Ôn tập</NavLink>
          <NavLink className="bingo-nav" to="/bingo">
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
