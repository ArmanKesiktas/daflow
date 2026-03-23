import './chartSetup'
import { Bar } from 'react-chartjs-2'

interface StatisticsChartProps {
  statistics: Record<string, Record<string, number>>
}

export default function StatisticsChart({ statistics }: StatisticsChartProps) {
  const columns = Object.keys(statistics)
  if (!columns.length) return <p className="text-[11px] opacity-40">No statistics data</p>

  const metrics = ['mean', 'median', 'std', 'min', 'max']
  const colors = [
    'rgba(0, 113, 227, 0.6)',   // blue - mean
    'rgba(48, 209, 88, 0.6)',   // green - median
    'rgba(245, 166, 35, 0.6)',  // orange - std
    'rgba(191, 90, 242, 0.6)',  // purple - min
    'rgba(255, 69, 58, 0.6)',   // red - max
  ]

  const data = {
    labels: columns.map((c) => (c.length > 12 ? c.slice(0, 12) + '…' : c)),
    datasets: metrics.map((metric, i) => ({
      label: metric.charAt(0).toUpperCase() + metric.slice(1),
      data: columns.map((col) => {
        const val = statistics[col]?.[metric]
        return val != null ? parseFloat(val.toFixed(3)) : 0
      }),
      backgroundColor: colors[i],
      borderRadius: 3,
    })),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Descriptive Statistics Comparison',
        font: { size: 13, weight: 'bold' as const },
      },
      legend: { position: 'bottom' as const },
    },
    scales: {
      x: { ticks: { maxRotation: 45 } },
      y: { beginAtZero: false },
    },
  }

  // Also show a compact table
  return (
    <div className="space-y-3">
      <div className="h-64 w-full">
        <Bar data={data} options={options} />
      </div>

      {/* Normality indicators */}
      <div className="flex gap-2 flex-wrap text-[10px]">
        {columns.map((col) => {
          const s = statistics[col]
          if (!s || s.shapiro_p == null) return null
          const isNormal = s.is_normal
          return (
            <span
              key={col}
              className={`px-2 py-0.5 rounded ${
                isNormal
                  ? 'bg-[#30D158]/15 text-[#30D158]'
                  : 'bg-[#FF453A]/15 text-[#FF453A]'
              }`}
            >
              {col}: {isNormal ? '✓ Normal' : '✗ Non-normal'} (p={Number(s.shapiro_p).toFixed(4)})
            </span>
          )
        })}
      </div>
    </div>
  )
}
