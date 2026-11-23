import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, MapPin, X } from 'lucide-react'
import {
  INDONESIA_CITY_RECORDS,
  normalizeLegacyCity,
  searchIndonesiaCities,
  type IndonesiaCityRecord,
} from '../../lib/cities'

export interface CityComboboxProps {
  id?: string
  value: string
  onChange: (city: string) => void
  placeholder?: string
  allowAll?: boolean
  allLabel?: string
  required?: boolean
  disabled?: boolean
  showIcon?: boolean
  inputClassName?: string
  ariaLabel?: string
}

interface ComboboxOption {
  value: string
  label: string
  province?: string
  isAll?: boolean
}

function renderHighlightedText(text: string, query: string): React.ReactNode {
  const cleanQuery = query.trim()
  if (!cleanQuery) return text
  const lowerText = text.toLowerCase()
  const lowerQuery = cleanQuery.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#E01E37]/25 text-white font-semibold px-0.5 rounded-[2px]">
        {text.slice(idx, idx + cleanQuery.length)}
      </mark>
      {text.slice(idx + cleanQuery.length)}
    </>
  )
}

export const CityCombobox: React.FC<CityComboboxProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Ketik nama kota atau kabupaten...',
  allowAll = false,
  allLabel = 'Semua Kota / Kabupaten',
  required = false,
  disabled = false,
  showIcon = true,
  inputClassName,
  ariaLabel,
}) => {
  const generatedId = useId()
  const inputId = id || `city-combobox-${generatedId}`
  const listboxId = `${inputId}-listbox`

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const displayValue = useMemo(() => {
    if (allowAll && (!value || value === 'Semua')) return ''
    return normalizeLegacyCity(value)
  }, [value, allowAll])

  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState(displayValue)
  const [hasTyped, setHasTyped] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // Keep input text synced when parent changes `value` externally (e.g., modal reset or filter reset)
  useEffect(() => {
    if (!isOpen) {
      setInputText(displayValue)
      setHasTyped(false)
    }
  }, [displayValue, isOpen])

  const searchQuery = hasTyped ? inputText : ''

  const options = useMemo<ComboboxOption[]>(() => {
    const matched: IndonesiaCityRecord[] = searchIndonesiaCities(searchQuery, 45)
    const list: ComboboxOption[] = []

    if (allowAll && (!searchQuery.trim() || 'semua'.includes(searchQuery.trim().toLowerCase()))) {
      list.push({
        value: 'Semua',
        label: allLabel,
        province: 'Seluruh Indonesia (514 Kota/Kabupaten)',
        isAll: true,
      })
    }

    for (const item of matched) {
      list.push({
        value: item.name,
        label: item.name,
        province: item.province,
      })
    }

    return list
  }, [searchQuery, allowAll, allLabel])

  // Keep activeIndex in bounds when options change
  useEffect(() => {
    if (!isOpen) return
    if (!hasTyped && displayValue) {
      const selectedIdx = options.findIndex((o) => o.value === displayValue)
      setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0)
    } else {
      setActiveIndex(0)
    }
  }, [options, isOpen, hasTyped, displayValue])

  // Scroll highlighted option into view during keyboard navigation
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeAndReconcile()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  })

  const selectOption = (opt: ComboboxOption) => {
    onChange(opt.value)
    setInputText(opt.isAll ? '' : opt.label)
    setHasTyped(false)
    setIsOpen(false)
  }

  const closeAndReconcile = () => {
    setIsOpen(false)
    if (hasTyped) {
      const trimmed = inputText.trim()
      if (!trimmed && allowAll) {
        onChange('Semua')
        setInputText('')
        setHasTyped(false)
        return
      }
      // If user typed an exact official name, commit it; otherwise restore last valid selection
      const exact = INDONESIA_CITY_RECORDS.find(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      )
      if (exact) {
        onChange(exact.name)
        setInputText(exact.name)
      } else {
        setInputText(displayValue)
      }
      setHasTyped(false)
    } else {
      setInputText(displayValue)
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (disabled) return
    setIsOpen(true)
    setHasTyped(false)
    // Select existing text so typing immediately replaces it
    if (e.currentTarget.value) {
      e.currentTarget.select()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setInputText(next)
    setHasTyped(true)
    if (!isOpen) setIsOpen(true)
    if (allowAll && next.trim() === '') {
      onChange('Semua')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else if (options.length > 0) {
        setActiveIndex((prev) => (prev + 1) % options.length)
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else if (options.length > 0) {
        setActiveIndex((prev) => (prev - 1 + options.length) % options.length)
      }
      return
    }

    if (e.key === 'Enter') {
      if (isOpen && options.length > 0) {
        e.preventDefault()
        const target = options[activeIndex] || options[0]
        if (target) selectOption(target)
      }
      return
    }

    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault()
        e.stopPropagation()
        closeAndReconcile()
      }
      return
    }

    if (e.key === 'Tab') {
      if (isOpen) {
        closeAndReconcile()
      }
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setInputText('')
    setHasTyped(true)
    if (allowAll) {
      onChange('Semua')
    }
    setIsOpen(true)
    inputRef.current?.focus()
  }

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (disabled) return
    if (isOpen) {
      closeAndReconcile()
    } else {
      setIsOpen(true)
      setHasTyped(false)
      inputRef.current?.focus()
    }
  }

  const activeOptionId =
    isOpen && options[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined

  const defaultInputClasses = `w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#8A8A8A] text-sm ${
    showIcon ? 'pl-10' : 'pl-3.5'
  } pr-14 py-3 min-h-[44px] transition-colors outline-none font-sans`

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        {showIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A8A8A]">
            <MapPin className="w-4 h-4" aria-hidden="true" />
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label={ariaLabel}
          required={required}
          disabled={disabled}
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName || defaultInputClasses}
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-0.5">
          {(inputText || (allowAll && value && value !== 'Semua')) && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={handleClear}
              aria-label="Hapus pilihan kota"
              className="p-1.5 text-[#8A8A8A] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={toggleDropdown}
            aria-label={isOpen ? 'Tutup daftar kota' : 'Buka daftar kota'}
            className="p-1.5 text-[#8A8A8A] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180 text-[#E01E37]' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[70] bg-[#141414] border border-[#323232] shadow-[0_16px_40px_rgba(0,0,0,0.85)] overflow-hidden">
          {options.length > 0 ? (
            <>
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label="Daftar Kota dan Kabupaten di Indonesia"
                className="max-h-60 overflow-y-auto divide-y divide-[#1E1E1E]"
              >
                {options.map((opt, idx) => {
                  const isHighlighted = idx === activeIndex
                  const isSelected = opt.isAll
                    ? !value || value === 'Semua'
                    : opt.value === displayValue
                  return (
                    <li
                      key={opt.value}
                      id={`${listboxId}-opt-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        selectOption(opt)
                      }}
                      className={`min-h-[44px] px-3.5 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-[#222222] text-white'
                          : 'bg-[#141414] text-[#E5E5E5] hover:bg-[#1E1E1E]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-sans leading-snug truncate">
                          {renderHighlightedText(opt.label, searchQuery)}
                        </div>
                        {opt.province && (
                          <div className="text-[11px] font-mono text-[#9E9E9E] truncate mt-0.5">
                            {renderHighlightedText(opt.province, searchQuery)}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#E01E37] shrink-0" aria-hidden="true" />
                      )}
                    </li>
                  )
                })}
              </ul>
              <div className="px-3.5 py-1.5 bg-[#101010] border-t border-[#242424] flex items-center justify-between text-[10px] font-mono text-[#9E9E9E]">
                <span>
                  {searchQuery.trim()
                    ? `${options.length} hasil terdekat`
                    : 'Ketik kota, kabupaten, atau provinsi (514 wilayah)'}
                </span>
                <span className="hidden sm:inline">↑↓ pilih · Enter konfirmasi</span>
              </div>
            </>
          ) : (
            <div className="px-4 py-5 text-center space-y-1">
              <p className="text-xs font-mono text-[#E5E5E5]">
                Kota/kabupaten &ldquo;{inputText.trim()}&rdquo; tidak ditemukan
              </p>
              <p className="text-[11px] font-sans text-[#9E9E9E]">
                Coba ketik nama kota, kabupaten, atau provinsi (contoh: Semarang, Bandung, Sleman, Bali).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
