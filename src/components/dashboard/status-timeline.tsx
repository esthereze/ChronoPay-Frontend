import { useState } from "react";
import { TimelineItem, statusToneMap } from "./timeline-types";
import { StatusChip } from "./status-chip";

interface StatusTimelineProps {
  items: TimelineItem[];
}

export function StatusTimeline({ items }: StatusTimelineProps) {
  return (
    <ol role="list" className="relative border-l border-white/10 ml-3">
      {items.map((item, index) => (
        <TimelineEntry key={item.id} item={item} isLast={index === items.length - 1} />
      ))}
    </ol>
  );
}

function TimelineEntry({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = !!item.details || !!item.actor;

  return (
    <li className={`mb-10 ml-6 ${isLast ? "mb-0" : ""}`}>
      <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-8 ring-slate-900 ${item.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-700'}`} aria-hidden="true">
        {/* Placeholder for icon */}
      </span>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white" aria-current={item.isCurrent ? "step" : undefined}>
                {item.title}
            </h3>
            <StatusChip tone={statusToneMap[item.status]}>{item.status}</StatusChip>
        </div>
        <p className="text-sm text-slate-400">{item.timestamp}</p>
        
        {hasDetails && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-left text-sm text-cyan-400 hover:text-cyan-300"
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Hide Details" : "Show Details"}
          </button>
        )}
      </div>
      
      {isExpanded && hasDetails && (
        <div className="mt-3 p-3 rounded bg-white/5 text-sm text-slate-300" id={`details-${item.id}`}>
          {item.actor && <p>Actor: {item.actor}</p>}
          {item.details && <p className="mt-1">{item.details}</p>}
        </div>
      )}
    </li>
  );
}
