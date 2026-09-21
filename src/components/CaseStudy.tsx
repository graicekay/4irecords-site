import { youtubeId, type CaseStudy as CaseStudyType } from "@/lib/case-studies";

/* nocookie + lazy loading: the embed shouldn't set tracking cookies
   before anyone has pressed play, and three iframes shouldn't block
   the page rendering. */
export default function CaseStudy({
  study, large = false,
}: {
  study: CaseStudyType;
  large?: boolean;
}) {
  const id = youtubeId(study.youtubeId);

  return (
    <figure style={{ margin: 0 }}>
      <div className="video-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
          title={`${study.artist} — ${study.title}`}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <figcaption style={{ marginTop: 14 }}>
        <p style={{
          margin: "0 0 2px", fontWeight: 500,
          fontSize: large ? 18 : 15,
        }}>
          {study.artist} — <span className="muted">{study.title}</span>
        </p>
        <p className="muted" style={{ margin: 0, fontSize: large ? 14.5 : 13.5 }}>
          {study.result}
        </p>
      </figcaption>
    </figure>
  );
}
