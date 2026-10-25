import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';

export interface GoalSelectOption {
  value: string | number;
  label: string;
  icon?: string;
  description?: string;
}

interface GoalSelectProps {
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: GoalSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const GoalSelect: React.FC<GoalSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  ariaLabel,
  disabled = false,
  className,
  size = 'md',
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasValue = value !== '' && value !== undefined && value !== null;
  const selectedOption = hasValue
    ? options.find((opt) => String(opt.value) === String(value))
    : undefined;

  // Fecha ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Atualiza índice destacado ao abrir
  useEffect(() => {
    if (isOpen) {
      const currentIdx = options.findIndex((opt) => String(opt.value) === String(value));
      setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
    }
  }, [isOpen, options, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % Math.max(1, options.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev <= 0 ? Math.max(0, options.length - 1) : prev - 1
        );
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (highlightedIndex >= 0 && options[highlightedIndex]) {
        onChange(String(options[highlightedIndex].value));
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full flex items-center justify-between gap-2.5 rounded-xl border transition-all text-left',
          'bg-bg-secondary text-text-primary border-border-subtle hover:border-border-strong focus:border-text-primary focus:outline-none',
          isOpen && 'border-text-primary ring-1 ring-text-primary',
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-xs sm:text-sm',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <CategoryIcon
              name={selectedOption.icon}
              className="w-3.5 h-3.5 shrink-0 text-text-secondary"
            />
          )}
          <span
            className={cn(
              'truncate',
              selectedOption ? 'font-medium text-text-primary' : 'text-text-secondary'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 text-text-secondary transition-transform duration-200',
            isOpen && 'rotate-180 text-text-primary'
          )}
        />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={selectId}
          className={cn(
            'absolute left-0 right-0 mt-1.5 z-50 max-h-64 overflow-y-auto rounded-xl p-1.5 shadow-2xl',
            'bg-bg-card border border-border-strong text-text-primary',
            'min-w-[190px]'
          )}
        >
          {options.map((opt, idx) => {
            const isSelected = hasValue && String(opt.value) === String(value);
            const isHighlighted = idx === highlightedIndex;

            return (
              <li
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => {
                  onChange(String(opt.value));
                  setIsOpen(false);
                }}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors select-none',
                  isSelected
                    ? 'bg-text-primary text-bg-primary font-semibold'
                    : isHighlighted
                    ? 'bg-bg-secondary text-text-primary'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon && (
                    <CategoryIcon
                      name={opt.icon}
                      className={cn(
                        'w-3.5 h-3.5 shrink-0',
                        isSelected ? 'text-bg-primary' : 'text-text-secondary'
                      )}
                    />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
