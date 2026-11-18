import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface AccordionItemProps {
  number: string
  title: string
  content: string
  defaultOpen?: boolean
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  number,
  title,
  content,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-[#2A2A2A] bg-[#161616] transition-colors hover:border-[#383838]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left cursor-pointer min-h-[44px]"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-[#E01E37] font-bold">
            {number}
          </span>
          <span className="font-semibold text-white text-base md:text-lg">
            {title}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-[#9E9E9E] transition-transform duration-200',
            isOpen && 'rotate-180 text-[#E01E37]'
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="p-5 pt-0 text-sm md:text-base text-[#9E9E9E] leading-relaxed border-t border-[#222222]">
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}
