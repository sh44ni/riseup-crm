import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X, AlertCircle } from 'lucide-react';
import {
  useUserCustomCategories,
  getCategoryStyle,
  MAX_CUSTOM_CATEGORIES,
} from '@/lib/personalTasksStore';

export interface PersonalWorkCategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  userId?: string | number | null;
  className?: string;
}

export function PersonalWorkCategorySelector({
  selectedCategory,
  onSelectCategory,
  userId,
  className = '',
}: PersonalWorkCategorySelectorProps) {
  const { categories, addCategory, removeCategory, canAddMore } =
    useUserCustomCategories(userId);

  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setNewLabel('');
      setErrorMessage(null);
    }
  }, [isAdding]);

  const handleSaveCategory = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) {
      setIsAdding(false);
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage('Category already exists');
      return;
    }
    if (!canAddMore) {
      setErrorMessage(`Maximum of ${MAX_CUSTOM_CATEGORIES} categories reached`);
      return;
    }

    const added = addCategory(trimmed);
    if (added) {
      onSelectCategory(trimmed);
      setIsAdding(false);
      setNewLabel('');
      setErrorMessage(null);
    } else {
      setErrorMessage('Could not add category');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCategory();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAdding(false);
    }
  };

  const handleRemoveCategory = (catToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCategory(catToRemove);
    if (selectedCategory.toLowerCase() === catToRemove.toLowerCase()) {
      const remaining = categories.filter(
        (c) => c.toLowerCase() !== catToRemove.toLowerCase()
      );
      onSelectCategory(remaining[0] || '');
    }
  };

  const isLegacySelected =
    Boolean(selectedCategory) &&
    !categories.some((c) => c.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 3-Column Slot Grid */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: MAX_CUSTOM_CATEGORIES }).map((_, index) => {
          // 1. Existing category chip
          if (index < categories.length) {
            const cat = categories[index];
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            const style = getCategoryStyle(cat, categories, index);

            return (
              <div
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`group relative p-2.5 rounded-xl border flex items-center justify-between gap-1.5 transition-all cursor-pointer select-none ${
                  isSelected
                    ? style.buttonActiveClass
                    : 'bg-slate-50/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border-slate-200/90 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs font-semibold'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dotClass}`} />
                  <span className="text-xs truncate font-bold" title={cat}>
                    {cat}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isSelected && <Check size={11} className="stroke-[3]" />}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCategory(cat, e)}
                    title={`Delete "${cat}"`}
                    aria-label={`Delete "${cat}" category`}
                    className="w-4 h-4 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-50 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X size={10} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          }

          // 2. Next available slot (Active input or "+ Add Label")
          if (index === categories.length) {
            if (isAdding) {
              return (
                <div
                  key="adding-slot"
                  className="p-1.5 px-2 rounded-xl border border-[#1878B8] bg-sky-50/90 dark:bg-sky-950/40 ring-2 ring-sky-400/25 shadow-xs flex items-center gap-1"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={newLabel}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Label name..."
                    maxLength={25}
                    className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none min-w-0"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveCategory}
                      className="w-5 h-5 rounded-md bg-[#1878B8] hover:bg-sky-500 text-white flex items-center justify-center shadow-2xs cursor-pointer transition-all"
                      title="Save category"
                      aria-label="Save category"
                    >
                      <Check size={11} className="stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="w-5 h-5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center cursor-pointer transition-all"
                      title="Cancel"
                      aria-label="Cancel adding category"
                    >
                      <X size={11} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key="add-slot"
                type="button"
                onClick={() => setIsAdding(true)}
                className="p-2.5 rounded-xl border border-dashed border-sky-300 dark:border-sky-800/80 bg-sky-50/50 hover:bg-sky-100/60 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 text-[#0284c7] dark:text-sky-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold shadow-2xs hover:scale-[1.01]"
              >
                <Plus size={13} className="stroke-[3]" />
                <span className="text-xs">Add Label</span>
              </button>
            );
          }

          // 3. Remaining empty slots
          return (
            <button
              key={`empty-slot-${index}`}
              type="button"
              onClick={() => setIsAdding(true)}
              className="p-2.5 rounded-xl border border-dashed border-slate-200/90 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
            >
              <Plus size={11} className="stroke-[2] opacity-50" />
              <span className="text-xs font-semibold opacity-60">Empty</span>
            </button>
          );
        })}
      </div>

      {/* Error message if duplicate or invalid */}
      {errorMessage && (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 px-1">
          <AlertCircle size={12} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Legacy category indicator if current note has an older or external category */}
      {isLegacySelected && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-slate-500 dark:text-slate-400">Current note tag:</span>
            <span className="font-bold underline truncate">{selectedCategory}</span>
          </div>
          {canAddMore && (
            <button
              type="button"
              onClick={() => {
                const added = addCategory(selectedCategory);
                if (added) {
                  onSelectCategory(selectedCategory);
                }
              }}
              className="shrink-0 ml-2 font-bold text-[#0284c7] hover:underline cursor-pointer"
            >
              + Save as custom
            </button>
          )}
        </div>
      )}
    </div>
  );
}
