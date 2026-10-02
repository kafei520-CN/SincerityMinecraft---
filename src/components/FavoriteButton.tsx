import {useEffect, useState} from 'react';
import {favoritesEventName, readFavorites, toggleFavorite} from '../lib/storage';

interface FavoriteButtonProps {
  toolId: string;
}

/** 收藏按钮。状态记在这台浏览器里。 */
export default function FavoriteButton({toolId}: FavoriteButtonProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(readFavorites().includes(toolId));
    sync();
    window.addEventListener(favoritesEventName, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(favoritesEventName, sync);
      window.removeEventListener('storage', sync);
    };
  }, [toolId]);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? '取消收藏' : '收藏'}
      className="grid size-10 place-items-center rounded-full border border-line bg-white hover:border-ink"
      onClick={() => setActive(toggleFavorite(toolId))}
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          d="M12 3.6 14.6 9l5.9.7-4.4 4 1.2 5.8L12 16.8 6.7 19.5 7.9 13.7 3.5 9.7 9.4 9z"
          fill={active ? '#111111' : 'none'}
          stroke="#111111"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
