import type { WorkspaceRole } from '../../../types/workflow'

const COLORS: Record<WorkspaceRole, string> = {
  owner: 'bg-black/[0.065] dark:bg-white/[0.09] text-[#1d1d1f]/70 dark:text-white/75',
  admin: 'bg-black/[0.055] dark:bg-white/[0.08] text-[#1d1d1f]/62 dark:text-white/68',
  analyst: 'bg-black/[0.05] dark:bg-white/[0.075] text-[#1d1d1f]/58 dark:text-white/62',
  viewer: 'bg-black/[0.045] dark:bg-white/[0.07] text-[#1d1d1f]/52 dark:text-white/56',
  guest: 'bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f]/50 dark:text-white/50',
}

export default function RoleBadge({ role }: { role: WorkspaceRole }) {
  return <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${COLORS[role]}`}>{role}</span>
}
