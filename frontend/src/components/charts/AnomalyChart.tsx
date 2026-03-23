import './chartSetup'
import { useState } from 'react'
import { Scatter } from 'react-chartjs-2'

interface AnomalyChartProps {
  chartData: Record<string, { indices: number[]; values: (number | null)[]; is_anomaly: boolean[] }>
  method?: string
}

export default function AnomalyChart({ chartData, method }: AnomalyChartProps) {
  const columns = Object.keys(chartData)
  const [selectedCol, setSelectedCol] = useState(columns[0] || '')

  if (!columns.length) return <p className="text-[11px] opacity-40">No chart data available</p>

  const col = chartData[selectedCol]
  if (!col) return null

  const normal: { x: number; y: number }[] = []
  const anomalies: { x: number; y: number }[] = []

  col.indices.forEach((idx, i) => {
    const val = col.values[i]
    if (val == null) return
    const pt = { x: idx, y: val }
    if (col.is_anomaly[i]) anomalies.push(pt)
    else normal.push(pt)
  })

  const data = {
    datasets: [
      {
        label: 'Normal',
        data: normal,
        backgroundColor: 'rgba(0, 113, 227, 0.5)',
        borderColor: 'rgba(0, 113, 227, 0.8)',
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: 'Anomaly',
        data: anomalies,
        backgroundColor: 'rgba(255, 69, 58, 0.7)',
        borderColor: 'rgba(255, 69, 58, 1)',
        pointRadius: 4,
        pointHoverRadius: 7,
        pointStyle: 'triangle' as const,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: `Anomaly Detection — ${selectedCol} (${method || 'unknown'})`,
        font: { size: 13, weight: 'bold' as const },
      },
      tooltip: {
        callbacks: {
          label: (ctx: unknown) => {
            const item = ctx as { raw: { x: number; y: number }; dataset: { label: string } }
            const pt = item.raw
            return `${item.dataset.label}: index=${pt.x}, value=${pt.y}`
          },
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'Row Index' } },
      y: { title: { display: true, text: selectedCol } },
    },
  }

  return (
    <div className="space-y-2">
      {columns.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {columns.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCol(c)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                c === selectedCol
                  ? 'bg-[#0071E3] text-white'
                  : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f]/60 dark:text-white/60 hover:bg-black/[0.10] dark:hover:bg-white/[0.12]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="h-64 w-full">
        <Scatter data={data} options={options} />
      </div>
      <div className="flex gap-4 text-[10px] opacity-50">
        <span>🔵 Normal: {normal.length}</span>
        <span>🔺 Anomaly: {anomalies.length}</span>
      </div>
    </div>
  )
}
