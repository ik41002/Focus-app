export type BuddyMood = "waiting" | "content" | "radiant";

export function SproutBuddy({ mood }: { mood: BuddyMood }) {
  return (
    <div
      className={`sprout-buddy sprout-buddy--${mood}`}
      role="img"
      aria-label={`Sprout buddy mood: ${mood}`}
    >
      <svg
        className="sprout-buddy__svg"
        viewBox="0 0 220 220"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <radialGradient id="sprout-face-grad" cx="35%" cy="25%" r="75%">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--color-accent) 28%, white)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--color-accent) 76%, #243)" />
          </radialGradient>
        </defs>

        <ellipse className="sprout-buddy__shadow" cx="110" cy="180" rx="52" ry="14" />

        <g className="sprout-buddy__body-group">
          <path
            className="sprout-buddy__stem"
            d="M110 158 C108 140, 110 124, 110 108"
          />

          <path
            className="sprout-buddy__leaf sprout-buddy__leaf--left"
            d="M109 115 C88 102, 80 85, 95 72 C110 78, 116 95, 111 113 Z"
          />
          <path
            className="sprout-buddy__leaf sprout-buddy__leaf--right"
            d="M111 115 C132 102, 140 85, 125 72 C110 78, 104 95, 109 113 Z"
          />

          <circle className="sprout-buddy__face" cx="110" cy="142" r="34" />
          <circle className="sprout-buddy__eye" cx="98" cy="138" r="3.2" />
          <circle className="sprout-buddy__eye" cx="122" cy="138" r="3.2" />
          <path className="sprout-buddy__mouth" d="M98 151 Q110 160 122 151" />
          <circle className="sprout-buddy__blush" cx="88" cy="146" r="4.2" />
          <circle className="sprout-buddy__blush" cx="132" cy="146" r="4.2" />
        </g>
      </svg>
    </div>
  );
}
