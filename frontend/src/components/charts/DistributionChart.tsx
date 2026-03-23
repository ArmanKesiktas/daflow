import './chartSetup'
import { useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'

interface DistData {
  histogram: { counts: number[]; bin_centers: number[]; bin_edges: number[] }
  kde: { x: number[]; y: number[] }
  skewness: number
  kurtosis: number
  skewness_label: string
}

interface DistributionChartProps {
  distributions: Record<string, DistData>
}

export default function DistributionChart({ distributions }: DistributionChartProps) {
  const columns = Object.keys(distributions)
  const [selectedCol, setSelectedCol] = useState(columns[0] || '')

  if (!columns.length) return <p className="text-[11px] opacity-40">No distribution data</p>

  const dist = distributions[selectedCol]
  if (!dist) return null

  const hist = dist.histogram
  const kde = dist.kde

  const barData = {
    labels: hist.bin_centers.map((v) => v.toFixed(1)),
    datasets: [
      {
        label: 'Frequency',
        data: hist.counts,
        backgroundColor: 'rgba(0, 113, 227, 0.4)',
        borderColor: 'rgba(0, 113, 227, 0.8)',
        borderWidth: 1,
        borderRadius: 2,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Distribution: ${selectedCol}`,
        font: { size: 13, weight: 'bold' as const },
      },
    },
    scales: {
      x: {
        title: { display: true, text: selectedCol },
        ticks: { maxTicksLimit: 10 },
      },
      y: { title: { display: true, text: 'Count' }, beginAtZero: true },
    },
  }

  const hasKde = kde && kde.x.length > 0

  const kdeData = hasKde
    ? {
        labels: kde.x.map((v) => v.toFixed(1)),
        datasets: [
          {
            label: 'KDE',
            data: kde.y,
            borderColor: 'rgba(191, 90, 242, 0.9)',
            backgroundColor: 'rgba(191, 90, 242, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      }
    : null

  const kdeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Kernel Density Estimate', font: { size: 11 } },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8 } },
      y: { beginAtZero: true },
    },
  }

  return (
    <div className="space-y-3">
      {columns.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {columns.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCol(c)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                c === selectedCol
                  ? 'bg-[#BF5AF2] text-white'
                  : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f]/60 dark:text-white/60 hover:bg-black/[0.10] dark:hover:bg-white/[0.12]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Histogram */}
      <div className="h-56 w-full">
        <Bar data={barData} options={barOptions} />
      </div>

      {/* KDE curve */}
      {kdeData && (
        <div className="h-40 w-full">
          <Line data={kdeData} options={kdeOptions} />
        </div>
      )}

      {/* Stats badges */}
      <div className="flex gap-3 text-[10px]">
        <span className="px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.06] opacity-60">
          Skew: {dist.skewness?.toFixed(3)} ({dist.skewness_label})
        </span>
        <span className="px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.06] opacity-60">
          Kurtosis: {dist.kurtosis?.toFixed(3)}
        </span>
      </div>
    </div>
  )
}
