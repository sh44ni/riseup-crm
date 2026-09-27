import React, { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';

interface ScopeItemEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  minItems: number;
  maxItems: number;
  maxChars: number;
}

export function ScopeItemEditor({
  items,
  onChange,
  minItems,
  maxItems,
  maxChars
}: ScopeItemEditorProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleItemChange = (index: number, val: string) => {
    if (val.length <= maxChars) {
      const newItems = [...items];
      newItems[index] = val;
      onChange(newItems);
    }
  };

  const handleRemove = (index: number) => {
    if (items.length > minItems) {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
    }
  };

  const handleAdd = () => {
    if (items.length < maxItems) {
      onChange([...items, '']);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Scope of Work</span>
        <span className="text-xs text-slate-400 font-medium">{items.length} / {maxItems} items</span>
      </div>
      
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="group flex items-start gap-2 bg-white border border-slate-200 p-2 rounded-xl hover:border-slate-300 transition-colors focus-within:border-amber-400 focus-within:shadow-sm">
            <div className="flex flex-col items-center gap-1 pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
              <GripVertical size={14} className="text-slate-400 cursor-grab active:cursor-grabbing" />
            </div>
            
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#091b36] text-white flex items-center justify-center text-[9px] font-bold mt-0.5">
              {i + 1}
            </div>
            
            <div className="flex-grow relative">
              <textarea
                value={item}
                onChange={(e) => handleItemChange(i, e.target.value)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(null)}
                className="w-full text-sm font-medium text-slate-800 bg-transparent border-none outline-none resize-none min-h-[32px] overflow-hidden leading-snug py-1"
                rows={1}
                placeholder="Enter scope item description..."
              />
              {focusedIndex === i && (
                <div className={`absolute bottom-[-4px] right-2 text-[9px] font-bold ${item.length === maxChars ? 'text-red-500' : 'text-slate-400'}`}>
                  {item.length} / {maxChars}
                </div>
              )}
            </div>
            
            <button
              onClick={() => handleRemove(i)}
              disabled={items.length <= minItems}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-0.5 opacity-0 group-hover:opacity-100 ${items.length <= minItems ? 'cursor-not-allowed invisible' : ''}`}
              title="Remove item"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {items.length < maxItems && (
        <button
          onClick={handleAdd}
          className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-[#00b0ed] hover:border-[#00b0ed] hover:bg-sky-50 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Add Item
        </button>
      )}
    </div>
  );
}
