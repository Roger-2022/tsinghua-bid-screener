import React, { useState } from 'react';
import { HelpWidgetConfig, Language } from '../types';
import { translations } from '../i18n';

interface Props {
  config: HelpWidgetConfig;
  lang: Language;
  isAdmin?: boolean;
  onSave?: (config: HelpWidgetConfig) => void;
}

const HelpWidget: React.FC<Props> = ({ config, lang, isAdmin = false, onSave }) => {
  const t = translations[lang];
  const [open, setOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<HelpWidgetConfig>(config);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (onSave) onSave(editConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      {/* Floating button — bottom left */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-tsinghua-600 text-white shadow-lg hover:bg-tsinghua-700 transition-all active:scale-95 flex items-center justify-center"
        title={(t as any).helpTitle}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 left-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">
          <div className="h-1 bg-gradient-to-r from-tsinghua-500 to-tsinghua-600"></div>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900">{(t as any).helpTitle}</h3>

            {/* Business Hours */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{(t as any).helpBusinessHours}</p>
              {isAdmin ? (
                <input
                  type="text"
                  value={editConfig.businessHours}
                  onChange={e => setEditConfig(prev => ({ ...prev, businessHours: e.target.value }))}
                  placeholder={lang === 'CN' ? '例如：周一至周五 9:00-12:00, 14:00-23:00' : 'e.g., Mon-Fri 9:00-12:00, 14:00-23:00'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200"
                />
              ) : (
                <p className="text-sm font-medium text-gray-700">
                  {config.businessHours || (t as any).helpNotSet}
                </p>
              )}
            </div>

            {/* Contact Email */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{(t as any).helpEmail}</p>
              {isAdmin ? (
                <input
                  type="email"
                  value={editConfig.contactEmail}
                  onChange={e => setEditConfig(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder={lang === 'CN' ? '例如：hlt24@mails.tsinghua.edu.cn' : 'e.g., hlt24@mails.tsinghua.edu.cn'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200"
                />
              ) : config.contactEmail ? (
                <a href={`mailto:${config.contactEmail}`} className="text-sm font-medium text-tsinghua-600 hover:text-tsinghua-800 underline">
                  {config.contactEmail}
                </a>
              ) : (
                <p className="text-sm font-medium text-gray-400">{(t as any).helpNotSet}</p>
              )}
            </div>

            {/* Extra Note */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{(t as any).helpExtraNote}</p>
              {isAdmin ? (
                <textarea
                  value={editConfig.extraNote}
                  onChange={e => setEditConfig(prev => ({ ...prev, extraNote: e.target.value }))}
                  rows={2}
                  placeholder={lang === 'CN' ? '可选补充说明' : 'Optional note'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-tsinghua-200 resize-none"
                />
              ) : config.extraNote ? (
                <p className="text-sm text-gray-600">{config.extraNote}</p>
              ) : null}
            </div>

            {/* Admin Save Button */}
            {isAdmin && (
              <>
                {saved && (
                  <div className="py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold text-center">
                    {lang === 'CN' ? '已保存' : 'Saved'}
                  </div>
                )}
                <button
                  onClick={handleSave}
                  className="w-full py-2 bg-tsinghua-600 text-white font-bold rounded-xl hover:bg-tsinghua-700 transition text-sm"
                >
                  {(t as any).helpSave}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default HelpWidget;
