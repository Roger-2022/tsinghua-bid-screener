
import React, { useState } from 'react';
import { Language, EXPORT_COLUMNS, EXPORT_COLUMN_GROUPS } from '../types';
import { downloadCSVTemplate } from '../services/exportService';
import { translations } from '../i18n';

interface Props {
  lang: Language;
  onSelectFile: () => void;
  onClose: () => void;
}

const ImportInfoPanel: React.FC<Props> = ({ lang, onSelectFile, onClose }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const [showAllColumns, setShowAllColumns] = useState(false);

  const groupLabelMap: Record<string, string> = {
    basic: t.colGroupBasic, contact: t.colGroupContact, availability: t.colGroupAvailability,
    scores: t.colGroupScores, evaluation: t.colGroupEvaluation, admin: t.colGroupAdmin,
  };

  const getGroupForKey = (key: string): string => {
    for (const g of EXPORT_COLUMN_GROUPS) {
      if ((g.keys as readonly string[]).includes(key)) return g.id;
    }
    return 'admin';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </span>
              {t.importInfoTitle}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Supported formats */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t.importSupportedFormats}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl border-2 border-green-100 bg-green-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <span className="font-black text-green-700 text-sm">CSV</span>
                  <span className="text-[9px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">.csv</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{t.importCSVDesc}</p>
              </div>
              <div className="p-4 rounded-2xl border-2 border-blue-100 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📋</span>
                  <span className="font-black text-blue-700 text-sm">JSON</span>
                  <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">.json</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{t.importJSONDesc}</p>
              </div>
            </div>
          </div>

          {/* Format rules */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t.importFormatRules}</h3>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              {[t.importEncodingNote, t.importBoolNote, t.importQuoteNote, t.importJSONKeyNote].map((rule, i) => (
                <div key={i} className="flex gap-2 text-[11px] text-gray-600">
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expected columns */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.importExpectedColumns}</h3>
              <button
                onClick={() => setShowAllColumns(!showAllColumns)}
                className="text-[10px] text-tsinghua-500 hover:text-tsinghua-700 font-bold transition"
              >
                {showAllColumns ? (isCN ? '收起' : 'Collapse') : (isCN ? `展开全部 (${EXPORT_COLUMNS.length})` : `Show All (${EXPORT_COLUMNS.length})`)}
              </button>
            </div>

            <div className={`bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 ${showAllColumns ? '' : 'max-h-[260px] overflow-y-auto'}`}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-gray-100 sticky top-0">
                    <th className="py-2 px-3 text-left font-black text-gray-400 w-8">#</th>
                    <th className="py-2 px-3 text-left font-black text-gray-400">{isCN ? '分组' : 'Group'}</th>
                    <th className="py-2 px-3 text-left font-black text-gray-400">{isCN ? '中文列名 (CSV)' : 'CN Column (CSV)'}</th>
                    <th className="py-2 px-3 text-left font-black text-gray-400">{isCN ? '英文键名 (JSON)' : 'EN Key (JSON)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPORT_COLUMNS.map((col, i) => {
                    const groupId = getGroupForKey(col.key);
                    return (
                      <tr key={col.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="py-1.5 px-3 text-gray-300 font-mono">{i + 1}</td>
                        <td className="py-1.5 px-3 text-gray-400">{groupLabelMap[groupId]}</td>
                        <td className="py-1.5 px-3 font-bold text-gray-700">{col.zh}</td>
                        <td className="py-1.5 px-3 font-mono text-gray-500">{col.key}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Template download */}
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-700">{isCN ? '快速开始' : 'Quick Start'}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {isCN ? '下载含示例数据的模板文件，修改后直接导入' : 'Download a template with sample data, modify and import directly'}
                </p>
              </div>
              <button
                onClick={() => downloadCSVTemplate()}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold rounded-xl text-xs transition flex-shrink-0"
              >
                {t.importDownloadTemplate}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end flex-shrink-0 bg-white rounded-b-3xl">
          <button
            onClick={() => { onSelectFile(); onClose(); }}
            className="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200/50 transition text-sm"
          >
            {t.importSelectFileBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportInfoPanel;
