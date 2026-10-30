import { Link } from "react-router-dom";
import { useState } from "react";

export default function LocationCard({ site, index }) {
  const [failed, setFailed] = useState(false);
  return (
    <article className="location-card">
      <Link className="location-cover" to={`/explore?site=${site.id}`}>
        {site.image && !failed ? (
          <img
            src={site.image}
            alt={site.title}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="location-placeholder">
            <span>{site.date}</span>
            <p>{site.title}</p>
            <small>ĐỊA ĐIỂM & TƯ LIỆU</small>
          </div>
        )}
        <span className="location-badge">
          {site.visit.type === "3d"
            ? "TOUR 3D"
            : site.visit.type === "digital"
              ? "TƯ LIỆU SỐ"
              : "THÔNG TIN ĐỊA ĐIỂM"}
        </span>
        <span className="location-index">0{index + 1}</span>
      </Link>
      <div className="location-body">
        <p className="eyebrow">
          {site.location} <span /> {site.date}
        </p>
        <h3>{site.title}</h3>
        <p className="event-name">{site.event}</p>
        <p>{site.description}</p>
        {site.note && <p className="site-note">{site.note}</p>}
        <div className="card-actions">
          <Link className="text-link" to={`/explore?site=${site.id}`}>
            Tìm hiểu sự kiện →
          </Link>
          {site.visit.url ? (
            <a href={site.visit.url} target="_blank" rel="noreferrer">
              {site.visit.type === "3d" ? "Khám phá 3D" : "Khám phá địa điểm"} ↗
            </a>
          ) : (
            <span>Chưa có tour số</span>
          )}
        </div>
        <details className="source-list">
          <summary>Nguồn tư liệu & bản quyền ảnh</summary>
          {site.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              {source.title} ↗
            </a>
          ))}
          {site.credit && (
            <p>
              Ảnh:{" "}
              <a href={site.credit.url} target="_blank" rel="noreferrer">
                {site.credit.author}
              </a>{" "}
              ·{" "}
              <a
                href={`https://creativecommons.org/licenses/by-sa/${site.credit.version}/`}
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA {site.credit.version}
              </a>
              . Hiển thị cắt khung; ảnh gốc giữ nguyên.
            </p>
          )}
        </details>
      </div>
    </article>
  );
}
