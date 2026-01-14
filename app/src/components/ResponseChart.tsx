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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                {formatDate(day.date)}: {day.count} response{day.count !== 1 ? 's' : ''}
              </div>

              {/* Bar */}
              <div className="w-full h-full flex items-end">
                <div
                  className={`w-full rounded-t transition-all ${
                    isToday
                      ? 'bg-green-500'
                      : day.count > 0
                      ? 'bg-green-600'
                      : 'bg-gray-700'
                  } ${day.count > 0 ? 'min-h-[2px]' : ''}`}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex mt-2 text-xs text-gray-500">
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
