import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'red' | 'green' | 'cyan' | 'neutral' | 'yellow'
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  dot = false,
  children,
  ...props
}) => {
  const variantStyles = {
    red: 'bg-[#E01E37]/15 text-[#E01E37] border-[#E01E37]/30',
    green: 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30',
    cyan: 'bg-[#00D9FF]/15 text-[#00D9FF] border-[#00D9FF]/30',
    neutral: 'bg-[#1E1E1E] text-[#9E9E9E] border-[#2A2A2A]',
    yellow: 'bg-[#FFB627]/15 text-[#FFB627] border-[#FFB627]/30',
  }

  const dotColors = {
    red: 'bg-[#E01E37]',
    green: 'bg-[#25D366]',
    cyan: 'bg-[#00D9FF]',
    neutral: 'bg-[#9E9E9E]',
    yellow: 'bg-[#FFB627]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium tracking-wider uppercase border',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
