import { clsx } from "clsx";

// Neutral, hand-built architectural illustrations used as placeholders on the
// marketing site. They are NOT property photographs and are labelled as
// illustrative wherever they appear.

type Scene = "living" | "kitchen" | "bedroom" | "exterior";

export function RoomIllustration({ scene = "living", className, dim = false }: { scene?: Scene; className?: string; dim?: boolean }) {
  return (
    <svg
      viewBox="0 0 400 280"
      className={clsx("h-full w-full", className)}
      role="img"
      aria-label="Ενδεικτική εικονογράφηση χώρου (όχι πραγματική φωτογραφία)"
      preserveAspectRatio="xMidYMid slice"
      style={dim ? { filter: "brightness(0.78) saturate(0.7) contrast(0.92)" } : undefined}
    >
      <defs>
        <linearGradient id={`wall-${scene}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f3ece1" />
          <stop offset="1" stopColor="#e6dccd" />
        </linearGradient>
        <linearGradient id={`light-${scene}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff8ea" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff8ea" stopOpacity="0" />
        </linearGradient>
      </defs>
      {scene === "exterior" ? (
        <>
          <rect width="400" height="280" fill="#dfe6e9" />
          <rect y="200" width="400" height="80" fill="#cfc5b4" />
          <rect x="70" y="70" width="260" height="140" fill="#f4efe6" />
          <path d="M60 72 L200 20 L340 72 Z" fill="#b5532f" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={95 + i * 75} y="95" width="48" height="56" fill="#5d6b74" />
              <rect x={95 + i * 75} y="95" width="48" height="56" fill="url(#light-exterior)" opacity="0.5" />
              <rect x={90 + i * 75} y="151" width="58" height="5" fill="#e4dccf" />
            </g>
          ))}
          <rect x="182" y="165" width="36" height="45" fill="#4f4a43" />
          <circle cx="40" cy="185" r="26" fill="#6f7f57" />
          <circle cx="360" cy="180" r="30" fill="#6f7f57" />
          <rect x="37" y="190" width="6" height="20" fill="#7a6a55" />
          <rect x="357" y="190" width="6" height="22" fill="#7a6a55" />
        </>
      ) : (
        <>
          <rect width="400" height="280" fill={`url(#wall-${scene})`} />
          <path d="M0 210 L400 210 L400 280 L0 280 Z" fill="#cdb79a" />
          <path d="M0 210 L400 210" stroke="#b9a385" strokeWidth="2" />
          {/* window */}
          <rect x="250" y="40" width="110" height="130" fill="#dbe4e6" stroke="#fffdf9" strokeWidth="6" />
          <path d="M305 40 V170 M250 105 H360" stroke="#fffdf9" strokeWidth="4" />
          <path d="M250 170 L170 280 L330 280 L360 170 Z" fill={`url(#light-${scene})`} opacity="0.55" />
          {scene === "living" && (
            <>
              <rect x="40" y="150" width="170" height="55" rx="10" fill="#8c847a" />
              <rect x="40" y="128" width="170" height="34" rx="10" fill="#a99f8f" />
              <rect x="55" y="140" width="45" height="22" rx="6" fill="#b5532f" opacity="0.85" />
              <rect x="215" y="185" width="70" height="8" rx="3" fill="#7a6a55" />
              <rect x="225" y="193" width="4" height="17" fill="#7a6a55" />
              <rect x="271" y="193" width="4" height="17" fill="#7a6a55" />
              <rect x="70" y="50" width="70" height="50" fill="#fffdf9" stroke="#cfc5b4" strokeWidth="3" />
              <path d="M78 90 L98 70 L112 82 L132 62" stroke="#4b5d38" strokeWidth="3" fill="none" />
            </>
          )}
          {scene === "kitchen" && (
            <>
              <rect x="20" y="140" width="210" height="70" fill="#fffdf9" stroke="#cfc5b4" strokeWidth="2" />
              <rect x="20" y="132" width="210" height="10" fill="#4f4a43" />
              {[0, 1, 2].map((i) => (
                <rect key={i} x={30 + i * 68} y="150" width="58" height="52" fill="#f0eae0" stroke="#cfc5b4" />
              ))}
              <rect x="20" y="40" width="210" height="55" fill="#fffdf9" stroke="#cfc5b4" strokeWidth="2" />
              <rect x="150" y="105" width="30" height="26" rx="4" fill="#4b5d38" opacity="0.8" />
            </>
          )}
          {scene === "bedroom" && (
            <>
              <rect x="40" y="150" width="190" height="60" rx="6" fill="#fffdf9" stroke="#cfc5b4" strokeWidth="2" />
              <rect x="40" y="110" width="20" height="100" fill="#8c847a" />
              <rect x="70" y="140" width="50" height="20" rx="6" fill="#e4dccf" />
              <rect x="130" y="140" width="50" height="20" rx="6" fill="#e4dccf" />
              <rect x="40" y="170" width="190" height="40" fill="#b5532f" opacity="0.35" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

export function IllustrativeTag({ className, children = "Ενδεικτική απεικόνιση" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft shadow-sm backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FloorPlanIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 200" className={className} role="img" aria-label="Ενδεικτική κάτοψη">
      <rect x="10" y="10" width="280" height="180" fill="#fffdf9" stroke="#1d1b18" strokeWidth="4" />
      <path d="M150 10 V110 M10 110 H120 M180 110 H290 M210 110 V190" stroke="#1d1b18" strokeWidth="3" fill="none" />
      <text x="70" y="65" fontSize="12" fill="#4f4a43" textAnchor="middle" fontFamily="sans-serif">Σαλόνι</text>
      <text x="220" y="65" fontSize="12" fill="#4f4a43" textAnchor="middle" fontFamily="sans-serif">Κουζίνα</text>
      <text x="100" y="155" fontSize="12" fill="#4f4a43" textAnchor="middle" fontFamily="sans-serif">Υπνοδωμάτιο</text>
      <text x="250" y="155" fontSize="12" fill="#4f4a43" textAnchor="middle" fontFamily="sans-serif">Μπάνιο</text>
      {[
        [70, 85],
        [220, 85],
        [100, 175],
        [250, 175],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y - 5} r="9" fill="#9b4224" />
          <text x={x} y={y - 1} fontSize="10" fill="#fff" textAnchor="middle" fontFamily="sans-serif">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}
