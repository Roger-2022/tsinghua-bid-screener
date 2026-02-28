
import React, { useState, useRef, useEffect } from 'react';
import { CandidateRecord, Language, CandidateProfile, ImportSummary, FeedbackRecord, NumericDecisionThresholds, DimensionWeight } from '../types';
import ResultView from './ResultView';
import { exportToCSV } from '../services/exportService';
import { translations } from '../i18n';
import { processImportData } from '../services/importService';
import { isExampleCandidate } from '../data/exampleCandidates';
import { isTestCandidate } from '../services/quickPreviewService';
import { deleteCandidate } from '../services/candidateService';
import ExportColumnSelector from './ExportColumnSelector';
import ImportInfoPanel from './ImportInfoPanel';
import BatchCalibrationPanel from './BatchCalibrationPanel';
import { saveFeedback, getFeedbackForCandidate, getFeedbackStats } from '../services/feedbackService';

interface LiveProgress {
  name: string;
  total: number;
  answered: number;
  isProbing: boolean;
  currentDimension: string;
  byDimension: Record<string, { total: number; done: number }>;
  timestamp: number;
}

interface Props {
  candidates: CandidateRecord[];
  lang: Language;
  onUpdate: (newList: CandidateRecord[]) => void;
  decisionThresholds: NumericDecisionThresholds;
  dimensionWeights: DimensionWeight[];
}

const AdminLibrary: React.FC<Props> = ({ candidates, lang, onUpdate, decisionThresholds, dimensionWeights }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [importResult, setImportResult] = useState<{ summary: ImportSummary; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = candidates.find(c => c.candidate_id === selectedId);
  const [editRecord, setEditRecord] = useState<CandidateRecord | null>(null);
  const [liveProgress, setLiveProgress] = useState<LiveProgress | null>(null);
  // AI Native: Feedback + Calibration
  const [showCalibration, setShowCalibration] = useState(false);
  const [feedbackOverride, setFeedbackOverride] = useState<string | null>(null); // candidate_id being overridden
  const [overrideDecision, setOverrideDecision] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const feedbackStats = getFeedbackStats();

  // Poll localStorage for live interview progress
  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem('tsinghua_live_progress');
        if (raw) {
          const parsed = JSON.parse(raw) as LiveProgress;
          // Only show if recent (within 5 minutes)
          if (Date.now() - parsed.timestamp < 300000) {
            setLiveProgress(parsed);
          } else {
            setLiveProgress(null);
          }
        } else {
          setLiveProgress(null);
        }
      } catch { setLiveProgress(null); }
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    star: candidates.filter(c => c.status_badge_text_zh === '示范').length,
    pass: candidates.filter(c => c.status === 'pass' && c.status_badge_text_zh !== '示范').length,
    hold: candidates.filter(c => c.status === 'hold').length,
    reject: candidates.filter(c => c.status === 'reject').length,
  };

  const statusColor = (status: string, badgeZh?: string) => {
    if (badgeZh === '示范') return '#8b5cf6';
    return status === 'pass' ? '#10b981' : status === 'reject' ? '#ef4444' : '#fbbf24';
  };

  const statusLabel = (status: string, badgeZh?: string) => {
    if (badgeZh === '示范') return isCN ? '示范' : 'Star';
    if (badgeZh === '淘汰') return isCN ? '淘汰' : 'Reject';
    if (isCN) return status === 'pass' ? '通过' : status === 'reject' ? '拒绝' : '待定';
    return status === 'pass' ? 'Pass' : status === 'reject' ? 'Reject' : 'Hold';
  };

  // ---- Edit handlers ----
  const handleEditStart = () => {
    if (selected) {
      if (isExampleCandidate(selected.candidate_id)) {
        alert(isCN ? '示例数据为只读，不可编辑' : 'Example data is read-only');
        return;
      }
      setEditRecord(JSON.parse(JSON.stringify(selected)));
      setIsEditing(true);
    }
  };

  const handleEditSave = () => {
    if (editRecord) {
      const s = editRecord.scores;
      const coreDims = [s.motivation, s.logic, s.reflection_resilience, s.innovation, s.commitment];
      const oeDims = [s.thinking_depth, s.multidimensional_thinking].filter((v): v is number => (v || 0) > 0);
      const allDims = [...coreDims, ...oeDims];
      const overall = Math.round((allDims.reduce((a, b) => a + b, 0) / allDims.length) * 10) / 10;
      const finalRecord: CandidateRecord = {
        ...editRecord,
        display_name: editRecord.profile.name,
        status_badge_text_zh:
          editRecord.status === 'pass' ? '通过' : editRecord.status === 'hold' ? '待定' : '拒绝',
        scores: { ...s, overall },
      };

      const updated = candidates.map(c =>
        c.candidate_id === finalRecord.candidate_id ? finalRecord : c
      );
      onUpdate(updated);
      setIsEditing(false);
      setEditRecord(null);
    }
  };

  const handleEditChange = (updated: CandidateRecord) => {
    setEditRecord(updated);
  };

  // ---- Delete (sync to Supabase) ----
  const handleDelete = async (id: string) => {
    if (isExampleCandidate(id)) {
      alert(isCN ? '示例数据不可删除' : 'Example data cannot be deleted');
      return;
    }
    const msg = isCN
      ? '确定要删除这位候选人吗？此操作不可撤销。'
      : 'Are you sure you want to delete this candidate? This cannot be undone.';
    if (confirm(msg)) {
      await deleteCandidate(id);
      const updated = candidates.filter(c => c.candidate_id !== id);
      onUpdate(updated);
      if (selectedId === id) setSelectedId(null);
    }
  };

  // ---- Manual add ----
  const handleManualAdd = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newCandidate: CandidateRecord = {
      candidate_id: newId,
      display_name: '新候选人',
      status: 'hold',
      status_badge_text_zh: '待定',
      profile: {
        name: '新候选人',
        identity: '其他',
        school_org: '',
        major_title: '',
        grade_level: '',
        entry_year_or_work_years: '',
        weekly_commit_h1: 0,
        weekly_commit_h2: 0,
        offline_interview: true,
        wechat_id: null,
        phone: null,
        email: null,
        past_projects: '',
        homework_willingness: true,
        leader_willingness: false,
        self_description: '',
      },
      scores: {
        motivation: 0,
        logic: 0,
        reflection_resilience: 0,
        innovation: 0,
        commitment: 0,
        overall: 0,
      },
      evidence: {
        core_evidence_points: [],
        risk_flags: [],
        admin_notes: '',
        qa_transcript: '',
      },
      decision_card: {
        zh: { summary: '', top_reasons: [], suggested_interview_focus: [] },
        en: { summary: '', top_reasons: [], suggested_interview_focus: [] },
      },
      admin_record: { visibility: 'admin_only', raw_payload: {}, search_keywords: [] },
      messages: [],
      timestamp: Date.now(),
    };
    onUpdate([...candidates, newCandidate]);
    setSelectedId(newId);
    setEditRecord(newCandidate);
    setIsEditing(true);
  };

  // ---- File import ----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setTimeout(() => {
        const fileType = file.name.endsWith('.json') ? 'json' : 'csv';
        const { summary, records, errors } = processImportData(text, fileType);
        onUpdate([...candidates, ...records]);
        setImportResult({ summary, errors });
        setIsImporting(false);
      }, 800);
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentRecord = isEditing ? editRecord : selected;
  const sorted = [...candidates].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col md:flex-row gap-6 h-[90vh]">
      {/* ===== Sidebar ===== */}
      <div className="w-full md:w-80 flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-700">
            {t.candidateLib} ({candidates.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleManualAdd}
              title={t.addManual}
              className="p-1.5 hover:bg-white rounded transition text-blue-500 border border-transparent hover:border-blue-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              title={t.exportBackup}
              className="p-1.5 hover:bg-white rounded transition text-tsinghua-500 border border-transparent hover:border-tsinghua-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              title={isCN ? '导入数据 (JSON/CSV)' : 'Import Data (JSON/CSV)'}
              className="p-1.5 hover:bg-white rounded transition text-gray-500 border border-transparent hover:border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json,.csv"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="p-2 flex gap-2 border-b bg-white text-[10px] justify-center flex-wrap">
          {stats.star > 0 && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold">
              {isCN ? '示范' : 'Star'}: {stats.star}
            </span>
          )}
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">
            {isCN ? '通过' : 'Pass'}: {stats.pass}
          </span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
            {isCN ? '待定' : 'Hold'}: {stats.hold}
          </span>
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
            {isCN ? '拒绝' : 'Reject'}: {stats.reject}
          </span>
          {/* AI Native: Feedback stats + Calibration */}
          {feedbackStats.totalReviewed > 0 && (
            <span className="px-2 py-0.5 bg-tsinghua-50 text-tsinghua-600 rounded-full font-bold">
              {(t as any).feedback_agree_rate}: {Math.round(feedbackStats.agreeRate * 100)}% ({feedbackStats.totalReviewed})
            </span>
          )}
          <button
            onClick={() => setShowCalibration(true)}
            className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold hover:bg-blue-100 transition-colors"
          >
            {(t as any).calibration_title}
          </button>
        </div>

        {/* Live interview progress */}
        {liveProgress && (
          <div className="p-3 border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                {isCN ? '正在答题' : 'Live Interview'}
              </span>
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-800">{liveProgress.name}</span>
              <span className="text-[10px] font-bold text-green-600">
                {liveProgress.answered}/{liveProgress.total}
                {liveProgress.isProbing && (
                  <span className="ml-1 text-amber-600">({isCN ? '追问中' : 'Probing'})</span>
                )}
              </span>
            </div>
            <div className="h-1.5 bg-green-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${liveProgress.total > 0 ? (liveProgress.answered / liveProgress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(liveProgress.byDimension).map(([dim, val]) => {
                const { total, done } = val as { total: number; done: number };
                return (
                  <span key={dim} className={`text-[8px] px-1.5 py-0.5 rounded font-bold border ${
                    done === total ? 'bg-green-100 text-green-700 border-green-200' : done > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}>
                    {dim.slice(0, 2)} {done}/{total}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm italic">{t.noData}</div>
          ) : (
            sorted.map(c => (
              <div
                key={c.candidate_id}
                className={`group relative w-full border-b transition-colors ${
                  selectedId === c.candidate_id ? 'bg-tsinghua-50' : 'hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => {
                    setSelectedId(c.candidate_id);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-4 ${
                    selectedId === c.candidate_id ? 'border-r-4 border-r-tsinghua-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      {c.display_name}
                      {isExampleCandidate(c.candidate_id) && (
                        <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-bold leading-none">{isCN ? '示例' : 'DEMO'}</span>
                      )}
                      {isTestCandidate(c.candidate_id) && (
                        <span className="text-[8px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded font-bold leading-none">{isCN ? '测试' : 'TEST'}</span>
                      )}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded text-white font-bold uppercase"
                      style={{ backgroundColor: statusColor(c.status, c.status_badge_text_zh) }}
                    >
                      {statusLabel(c.status, c.status_badge_text_zh)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {c.profile.school_org || (isCN ? '未填写' : 'N/A')} &middot; {c.profile.identity}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.admin_record.search_keywords.slice(0, 3).map((kw, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1 bg-white border border-gray-200 text-gray-500 rounded font-medium"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                  {/* AI Native: Feedback buttons */}
                  {!isExampleCandidate(c.candidate_id) && (
                    <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                      {(() => {
                        const fb = getFeedbackForCandidate(c.candidate_id);
                        if (fb) {
                          return (
                            <span className="text-[8px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold">
                              {fb.adminDecision === 'agree' ? '✓ ' : '⟳ '}{fb.adminDecision}
                            </span>
                          );
                        }
                        return (
                          <>
                            <button
                              onClick={() => { saveFeedback(c.candidate_id, c.status, 'agree'); setSelectedId(c.candidate_id); }}
                              className="text-[8px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold hover:bg-emerald-100"
                            >
                              {(t as any).feedback_agree}
                            </button>
                            <button
                              onClick={() => { setFeedbackOverride(c.candidate_id); setOverrideDecision(''); setOverrideReason(''); }}
                              className="text-[8px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-bold hover:bg-amber-100"
                            >
                              {(t as any).feedback_override}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </button>
                {!isExampleCandidate(c.candidate_id) && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(c.candidate_id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== Main Panel ===== */}
      <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-y-auto relative">
        {/* Import spinner overlay */}
        {isImporting && (
          <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-tsinghua-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-tsinghua-700 font-bold">{t.processing}</p>
          </div>
        )}

        {/* Import result overlay */}
        {importResult && (
          <div className="absolute inset-0 bg-white/95 z-30 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4">{t.importSuccess}</h3>
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div className="bg-gray-50 p-4 rounded-xl border">
                <p className="text-[10px] text-gray-400 uppercase font-bold">{t.totalRows}</p>
                <p className="text-2xl font-black">{importResult.summary.total_rows}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-[10px] text-green-600 uppercase font-bold">{t.importedRows}</p>
                <p className="text-2xl font-black text-green-700">{importResult.summary.imported_rows}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-[10px] text-red-600 uppercase font-bold">{t.failedRows}</p>
                <p className="text-2xl font-black text-red-700">{importResult.summary.failed_rows}</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto text-left w-full mb-8 bg-red-50 p-4 rounded border border-red-200 text-[10px] font-mono">
                {importResult.errors.map((err, i) => (
                  <p key={i}>&bull; {err}</p>
                ))}
              </div>
            )}
            <button
              onClick={() => setImportResult(null)}
              className="px-12 py-3 bg-tsinghua-500 text-white rounded-full font-bold shadow-lg hover:bg-tsinghua-600 transition"
            >
              {t.enterLib}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!currentRecord ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <svg className="w-20 h-20 mb-4 opacity-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
            <p className="text-lg italic text-gray-400">{t.selectCandidate}</p>
          </div>
        ) : (
          <div className="p-8 space-y-8 animate-fade-in">
            {/* Profile header bar */}
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <span className="w-2 h-6 bg-tsinghua-500 rounded" />
                {t.detailProfile}
              </h3>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditRecord(null);
                      }}
                      className="px-4 py-2 text-gray-500 font-bold hover:underline"
                    >
                      {t.cancelEdit}
                    </button>
                    <button
                      onClick={handleEditSave}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg font-bold shadow-md hover:bg-green-600 transition"
                    >
                      {t.saveEdit}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditStart}
                    className="px-6 py-2 bg-tsinghua-50 text-tsinghua-600 rounded-lg font-bold hover:bg-tsinghua-100 transition"
                  >
                    {t.editProfile}
                  </button>
                )}
              </div>
            </div>

            {/* Basic info section */}
            <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isEditing && currentRecord ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.name}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.name}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, name: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.wechat}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.wechat_id || ''}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, wechat_id: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.schoolUnit}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.school_org}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, school_org: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.major}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.major_title}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, major_title: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.gradeLevel}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.grade_level || ''}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, grade_level: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.yearOrExp}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.entry_year_or_work_years || ''}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, entry_year_or_work_years: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.weekPhase1}
                      </label>
                      <input
                        type="number"
                        value={currentRecord.profile.weekly_commit_h1}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, weekly_commit_h1: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.weekPhase2}
                      </label>
                      <input
                        type="number"
                        value={currentRecord.profile.weekly_commit_h2}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, weekly_commit_h2: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.phone}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.phone || ''}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, phone: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.email}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.email || ''}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, email: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {isCN ? '画像标签' : 'Profile Tags'}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.admin_record.search_keywords.join(', ')}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            admin_record: {
                              ...currentRecord.admin_record,
                              search_keywords: e.target.value
                                .split(/[，,、\s]+/)
                                .filter(k => k.length > 0),
                            },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.selfDesc}
                      </label>
                      <input
                        type="text"
                        value={currentRecord.profile.self_description || ''}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, self_description: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.projects}
                      </label>
                      <textarea
                        value={currentRecord.profile.past_projects || ''}
                        onChange={e =>
                          handleEditChange({
                            ...currentRecord,
                            profile: { ...currentRecord.profile, past_projects: e.target.value },
                          })
                        }
                        className="w-full bg-white border rounded px-2 py-1 text-sm h-16 outline-none focus:ring-1 focus:ring-tsinghua-300"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.wechat}
                      </p>
                      <p className="font-mono text-tsinghua-600">
                        {currentRecord.profile.wechat_id || (isCN ? '未录入' : 'N/A')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {isCN ? '身份与学校' : 'Identity & School'}
                      </p>
                      <p className="font-medium">
                        {currentRecord.profile.identity} &middot;{' '}
                        {currentRecord.profile.school_org || (isCN ? '未录入' : 'N/A')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {isCN ? '画像标签' : 'Profile Tags'}
                      </p>
                      <p className="font-bold text-tsinghua-700 tracking-wide">
                        &ldquo;{currentRecord.admin_record.search_keywords.join('、') || (isCN ? '无标签' : 'None')}&rdquo;
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {isCN ? '时间/地点' : 'Time/Location'}
                      </p>
                      <p className="font-medium">
                        {currentRecord.profile.weekly_commit_h1}h + {currentRecord.profile.weekly_commit_h2}h/{isCN ? '周' : 'wk'} &middot;{' '}
                        {currentRecord.profile.offline_interview
                          ? isCN ? '可面谈' : 'Offline OK'
                          : isCN ? '仅线上' : 'Online Only'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {isCN ? '联系方式' : 'Contact'}
                      </p>
                      <p className="font-mono text-gray-600 text-xs">
                        {currentRecord.profile.phone || (isCN ? '未录入' : 'N/A')} /{' '}
                        {currentRecord.profile.email || (isCN ? '未录入' : 'N/A')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.yearOrExp}
                      </p>
                      <p className="font-medium">
                        {currentRecord.profile.entry_year_or_work_years || (isCN ? '未填写' : 'N/A')}
                      </p>
                    </div>
                    {currentRecord.profile.self_description && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          {t.selfDesc}
                        </p>
                        <p className="font-medium text-tsinghua-600">
                          {currentRecord.profile.self_description}
                        </p>
                      </div>
                    )}
                    <div className="md:col-span-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        {t.projects}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 bg-white p-3 rounded border border-dashed border-gray-200 leading-relaxed whitespace-pre-wrap">
                        {currentRecord.profile.past_projects || (isCN ? '无过往项目记录' : 'No project history')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ResultView with radar, scores, decision card */}
            <ResultView
              record={currentRecord}
              isAdmin={true}
              lang={lang}
              isEditing={isEditing}
              onEditChange={handleEditChange}
            />
          </div>
        )}
      </div>

      {/* Export column selector modal */}
      {showExportModal && (
        <ExportColumnSelector
          lang={lang}
          candidates={candidates}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Import info panel modal */}
      {showImportModal && (
        <ImportInfoPanel
          lang={lang}
          onSelectFile={() => {
            setShowImportModal(false);
            setTimeout(() => fileInputRef.current?.click(), 100);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* AI Native: Feedback Override Modal */}
      {feedbackOverride && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setFeedbackOverride(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">{(t as any).feedback_override_to}</h3>
            <div className="flex gap-2">
              {['pass', 'hold', 'reject'].map(d => (
                <button
                  key={d}
                  onClick={() => setOverrideDecision(d)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${overrideDecision === d ? 'bg-tsinghua-500 text-white border-tsinghua-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              placeholder={(t as any).feedback_override_reason}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tsinghua-200"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setFeedbackOverride(null)}
                className="flex-1 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                {isCN ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  if (overrideDecision) {
                    const c = candidates.find(c => c.candidate_id === feedbackOverride);
                    if (c) saveFeedback(feedbackOverride, c.status, `override_${overrideDecision}` as FeedbackRecord['adminDecision'], overrideReason || undefined);
                    setFeedbackOverride(null);
                  }
                }}
                disabled={!overrideDecision}
                className="flex-1 py-2 text-xs font-bold bg-tsinghua-500 text-white rounded-lg hover:bg-tsinghua-600 disabled:opacity-50"
              >
                {isCN ? '确认覆盖' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Native: Batch Calibration Panel */}
      <BatchCalibrationPanel
        lang={lang}
        candidates={candidates}
        isOpen={showCalibration}
        onClose={() => setShowCalibration(false)}
        decisionThresholds={decisionThresholds}
        dimensionWeights={dimensionWeights}
      />
    </div>
  );
};

export default AdminLibrary;
