import { Link } from "react-router-dom";
import { useState } from "react";
import LocationPhotoCredit from "./LocationPhotoCredit";

export default function LocationCard({ site, index, compact = false }) {
  const [failed, setFailed] = useState(false);
  return (
    <article className="location-card">
      <Link className="location-cover" to={`/explore?site=${site.id}`}>
        {site.image && !failed ? (
          <img
            src={site.image}
            alt={site.credit?.alt ?? site.title}
            loading="lazy"
            decoding="async"
            style={{ objectPosition: site.credit?.position }}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="location-placeholder">
            <span>{site.date}</span>
            <p>{site.title}</p>
            <small>{site.location}</small>
          </div>
        )}
        <span className="location-badge">
          {site.visit.type === "3d"
            ? "TOUR 3D"
            : site.visit.type === "digital"
              ? "TƯ LIỆU SỐ"
              : "THÔNG TIN ĐỊA ĐIỂM"}
        </span>
        <span className="location-index">{String(index + 1).padStart(2, "0")}</span>
      </Link>
      <div className="location-body">
        <p className="eyebrow">
          {site.location} <span /> {site.date}
        </p>
        <h3>{site.title}</h3>
        <p className="event-name">{site.event}</p>
        {!compact && <p>{site.description}</p>}
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
              <LocationPhotoCredit credit={site.credit} />
            </p>
          )}
        </details>
      </div>
    </article>
  );
}
