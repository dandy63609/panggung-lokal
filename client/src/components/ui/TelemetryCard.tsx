import React from 'react'
import { cn } from '../../lib/utils'

interface TelemetryCardProps {
  label: string
  value: string | number
  sublabel?: string
  statusDot?: boolean
  className?: string
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  label,
  value,
  sublabel,
  statusDot = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-[#161616]/90 backdrop-blur-md border border-[#2A2A2A] p-4 min-w-[140px] flex flex-col justify-between transition-colors hover:border-[#E01E37]/50',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-mono text-[#9E9E9E] tracking-widest uppercase">
          {label}
        </span>
        {statusDot && (
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
        )}
      </div>
      <div className="text-2xl font-bold font-mono text-white tracking-tight">
        {value}
      </div>
      {sublabel && (
        <span className="text-[10px] font-mono text-[#757575] mt-1 uppercase">
          {sublabel}
        </span>
      )}
    </div>
  )
}
