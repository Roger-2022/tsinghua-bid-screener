
import React, { useState, useRef, useEffect } from 'react';
import { CandidateRecord, Language, EXPORT_COLUMNS, EXPORT_COLUMN_GROUPS } from '../types';
import { exportToCSV } from '../services/exportService';
import { translations } from '../i18n';

interface ColumnItem {
  key: string;
  zh: string;
  en: string;
  selected: boolean;
  groupId: string;
}

interface Props {
  lang: Language;
  candidates: CandidateRecord[];
  onClose: () => void;
}

const STORAGE_KEY = 'tsinghua_export_columns';

const getGroupForKey = (key: string): string => {
  for (const g of EXPORT_COLUMN_GROUPS) {
    if ((g.keys as readonly string[]).includes(key)) return g.id;
  }
  return 'admin';
};

const getGroupLabel = (groupId: string, isCN: boolean, t: any): string => {
  const map: Record<string, string> = {
    basic: t.colGroupBasic,
    contact: t.colGroupContact,
    availability: t.colGroupAvailability,
    scores: t.colGroupScores,
    evaluation: t.colGroupEvaluation,
    admin: t.colGroupAdmin,
  };
  return map[groupId] || groupId;
};

const buildInitialColumns = (): ColumnItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { selectedKeys, orderedKeys } = JSON.parse(saved);
      const allKeys: string[] = EXPORT_COLUMNS.map(c => c.key);
      // Reconcile: keep valid keys in saved order, append any new keys
      const validOrdered = (orderedKeys as string[]).filter(k => allKeys.includes(k));
      const newKeys = allKeys.filter(k => !validOrdered.includes(k));
      const finalOrder = [...validOrdered, ...newKeys];
      const selectedSet = new Set(selectedKeys as string[]);
      // New keys are selected by default
      newKeys.forEach(k => selectedSet.add(k));

      return finalOrder.map(key => {
        const col = EXPORT_COLUMNS.find(c => c.key === key)!;
        return { key, zh: col.zh, en: col.en, selected: selectedSet.has(key), groupId: getGroupForKey(key) };
      });
    }
  } catch {}

  // Default: all selected, original order
  return EXPORT_COLUMNS.map(col => ({
    key: col.key,
    zh: col.zh,
    en: col.en,
    selected: true,
    groupId: getGroupForKey(col.key),
  }));
};

const ExportColumnSelector: React.FC<Props> = ({ lang, candidates, onClose }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const [columns, setColumns] = useState<ColumnItem[]>(buildInitialColumns);
  const dragItem = useRef<number | null>(null);

  // Persist to localStorage on every change
  useEffect(() => {
    const prefs = {
      selectedKeys: columns.filter(c => c.selected).map(c => c.key),
      orderedKeys: columns.map(c => c.key),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [columns]);

  const selectedCount = columns.filter(c => c.selected).length;

  const toggleColumn = (key: string) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, selected: !c.selected } : c));
  };

  const selectAll = () => setColumns(prev => prev.map(c => ({ ...c, selected: true })));
  const deselectAll = () => setColumns(prev => prev.map(c => ({ ...c, selected: false })));

  const resetOrder = () => {
    setColumns(EXPORT_COLUMNS.map(col => ({
      key: col.key,
      zh: col.zh,
      en: col.en,
      selected: true,
      groupId: getGroupForKey(col.key),
    })));
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragItem.current === null || dragItem.current === index) return;

    setColumns(prev => {
      const updated = [...prev];
      const dragged = updated.splice(dragItem.current!, 1)[0];
      updated.splice(index, 0, dragged);
      dragItem.current = index;
      return updated;
    });
  };

  const handleDragEnd = () => {
    dragItem.current = null;
  };

  const handleExport = () => {
    const selectedKeys = columns.filter(c => c.selected).map(c => c.key);
    if (selectedKeys.length === 0) return;
    exportToCSV(candidates, selectedKeys);
    onClose();
  };

  // Group columns for display with section headers
  const renderGroupedList = () => {
    const elements: React.ReactNode[] = [];
    let lastGroupId = '';

    columns.forEach((col, index) => {
      if (col.groupId !== lastGroupId) {
        lastGroupId = col.groupId;
        elements.push(
          <div key={`group-${col.groupId}-${index}`} className="sticky top-0 z-[1] px-3 py-1.5 bg-gray-50/95 backdrop-blur-sm text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
            {getGroupLabel(col.groupId, isCN, t)}
          </div>
        );
      }

      elements.push(
        <div
          key={col.key}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragEnter={(e) => handleDragEnter(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className={`flex items-center gap-3 px-4 py-2.5 bg-white border border-transparent rounded-xl cursor-grab active:cursor-grabbing hover:bg-gray-50 transition select-none group ${
            !col.selected ? 'opacity-40' : ''
          }`}
        >
          {/* Drag handle */}
          <svg className="w-4 h-4 text-gray-200 group-hover:text-gray-400 flex-shrink-0 transition" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
          </svg>
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={col.selected}
            onChange={() => toggleColumn(col.key)}
            className="w-4 h-4 rounded border-gray-300 text-tsinghua-500 focus:ring-tsinghua-300 flex-shrink-0 cursor-pointer"
          />
          {/* Column name */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-gray-700">{col.zh}</span>
            <span className="text-[10px] text-gray-400 ml-2">{col.en}</span>
          </div>
          {/* Key name badge */}
          <span className="text-[9px] font-mono text-gray-300 flex-shrink-0 hidden group-hover:inline">{col.key}</span>
        </div>
      );
    });

    return elements;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-br from-tsinghua-500 to-tsinghua-700 rounded-xl flex items-center justify-center text-white text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </span>
              {t.exportColumnTitle}
            </h2>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {(t.exportSelectedCount || '').replace('{count}', String(selectedCount)).replace('{total}', String(columns.length))}
              <span className="ml-3 text-gray-300">{t.exportDragHint}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable column list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {renderGroupedList()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-white rounded-b-3xl">
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[10px] px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg transition">
              {t.exportSelectAll}
            </button>
            <button onClick={deselectAll} className="text-[10px] px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg transition">
              {t.exportDeselectAll}
            </button>
            <button onClick={resetOrder} className="text-[10px] px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg transition">
              {t.exportResetOrder}
            </button>
          </div>
          <button
            onClick={handleExport}
            disabled={selectedCount === 0}
            className="px-6 py-2.5 bg-tsinghua-500 hover:bg-tsinghua-600 text-white font-bold rounded-xl shadow-lg shadow-tsinghua-200/50 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {t.exportCSVBtn} ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportColumnSelector;
