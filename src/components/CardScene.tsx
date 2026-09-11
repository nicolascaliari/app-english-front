interface Props {
  imageUrl?: string;
}

export function CardScene({ imageUrl }: Props) {
  return (
    <div className="card-scene" aria-hidden="true">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="card-scene-photo" />
      ) : (
        <BalloonSky />
      )}
      <div className="card-scene-shade" />
    </div>
  );
}

function BalloonSky() {
  return (
    <svg
      className="card-scene-sky"
      viewBox="0 0 390 640"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec8ff" />
          <stop offset="38%" stopColor="#2f7fe0" />
          <stop offset="100%" stopColor="#123a8c" />
        </linearGradient>
        <radialGradient id="sun" cx="78%" cy="18%" r="28%">
          <stop offset="0%" stopColor="#fff6c2" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ffd36a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffd36a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="balloon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4c8" />
          <stop offset="35%" stopColor="#f2b43a" />
          <stop offset="100%" stopColor="#d06a1a" />
        </linearGradient>
      </defs>
      <rect width="390" height="640" fill="url(#sky)" />
      <circle cx="310" cy="110" r="90" fill="url(#sun)" />
      <ellipse cx="70" cy="160" rx="70" ry="22" fill="white" opacity="0.22" />
      <ellipse cx="300" cy="230" rx="90" ry="26" fill="white" opacity="0.16" />
      <ellipse cx="40" cy="300" rx="80" ry="24" fill="white" opacity="0.12" />
      <g transform="translate(196 268)">
        <ellipse cx="0" cy="-70" rx="58" ry="72" fill="url(#balloon)" />
        <path
          d="M-46 -78 Q0 -132 46 -78"
          fill="none"
          stroke="#fff3c0"
          strokeWidth="5"
          opacity="0.55"
        />
        <path d="M-18 -128 Q0 -78 18 -128" fill="#f6e27a" opacity="0.7" />
        <path d="M-38 -40 L0 8 L38 -40" fill="#c45b14" />
        <line x1="-16" y1="6" x2="-10" y2="38" stroke="#5b3418" strokeWidth="2" />
        <line x1="16" y1="6" x2="10" y2="38" stroke="#5b3418" strokeWidth="2" />
        <rect x="-14" y="36" width="28" height="16" rx="3" fill="#6b3a16" />
      </g>
      <ellipse cx="210" cy="470" rx="40" ry="8" fill="#0b1a4a" opacity="0.18" />
    </svg>
  );
}
