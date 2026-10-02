import {useId} from 'react';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** 黑白圆角文本输入。 */
export function TextField({label, value, onChange, placeholder}: TextFieldProps) {
  const id = useId();
  return (
    <div>
      <label className="mb-2 block text-sm text-mute" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-ink outline-none focus:border-ink"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
