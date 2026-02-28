
import React, { useState, useEffect } from 'react';
import { Language, SystemSnapshot } from '../types';
import { listSnapshots, createSnapshot, restoreSnapshot, deleteSnapshot, fetchSnapshots } from '../services/backupService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { translations } from '../i18n';

interface Props {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

const BackupManager: React.FC<Props> = ({ lang, isOpen, onClose }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasCloud = isSupabaseConfigured();

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchSnapshots().then(snaps => {
        setSnapshots(snaps);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const label = newLabel.trim() || (isCN ? `手动备份 ${new Date().toLocaleString('zh-CN')}` : `Manual backup ${new Date().toLocaleString('en-US')}`);
    await createSnapshot(label);
    const snaps = await fetchSnapshots();
    setSnapshots(snaps);
    setNewLabel('');
  };

  const handleRestore = (id: string) => {
    const ok = restoreSnapshot(id);
    if (ok) window.location.reload();
  };

  const handleDelete = async (id: string) => {
    await deleteSnapshot(id);
    const snaps = await fetchSnapshots();
    setSnapshots(snaps);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return isCN ? d.toLocaleString('zh-CN') : d.toLocaleString('en-US');
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900 text-lg">{(t as any).backup_title || (isCN ? '版本备份' : 'Version Backup')}</h2>
            {hasCloud && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] font-bold rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/></svg>
                {isCN ? '云同步' : 'Cloud'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Create new */}
        <div className="px-6 py-4 border-b border-gray-50 flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder={isCN ? '备份标签（可选）' : 'Backup label (optional)'}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tsinghua-200"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-tsinghua-500 text-white text-sm font-bold rounded-lg hover:bg-tsinghua-600 transition-colors whitespace-nowrap"
          >
            {(t as any).backup_create || (isCN ? '创建备份' : 'Create Backup')}
          </button>
        </div>

        {/* Snapshots list */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh] space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-tsinghua-200 border-t-tsinghua-600 rounded-full animate-spin" />
            </div>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{isCN ? '暂无备份' : 'No backups yet'}</p>
          ) : (
            snapshots.map(snap => (
              <div key={snap.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{snap.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400">{formatTime(snap.timestamp)}</p>
                      {hasCloud && (
                        <span title={isCN ? '已同步至云端' : 'Synced to cloud'} className="text-blue-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/></svg>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3 flex-shrink-0">
                    {confirmRestore === snap.id ? (
                      <>
                        <button
                          onClick={() => handleRestore(snap.id)}
                          className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600"
                        >
                          {isCN ? '确认恢复' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmRestore(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300"
                        >
                          {isCN ? '取消' : 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmRestore(snap.id)}
                          className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100"
                        >
                          {(t as any).backup_restore || (isCN ? '恢复' : 'Restore')}
                        </button>
                        {!snap.label.includes('Baseline') && (
                          <button
                            onClick={() => handleDelete(snap.id)}
                            className="px-3 py-1 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100"
                          >
                            {(t as any).backup_delete || (isCN ? '删除' : 'Delete')}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupManager;
