interface GlyphProps {
  id: string;
  className?: string;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** 工具的线框图标。 */
export function ToolGlyph({id, className = 'size-5'}: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {id === 'nether-coords' && (
        <>
          <rect {...stroke} x="3.5" y="6" width="7" height="12" rx="1.5" />
          <rect {...stroke} x="13.5" y="3.5" width="7" height="17" rx="1.5" />
        </>
      )}
      {id === 'tick-time' && (
        <>
          <circle {...stroke} cx="12" cy="12" r="7.5" />
          <path {...stroke} d="M12 8.5V12l2.5 2" />
        </>
      )}
      {id === 'day-clock' && (
        <>
          <circle {...stroke} cx="12" cy="12" r="3.4" />
          <path {...stroke} d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4" />
        </>
      )}
      {id === 'xp-level' && <path {...stroke} d="M5 18V13M12 18V8M19 18V4" />}
      {id === 'uuid-skin' && (
        <>
          <circle {...stroke} cx="12" cy="8" r="3" />
          <path {...stroke} d="M6.5 19.5c.8-2.8 2.8-4 5.5-4s4.7 1.2 5.5 4" />
        </>
      )}
      {id === 'server-status' && (
        <>
          <rect {...stroke} x="4" y="4" width="16" height="12" rx="2" />
          <path {...stroke} d="M8 20h8M12 16v4" />
        </>
      )}
      {id === 'motd' && <path {...stroke} d="M5 7h14M5 12h10M5 17h7" />}
      {id === 'command-gen' && <path {...stroke} d="M8 7 4 12l4 5M13 17h7" />}
      {id === 'seed-finder' && (
        <>
          <rect {...stroke} x="4" y="4" width="6" height="6" rx="1" />
          <rect {...stroke} x="14" y="4" width="6" height="6" rx="1" />
          <rect {...stroke} x="4" y="14" width="6" height="6" rx="1" />
          <rect {...stroke} x="14" y="14" width="6" height="6" rx="1" />
        </>
      )}
      {id === 'skin-preview' && (
        <>
          <rect {...stroke} x="9" y="3.5" width="6" height="6" rx="1" />
          <path {...stroke} d="M8 20.5 9.5 12h5L16 20.5" />
        </>
      )}
      {id === 'skin-render' && (
        <>
          <circle {...stroke} cx="12" cy="12" r="3" />
          <path {...stroke} d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2" />
        </>
      )}
    </svg>
  );
}

/** 分类的线框图标，用在首页。 */
export function CategoryGlyph({id, className = 'size-5'}: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {id === 'coords' && (
        <>
          <circle {...stroke} cx="12" cy="12" r="6.5" />
          <path {...stroke} d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
        </>
      )}
      {id === 'time' && (
        <>
          <circle {...stroke} cx="12" cy="12" r="7.5" />
          <path {...stroke} d="M12 8v4.5L15 15" />
        </>
      )}
      {id === 'calc' && <path {...stroke} d="M6 17V11M12 17V7M18 17V4" />}
      {id === 'query' && (
        <>
          <circle {...stroke} cx="11" cy="11" r="5.5" />
          <path {...stroke} d="m15.5 15.5 4 4" />
        </>
      )}
      {id === 'generate' && <path {...stroke} d="M12 5v14M5 12h14" />}
      {id === 'world' && <path {...stroke} d="m4 17 5-7 3 3 3-4 5 8" />}
      {id === 'skin' && (
        <>
          <circle {...stroke} cx="12" cy="8" r="3" />
          <path {...stroke} d="M6.5 19.5c.8-2.8 2.8-4 5.5-4s4.7 1.2 5.5 4" />
        </>
      )}
    </svg>
  );
}
