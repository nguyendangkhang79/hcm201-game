import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import Layout from "./Layout";
import LocationCard from "./LocationCard";
import { locations } from "./data/history";

export default function Explore() {
  const [params] = useSearchParams();
  const [period, setPeriod] = useState("all");
  const selected = locations.find((site) => site.id === params.get("site"));
  const visible = locations.filter(
    (site) => period === "all" || site.periods.includes(period),
  );
  return (
    <Layout>
      <section className="page-width section-space">
        <p className="eyebrow">KHÔNG GIAN LỊCH SỬ / CHỦ ĐỀ 05</p>
        <h1 className="page-title">
          Theo địa điểm.
          <br />
          <em>Hiểu sự kiện.</em>
        </h1>
        <p className="page-intro">
          Từ thống nhất đất nước đến bảo vệ biên cương và Đổi mới. Mỗi điểm đến
          là một lát cắt để kết nối kiến thức.
        </p>
        {selected ? (
          <article className="event-detail">
            <Link className="text-link" to="/explore">
              ← Tất cả địa điểm
            </Link>
            <p className="eyebrow">
              {selected.location} · {selected.date}
            </p>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            {selected.note && <p className="site-note">{selected.note}</p>}
            <ol>
              {selected.milestones.map(([date, text]) => (
                <li key={date}>
                  <strong>{date}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <h3>Đọc và đối chiếu nguồn</h3>
            {selected.sources.map((source) => (
              <p key={source.url}>
                <a
                  className="text-link"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.title} ↗
                </a>
              </p>
            ))}
            <Link className="button" to="/quiz">
              Ôn tập qua Quiz →
            </Link>
          </article>
        ) : (
          <>
            <div
              className="filter-bar"
              role="group"
              aria-label="Lọc theo giai đoạn"
            >
              {["all", "1975–1976", "1977–1979", "1982–1986"].map((value) => (
                <button
                  key={value}
                  aria-pressed={period === value}
                  onClick={() => setPeriod(value)}
                >
                  {value === "all" ? "Tất cả địa điểm" : value}
                </button>
              ))}
              <span>{visible.length} địa điểm</span>
            </div>
            <div className="location-grid">
              {visible.map((site, index) => (
                <LocationCard key={site.id} site={site} index={index} />
              ))}
            </div>
          </>
        )}
      </section>
    </Layout>
  );
}
