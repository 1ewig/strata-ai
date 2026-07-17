import { Activity, Award } from 'lucide-react';

interface StatsHeaderProps {
  activeTasksCount: number;
  completedStepsCount: number;
  totalStepsCount: number;
}

export default function StatsHeader({ activeTasksCount, completedStepsCount, totalStepsCount }: StatsHeaderProps) {
  return (
    <div id="header-stats-panel" className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
      <div className="flex items-center gap-2">
        <Activity id="header-activity-icon" className="w-4 h-4 text-emerald-500" />
        <span>Active Goals: <strong id="header-stats-active" className="text-zinc-200">{activeTasksCount}</strong></span>
      </div>
      <div className="flex items-center gap-2 border-l border-zinc-900 pl-6">
        <Award id="header-award-icon" className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span>Steps Complete: <strong id="header-stats-done" className="text-zinc-200">{completedStepsCount}/{totalStepsCount}</strong></span>
      </div>
    </div>
  );
}
