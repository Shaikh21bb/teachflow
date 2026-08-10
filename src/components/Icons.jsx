/**
 * Custom SVG icon library for Urpaq.ai
 * All icons use stroke-based style matching lucide-react aesthetics.
 * Props: size (number, default 24), color (string, default "currentColor"), className (string)
 */

export function TelegramIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M21.5 3.5L2.5 10.5l6 2m13-9L14.5 21.5l-6-9m13-9l-7 9" />
    </svg>
  )
}

export function LibraryIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="18" rx="1" />
      <path d="M17 3l4 4-4 14" />
    </svg>
  )
}

export function AiSparkIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
      <path d="M19 3l.8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8z" />
    </svg>
  )
}

export function PresentationIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21l4-4 4 4" />
      <path d="M12 17v4" />
      <path d="M7 8l3 3 5-5" />
    </svg>
  )
}

export function LiveDotIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" fill={color} stroke="none" />
      <path d="M6.3 6.3a8 8 0 0 0 0 11.4" />
      <path d="M17.7 6.3a8 8 0 0 1 0 11.4" />
      <path d="M9.2 9.2a4 4 0 0 0 0 5.6" />
      <path d="M14.8 9.2a4 4 0 0 1 0 5.6" />
    </svg>
  )
}

export function QrCodeIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h1v1h-1z M16 14h1v1h-1z M14 16h1v1h-1z M16 16h1v1h-1z M18 14h3v3h-3z M14 18h3v3h-3z M18 18h3v3h-3z" fill={color} stroke="none" />
      <rect x="5" y="5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="16" y="5" width="3" height="3" rx="0.5" fill={color} stroke="none" />
      <rect x="5" y="16" width="3" height="3" rx="0.5" fill={color} stroke="none" />
    </svg>
  )
}

export function KaspiIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
      <circle cx="17" cy="15" r="1.5" />
    </svg>
  )
}

export function ShuffleTeamsIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="12" cy="17" r="2" />
      <path d="M6 9v2c0 2 2 3 4 3h4c2 0 4-1 4-3V9" />
      <path d="M10 14l2 3 2-3" />
    </svg>
  )
}

export function InboxEmptyIcon({ size = 48, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-6l-2 3H10l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

export function TrophyIcon({ size = 64, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  )
}

export function ObjectivesIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export function HomeworkIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
      <path d="M9 9h1" />
    </svg>
  )
}

export function SummaryIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6" />
      <path d="M9 12h6" />
      <path d="M9 15h4" />
    </svg>
  )
}

export function ExampleIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}
