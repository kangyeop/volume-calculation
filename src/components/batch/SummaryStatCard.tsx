import type { ReactNode } from 'react';

export function SummaryStatCard({
  icon,
  iconBgClassName,
  label,
  value,
}: {
  icon: ReactNode;
  iconBgClassName: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center gap-4">
      <div className={`${iconBgClassName} p-3 rounded-full`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
