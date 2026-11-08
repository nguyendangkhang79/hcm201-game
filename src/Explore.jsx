import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import Layout from "./Layout";
import LocationCard from "./LocationCard";
import LocationPhotoCredit from "./LocationPhotoCredit";
import { locations } from "./data/history";
import { chapters } from "./data/tourLocations";

export default function Explore() {
  const [params] = useSearchParams();
  const [chapter, setChapter] = useState("all");
  const selected = locations.find((site) => site.id === params.get("site"));
  const visible = locations.filter(
    (site) => chapter === "all" || site.chapter === chapter,
  );
  return (
    <Layout>
      <section className="page-width section-space">
        <p className="eyebrow">VNR202 / HÀNH TRÌNH DI TÍCH</p>
        <h1 className="page-title">
          Theo địa điểm.
          <br />
          <em>Hiểu sự kiện.</em>
        </h1>
        <p className="page-intro">
          Từ Bến Nhà Rồng đến các căn cứ kháng chiến và Dinh Độc Lập. Chọn một
          chặng lịch sử hoặc mở tour 3D để khám phá từng điểm dừng.
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
            {selected.image && (
              <figure className="event-photo">
                <img
                  src={selected.image}
                  alt={selected.credit?.alt ?? selected.title}
                  decoding="async"
                  style={{ objectPosition: selected.credit?.position }}
                />
                {selected.credit && (
                  <figcaption>
                    <LocationPhotoCredit credit={selected.credit} />
                  </figcaption>
                )}
              </figure>
            )}
            <p>{selected.description}</p>
            {selected.note && <p className="site-note">{selected.note}</p>}
            {selected.visit.type === "3d" && (
              <a className="button" href={selected.visit.url} target="_blank" rel="noreferrer">
                Mở tour 3D / 360° ↗
              </a>
            )}
            {selected.tourStops && <h3>Điểm dừng nên xem trong tour</h3>}
            <ol>
              {(selected.tourStops ?? selected.milestones).map(([label, text]) => (
                <li key={label}>
                  <strong>{label}</strong>
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
              aria-label="Lọc theo chặng lịch sử"
            >
              {[{ id: "all", title: "Tất cả địa điểm" }, ...chapters].map(({ id, title }) => (
                <button
                  key={id}
                  aria-pressed={chapter === id}
                  onClick={() => setChapter(id)}
                >
                  {title}
                </button>
              ))}
              <span role="status">{visible.length} địa điểm</span>
            </div>
            {chapters.filter(({ id }) => chapter === "all" || chapter === id).map(({ id, title, range }) => (
              <section className="visit-chapter" key={id} aria-labelledby={id}>
                <p className="eyebrow">{range}</p>
                <h2 id={id}>{title}</h2>
                <div className="location-grid">
                  {visible.filter((site) => site.chapter === id).map((site) => (
                    <LocationCard key={site.id} site={site} index={locations.indexOf(site)} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </section>
    </Layout>
  );
}
