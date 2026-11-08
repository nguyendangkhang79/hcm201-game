import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { congressArchive, congresses } from "./data/congresses";

const eras = {
  I: { range: "1935–1960", title: "Tổ chức lực lượng và kháng chiến" },
  IV: { range: "1976–1986", title: "Thống nhất và khởi xướng Đổi mới" },
  VII: { range: "1991–2021", title: "Phát triển và hội nhập" },
};

const relatedPlaces = {
  II: { id: "kim-binh", label: "Địa điểm Đại hội · Kim Bình" },
  III: { id: "trung-uong-cuc", label: "Bối cảnh lịch sử · Trung ương Cục miền Nam" },
  IV: { id: "ba-dinh", label: "Địa điểm Đại hội · Hội trường Ba Đình cũ" },
  V: { id: "ba-dinh", label: "Địa điểm Đại hội · Hội trường Ba Đình cũ" },
  VI: { id: "ba-dinh", label: "Địa điểm Đại hội · Hội trường Ba Đình cũ" },
};

export default function CongressTimeline() {
  const timelineRef = useRef(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timeline = timelineRef.current;
    const entries = [...timeline.querySelectorAll(".congress-entry")];
    let frame = 0;

    function update() {
      frame = 0;
      const { top, height } = timeline.getBoundingClientRect();
      const readingLine = window.innerHeight * 0.42;
      const progress = Math.max(0, Math.min(1, (readingLine - top) / height));
      const next = entries.findLastIndex(
        (entry) => entry.getBoundingClientRect().top + 32 <= readingLine,
      );
      timeline.style.setProperty("--congress-progress", progress);
      setCurrent(Math.max(0, next));
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    const resize = new ResizeObserver(schedule);
    resize.observe(timeline);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    const reveal = new IntersectionObserver((changes) => {
      for (const { isIntersecting, target } of changes) {
        if (isIntersecting) {
          target.classList.add("congress-entered");
          reveal.unobserve(target);
        }
      }
    }, { rootMargin: "0px 0px -7% 0px" });
    entries.forEach((entry) => reveal.observe(entry));

    return () => {
      resize.disconnect();
      reveal.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="timeline-section" id="dong-thoi-gian" aria-labelledby="timeline-title" tabIndex={-1}>
      <div className="page-width">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> 01 / DÒNG THỜI GIAN</p>
            <h2 id="timeline-title">Các kỳ Đại hội Đảng</h2>
          </div>
          <a className="text-link" href={congressArchive} target="_blank" rel="noreferrer">
            Kho tư liệu Đại hội ↗
          </a>
        </div>
        <nav className="congress-jump" aria-label="Chuyển nhanh đến kỳ Đại hội">
          <div className="congress-jump-links">
            {congresses.map(({ number }, index) => (
              <a
                key={number}
                href={`#dai-hoi-${number.toLowerCase()}`}
                aria-label={`Đại hội ${number}`}
                aria-current={index === current ? "location" : undefined}
              >
                {number}
              </a>
            ))}
          </div>
          <span className="congress-jump-count" aria-hidden="true">
            {String(current + 1).padStart(2, "0")} / {congresses.length}
          </span>
        </nav>
        <ol className="congress-timeline" ref={timelineRef} role="list">
          {congresses.map(({ number, date, title, location, leadership, details, source }, index) => {
            const [year, month] = date.split("-");
            const era = eras[number];
            const place = relatedPlaces[number];
            return (
              <li className="congress-stop" key={number}>
                {era && (
                  <div className="congress-era">
                    <span>{era.range}</span>
                    <h3>{era.title}</h3>
                  </div>
                )}
                <article
                  className="congress-entry"
                  data-active={index === current}
                  id={`dai-hoi-${number.toLowerCase()}`}
                  tabIndex={-1}
                >
                  <time dateTime={date}>
                    <span>{year}</span> Tháng {Number(month)}
                  </time>
                  <div className="congress-card">
                    <p className="eyebrow">ĐẠI HỘI {number}</p>
                    <h3>{title}</h3>
                    <p className="congress-location">{location}</p>
                    <p className="congress-lead">{details[0][1]}</p>
                    <details className="congress-details">
                      <summary>Đọc chi tiết Đại hội {number}</summary>
                      <dl>
                        <dt>Lãnh đạo</dt>
                        <dd>{leadership}</dd>
                        {details.slice(1).map(([label, value]) => (
                          <Fragment key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </Fragment>
                        ))}
                      </dl>
                      {source && (
                        <a className="text-link" href={source} target="_blank" rel="noreferrer">
                          Tư liệu Đại hội {number} ↗
                        </a>
                      )}
                    </details>
                    {place && (
                      <Link className="text-link congress-place" to={`/explore?site=${place.id}`}>
                        {place.label} →
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
