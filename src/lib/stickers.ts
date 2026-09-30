/* Sticker layouts: the resource illustrations cut out (public/stickers/,
   made from the banner SVGs) and scattered behind headers for colour and
   depth. `depth` sets the blur: far stickers are soft and dim, near ones
   sharp, which is what makes the layer read as space rather than wallpaper.

   Positions are % of the header box; width is % of its width. `wide`
   hides a sticker on phones, where the header is too narrow to keep it
   clear of the type. */
export type Sticker = {
  src: string;
  left: number;
  top: number;
  width: number;
  rotate?: number;
  depth: "far" | "mid" | "near";
  wide?: boolean;
};

const S = (n: string) => `/stickers/${n}.svg`;

/* Home hero: background only (all blurred), around the edges. Nothing sharp
   in front: the spinning record is the star (Grace, 29 Sep). */
export const HERO_STICKERS: Sticker[] = [
  { src: S("record"), left: -6, top: 6, width: 20, rotate: -12, depth: "far" },
  { src: S("camera"), left: 80, top: 4, width: 17, rotate: 8, depth: "mid", wide: true },
  { src: S("checklist"), left: 14, top: -4, width: 11, rotate: 10, depth: "mid", wide: true },
  { src: S("pricetag"), left: 70, top: 72, width: 10, rotate: -18, depth: "far", wide: true },
  { src: S("filmstrip"), left: 60, top: -2, width: 20, rotate: -9, depth: "far", wide: true },
  { src: S("phone-heart"), left: 92, top: 26, width: 7, rotate: 12, depth: "far" },
  { src: S("lens"), left: 16, top: 70, width: 11, rotate: 0, depth: "far", wide: true },
  { src: S("poster-y2k"), left: 88, top: 76, width: 11, rotate: -6, depth: "mid", wide: true },
  { src: S("sparkle"), left: 7, top: 34, width: 2.4, depth: "near", wide: true },
  { src: S("sparkle"), left: 74, top: 30, width: 1.8, depth: "mid", wide: true },
];

/* /resources: a bit of every resource, on the right, behind the heading. */
export const RESOURCES_STICKERS: Sticker[] = [
  { src: S("record"), left: 70, top: 4, width: 26, rotate: -10, depth: "far" },
  { src: S("camera"), left: 54, top: 30, width: 17, rotate: 6, depth: "mid", wide: true },
  { src: S("scissors"), left: 82, top: 58, width: 16, rotate: 20, depth: "near" },
  { src: S("phone-play"), left: 90, top: 8, width: 8, rotate: 12, depth: "near", wide: true },
  { src: S("poster-liveshow"), left: 44, top: -6, width: 10, rotate: -8, depth: "far", wide: true },
  { src: S("sparkle"), left: 66, top: 72, width: 2.2, depth: "near", wide: true },
];

/* Each resource page: its own pieces, behind its title. */
export const PAGE_STICKERS: Record<string, Sticker[]> = {
  "release-label-visuals-checklist": [
    { src: S("record"), left: 74, top: 0, width: 24, rotate: -8, depth: "far" },
    { src: S("checklist"), left: 60, top: 26, width: 13, rotate: 9, depth: "mid", wide: true },
    { src: S("sparkle"), left: 92, top: 70, width: 2.4, depth: "near" },
  ],
  "what-pro-visuals-cost": [
    { src: S("camera"), left: 72, top: 4, width: 20, rotate: -6, depth: "far" },
    { src: S("pricetag"), left: 60, top: 46, width: 11, rotate: -16, depth: "mid", wide: true },
    { src: S("bars"), left: 88, top: 56, width: 12, rotate: 4, depth: "near", wide: true },
  ],
  "cutdown-matrix": [
    { src: S("filmstrip"), left: 64, top: 8, width: 26, rotate: -10, depth: "far" },
    { src: S("scissors"), left: 78, top: 38, width: 15, rotate: 150, depth: "mid" },
    { src: S("phone-heart"), left: 92, top: 4, width: 7, rotate: 12, depth: "near", wide: true },
  ],
  "gig-poster-scribbles": [
    { src: S("poster-underground"), left: 62, top: 0, width: 12, rotate: -10, depth: "far", wide: true },
    { src: S("poster-liveshow"), left: 76, top: 10, width: 12, rotate: 5, depth: "mid" },
    { src: S("poster-y2k"), left: 89, top: 2, width: 11, rotate: 12, depth: "far", wide: true },
  ],
};
