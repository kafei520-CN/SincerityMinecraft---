interface ResultProps {
  label: string;
  value: string;
}

/** 工具结果格。 */
export function Result({label, value}: ResultProps) {
  return (
    <div className="rounded-2xl bg-paper px-4 py-3">
      <p className="text-sm text-mute">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
