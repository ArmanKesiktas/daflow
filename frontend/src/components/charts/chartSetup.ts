import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  Title,
  DoughnutController,
  BarController,
  LineController,
  ScatterController,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  Title,
  DoughnutController,
  BarController,
  LineController,
  ScatterController,
)

// Global defaults for dark/light compatibility
ChartJS.defaults.color = '#888'
ChartJS.defaults.borderColor = 'rgba(128,128,128,0.15)'
ChartJS.defaults.font.family = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
ChartJS.defaults.font.size = 11
ChartJS.defaults.plugins.legend!.labels!.boxWidth = 10
ChartJS.defaults.plugins.legend!.labels!.padding = 12

export { ChartJS }
