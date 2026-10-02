import {useId} from 'react';

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** 黑白圆角数字输入。 */
export function NumberField({label, value, onChange}: NumberFieldProps) {
  const id = useId();
  return (
    <div>
      <label className="mb-2 block text-sm text-mute" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-ink outline-none focus:border-ink"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
