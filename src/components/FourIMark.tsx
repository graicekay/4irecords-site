/**
 * The 4i mark, from the brand kit (4i-brand-guide.txt §3).
 *
 * Inline so it takes `currentColor` and scales with whatever sets its size.
 * Geometry is verbatim from the kit — 541x680 native, evenodd so the
 * triangular counter in the 4 stays a hole. The i stem deliberately runs
 * 5 units lower than the 4 stem; that is not a bug to fix.
 */
export function FourIMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 541 680"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M286 0 L0 449 L0 531 L269 531 L269 675 L369 675 L369 531 L436 531 L436 680 L541 680 L541 171 L436 171 L436 447 L369 447 L369 0 Z M269 192 L269 447 L106 447 Z M436 0 L541 0 L541 110 L436 110 Z" />
    </svg>
  );
}

/**
 * "4i" inside a line of Anton.
 *
 * Anton ships uppercase only, so a typed "4i" in a `.display` heading comes
 * out as "4I" and loses the dot. The mark goes in instead, with the letters
 * kept for screen readers and for copying.
 *
 * Only for Anton. Anywhere the type is Roboto Mono — every eyebrow on the
 * site — use FourILower: mono has a lowercase i, and swapping in artwork
 * there reads as a logo dropped mid-sentence.
 */
export function FourIText() {
  return (
    <>
      <FourIMark className="inline-mark" />
      <span className="sr-only">4i</span>
    </>
  );
}

/**
 * "4i" in a line that CSS is uppercasing, where the font has a real
 * lowercase i. Opts just those two characters out of the transform.
 */
export function FourILower() {
  return <span className="no-caps">4i</span>;
}
