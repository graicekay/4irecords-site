/* ============================================================
   Every line of prose the shot visualizer shows.

   The explanations under each control are DRAFTS (29 Sep), written at
   Grace's request from the Bergreens' focal-length videos, Camber Film
   School, Apalapse on aperture and Nikon's focal-length guide. Plain,
   second person, no selling: edit freely. `COPY:` still marks lines
   Grace writes from scratch (title, intro, the email gate).

   Shared verbatim by 4iProductions-site and 4irecords-site. Edit it in
   both, or copy this folder across again.
   ============================================================ */

import type { AngleKey, MoveKey, SizeKey } from "./shots";

export const COPY = {
  title: "Shot visualizer",
  intro: "COPY: one or two lines on what this tool is for.",

  sizes: {
    uws: "The whole place, with the person small in it. It shows where the story happens.",
    ws: "Head to toe with plenty of room around them. The setting matters as much as the person.",
    fs: "The whole body, head to feet, filling the frame. Posture and body language read clearly.",
    ms: "Waist up. Close enough for expression, loose enough for gestures and hands.",
    mcu: "Chest up. The face leads, with a little of the world behind it.",
    cu: "The face fills the frame. Every small change in expression shows.",
    ecu: "One detail of the face, here the eyes. Intense, so it's used sparingly.",
    insert: "A close shot of an object, here the phone in their hand: something the audience needs to see.",
  } satisfies Record<SizeKey, string>,

  /* Focal length, and how it differs from "lens". */
  lensLabel: "Lens (focal length)",
  lensWhat: "What's focal length?",
  lensDefinition:
    "Focal length, in millimetres, is the optical distance inside the lens from where it brings light to a point to the camera's sensor. It sets how wide the view is: a shorter number sees more, a longer one sees less and magnifies more. The lens is the glass itself. A prime lens has one focal length; a zoom lens covers a range. So when people say \"an 85\" they mean a lens at 85mm. Here every lens is on a full-frame camera.",
  lenses: {
    14: "Ultra wide. To fill the frame, the camera has to get very close, so whatever is nearest looms large and faces stretch.",
    24: "Wide. Lots of the scene in view. Up close, depth is exaggerated and the background looks far away.",
    35: "Wide but natural, close to how a place feels when you're standing in it. A common storytelling lens.",
    50: "Normal. Roughly what your eye takes in when you look at one thing, with little exaggeration either way.",
    85: "Short telephoto. A narrower view, so the camera stands further back. Faces look even, and the background softens and draws closer.",
    100: "Tighter again. More distance from the subject and more separation from the background.",
    135: "The camera is well back. The background looks bigger and closer behind the subject, and blurs easily.",
    200: "Telephoto. A narrow slice of the scene. From this far back, the layers compress and the background looks stacked right behind the subject.",
  } as Record<number, string>,

  /* The lens toggle: the Bergreens' point that distance, not focal length, changes perspective. */
  holdLabel: "When you change lens",
  hold: {
    frame: "Keep the framing: the camera moves so the shot size stays the same. That change of distance is what changes perspective.",
    camera: "Keep the camera still: only the view gets wider or narrower, like cropping. Perspective doesn't change at all.",
  },
  holdChips: { frame: "Keep the framing", camera: "Keep the camera still" },

  apertureWhat: "What's an f-stop?",
  apertureDefinition:
    "Aperture is the opening in the lens that lets light in. The f-number is the focal length divided by the width of that opening, so a smaller number means a bigger opening. Each full stop (f/1.4, 2, 2.8, 4, 5.6, 8, 11, 16) lets in half the light of the one before. A bigger opening also means less of the scene is in focus. How much is sharp depends on distance and focal length too: closer to the subject or on a longer lens, the in-focus slice gets thinner.",
  fStops: {
    1.4: "Wide open. The most light and the thinnest slice of sharpness; the background melts away.",
    2: "Very shallow focus and easy background blur, with half the light of f/1.4.",
    2.8: "Still shallow, but a little more forgiving if the subject moves.",
    4: "A middle setting. The subject is sharp, with some of the surroundings.",
    5.6: "More of the scene in focus; the background starts to come back.",
    8: "Deep focus. Near and far both read clearly, with much less light.",
    11: "Most of the scene is sharp, front to back.",
    16: "Nearly everything in focus. It needs a lot of light.",
  } as Record<number, string>,

  angles: {
    eye: "The camera at their eye height. Neutral: the audience meets them as an equal.",
    low: "The camera looks up at them. They feel bigger and more powerful.",
    high: "The camera looks down on them. They feel smaller, or more vulnerable.",
    bird: "Straight down from above. It shows layout and pattern more than feeling.",
    worm: "From the ground, looking steeply up. They tower over the frame.",
    dutch: "The camera is tilted. Something feels off: unease or tension.",
    ots: "From behind another person, looking at the subject past their shoulder. It puts the audience inside the conversation.",
  } satisfies Record<AngleKey, string>,

  moves: {
    static: "The camera doesn't move. The frame holds and the action plays inside it.",
    push: "The camera moves toward them. It draws attention in and builds intensity.",
    pull: "The camera moves away. It reveals the surroundings, or leaves them alone in it.",
    zoomIn: "The camera stays put and the focal length gets longer. The frame tightens but perspective doesn't change, so it reads flatter than a push.",
    zoomOut: "The focal length gets shorter from the same spot. More comes into view; perspective stays the same.",
    dollyZoom: "The camera moves back while zooming in, keeping them the same size. The background stretches or squeezes around them.",
    pan: "The camera turns left or right on the spot. It follows action or scans a scene.",
    tilt: "The camera turns up or down on the spot. It reveals height, or moves from one thing to another.",
    truck: "The camera slides sideways. Near things pass faster than far ones, which shows depth.",
    crane: "The camera rises. It lifts away from them, often to open up a scene or close one.",
    handheld: "Held by hand, the camera drifts a little. It feels immediate, like being there.",
  } satisfies Record<MoveKey, string>,

  /* Shown when a worm's eye would put the camera under the floor. */
  floored: "The camera is on the floor: this is as low as it goes at this distance.",
  /* Shown when an over-the-shoulder is too tight for a second person. */
  otsTooTight: "Too close for anyone to stand between the camera and the subject. Try a wider shot size or a longer lens.",

  listEmpty: "COPY: what to do to start a shot list.",
  gateHeading: "COPY: heading above the email box.",
  gateBody: "COPY: one line on why we ask for an email.",
  gateThanks: "COPY: thank-you line after the email.",
};
