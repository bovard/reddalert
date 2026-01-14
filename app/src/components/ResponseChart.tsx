import type { DailyCount } from '../hooks/useStats';

interface ResponseChartProps {
  data: DailyCount[];
  height?: number;
}

export function ResponseChart({ data, height = 120 }: ResponseChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Group by week for labels
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Show labels for first day of each week
  const showLabel = (index: number) => {
    if (index === 0) return true;
    const date = new Date(data[index].date);
    return date.getDay() === 0; // Sunday
  };

  return (
    <div className="w-full">
      {/* Chart */}
      <div className="flex items-end gap-0.5" style={{ height }}>
        {data.map((day, index) => {
          const barHeight = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          const isToday = index === data.length - 1;

          return (
            <div
              key={day.date}
              className="flex-1 group relative"
              style={{ height: '100%' }}
            >
              {/* Tooltip */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none md-elevation-2"
                style={{
                  backgroundColor: 'var(--md-inverse-surface)',
                  color: 'var(--md-inverse-on-surface)',
                }}
              >
                {formatDate(day.date)}: {day.count} response{day.count !== 1 ? 's' : ''}
              </div>

              {/* Bar */}
              <div className="w-full h-full flex items-end">
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: isToday
                      ? 'var(--md-tertiary)'
                      : day.count > 0
                      ? 'var(--md-primary)'
                      : 'var(--md-surface-container-lowest)',
                    minHeight: day.count > 0 ? '2px' : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex mt-2 text-xs" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
        {data.map((day, index) => (
          <div key={day.date} className="flex-1 text-center">
            {showLabel(index) && (
              <span className="whitespace-nowrap">
                {formatDate(day.date).split(' ')[0]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
