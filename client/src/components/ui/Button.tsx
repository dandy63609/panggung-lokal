import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'whatsapp' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  chamfer?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon, chamfer = true, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px]'

    const variantStyles = {
      primary: 'bg-[#E01E37] text-white hover:bg-[#C71B30] hover:shadow-[0_0_20px_rgba(224,30,55,0.45)] active:translate-y-[1px]',
      outline: 'bg-[#161616] text-[#E0E0E0] border border-[#2A2A2A] hover:border-[#E01E37] hover:text-white hover:bg-[#1E1E1E] active:translate-y-[1px]',
      whatsapp: 'bg-[#25D366] text-white hover:bg-[#1EBE5D] hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] active:translate-y-[1px]',
      ghost: 'bg-transparent text-[#9E9E9E] hover:text-white hover:bg-[#1E1E1E]',
    }

    const sizeStyles = {
      sm: 'px-3 py-2 text-xs gap-1.5',
      md: 'px-5 py-2.5 text-sm gap-2',
      lg: 'px-7 py-3.5 text-base gap-2.5',
    }

    const chamferClass = chamfer && variant !== 'ghost' ? 'chamfer-btn' : 'rounded-none'

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], chamferClass, className)}
        {...props}
      >
        <span>{children}</span>
        {icon && <span className="transition-transform duration-150 group-hover:translate-x-0.5">{icon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
