const VARIANTS = {
  confirmed: {
    label: '확정',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  },
  packing: {
    label: '패킹중',
    className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  },
} as const;

type StatusBadgeVariant = keyof typeof VARIANTS;

export function StatusBadge({ variant }: { variant: StatusBadgeVariant }) {
  const { label, className } = VARIANTS[variant];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
