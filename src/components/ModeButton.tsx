import type {ReactNode} from 'react';

interface ModeButtonProps {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** 二选一方向按钮。选中为黑底白字。 */
export function ModeButton({pressed, onClick, children}: ModeButtonProps) {
  const tone = pressed
    ? 'border-ink bg-ink text-white'
    : 'border-line bg-white text-ink hover:border-ink';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`rounded-full border px-4 py-2 text-sm ${tone}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
