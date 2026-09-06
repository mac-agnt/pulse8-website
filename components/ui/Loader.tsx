const PULSE_PATH =
  "M0 60 H130 l10 -9 l10 9 h24 l8 -38 l13 72 l11 -34 h28 l9 -13 l9 13 H420";

/**
 * First-visit loader. Markup only, no client JavaScript: the whole sequence is
 * CSS keyframes in globals.css, and the inline script in the layout decides
 * whether it runs at all. Hidden entirely under prefers-reduced-motion, when
 * the visitor arrives on a deep link, and on every visit after the first in a
 * session.
 */
export function Loader() {
  return (
    <div id="loader" role="presentation" aria-hidden="true">
      <div className="loader-mark">
        <svg viewBox="0 0 420 120" fill="none" aria-hidden="true">
          <path
            d={PULSE_PATH}
            className="loader-rail"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={PULSE_PATH}
            className="loader-trace"
            pathLength={1}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g className="loader-head">
            <circle r="12" className="loader-head-halo" />
            <circle r="4.5" className="loader-head-core" />
          </g>
        </svg>
      </div>

      <p className="loader-word">
        Pulse<span>8</span>
      </p>
    </div>
  );
}
