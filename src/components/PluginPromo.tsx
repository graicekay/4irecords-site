import { FourILower, FourIText } from "@/components/FourIMark";
import { PRODUCTIONS_SITE } from "@/lib/links";

/* ============================================================
   The free 4i plugin (26 Oct 2026), on /resources. The plugin lives on 4i
   Productions, so the banner, the sample video and the pack
   covers load from there (like the shot visualizer's banner) and
   every link opens its /plugin page in a new tab.

   Pack names and lines are the plugin's own (packs.json on
   4iproductions.com/plugin); keep them in step if those change.
   ============================================================ */

const PLUGIN = `${PRODUCTIONS_SITE}/plugin`;

const PACKS = [
  {
    id: "border-ice", name: "Border-iCE", cover: "border-ice-cover.gif", wide: true,
    blurb: "Boiling hand-drawn borders and torn-paper cut-outs around any masked or cut-out layer.",
  },
  {
    id: "scribbles", name: "Scribbles", cover: "scribbles-cover.jpg",
    blurb: "Hand-drawn gig-poster scribbles: stars, doodles, and titles for live music edits.",
  },
  {
    id: "spoilers", name: "Spoilers", cover: "spoilers-cover.jpg",
    blurb: "Cardboard, torn paper, balloons and hand-painted lyrics from Graice Kay's \"Spoilers\" music video.",
  },
  {
    id: "weapons", name: "Weapons", cover: "weapons-cover.jpg",
    blurb: "Street-art cut-outs from Denver and the set of Graice Kay's \"Weapons\" music video.",
  },
];

/** `placement` tags the outbound clicks (resources_plugin). */
export function PluginPromo({ placement }: { placement: string }) {
  return (
    <div className="plugin-promo">
      <h2 className="display plugin-promo-title">
        Upgrade your music content in seconds with the free <FourIText /> plugin
      </h2>

      <div className="grid-2 plugin-promo-media">
        <a href={PLUGIN} target="_blank" rel="noopener" className="plugin-promo-frame"
          data-link-id="plugin_banner" data-placement={placement}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${PRODUCTIONS_SITE}/plugin/links-banner.jpg`} alt="The 4i plugin for After Effects and Premiere, free" loading="lazy" />
        </a>
        <div className="plugin-promo-frame">
          <video
            src={`${PRODUCTIONS_SITE}/media/resources/border-ice/preview.mp4`}
            poster={`${PRODUCTIONS_SITE}/resources/border-ice/preview-poster.jpg`}
            autoPlay muted loop playsInline preload="none"
            aria-label="Border-iCE in the 4i plugin"
          />
        </div>
      </div>

      <div className="plugin-packs">
        {PACKS.map((p) => (
          <a key={p.id} href={PLUGIN} target="_blank" rel="noopener" className="card card-has-banner"
            data-link-id={`plugin_pack_${p.id}`} data-placement={placement}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${PRODUCTIONS_SITE}/plugin/${p.cover}`} alt="" className={`card-banner plugin-pack-cover${"wide" in p ? " plugin-pack-cover-wide" : ""}`} loading="lazy" />
            <span className="badge badge-has-dl">Free</span>
            {/* Not Anton: it's uppercase only, and "Border-iCE" keeps its lowercase i. */}
            <h3 className="plugin-pack-name">{p.name}</h3>
            <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>{p.blurb}</p>
          </a>
        ))}
      </div>

      <a href={PLUGIN} target="_blank" rel="noopener" className="btn btn-solid plugin-promo-cta"
        data-link-id="plugin_cta" data-placement={placement}>
        Get the free <FourILower /> plugin
      </a>
    </div>
  );
}
