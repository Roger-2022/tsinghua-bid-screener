
import React, { useState, useEffect } from 'react';
import { ApiConfig, Language, LLMProvider } from '../types';
import { LLM_PROVIDERS, getProviderConfig, DEFAULT_API_CONFIG } from '../services/llmService';
import { translations } from '../i18n';

interface Props {
  apiConfig: ApiConfig;
  onUpdate: (config: ApiConfig) => void;
  lang: Language;
  onClose: () => void;
}

const ApiSettings: React.FC<Props> = ({ apiConfig, onUpdate, lang, onClose }) => {
  const t = translations[lang];
  const isCN = lang === 'CN';
  const [local, setLocal] = useState<ApiConfig>({ ...apiConfig });
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [customModel, setCustomModel] = useState('');

  const provider = getProviderConfig(local.provider);
  const allModels = provider.models;

  // When provider changes, reset models to defaults (but keep custom base URL and models if set)
  useEffect(() => {
    const p = getProviderConfig(local.provider);
    const defaultModel = p.models.find(m => m.isDefault)?.id || p.models[0]?.id || '';
    setLocal(prev => {
      // If user has a custom baseUrl, keep it and don't override model names
      if (prev.baseUrl && prev.provider !== 'custom') {
        return { ...prev };
      }
      return {
        ...prev,
        baseUrl: prev.provider === 'custom' ? prev.baseUrl : '',
        fastModel: defaultModel || prev.fastModel,
        deepModel: (p.models.length > 1 ? (p.models[1]?.id || defaultModel) : defaultModel) || prev.deepModel,
      };
    });
  }, [local.provider]);

  const handleSave = () => {
    onUpdate(local);
    setTestResult({ ok: true, msg: isCN ? '配置已保存' : 'Configuration saved' });
    setTimeout(() => setTestResult(null), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { chatCompletion } = await import('../services/llmService');
      const result = await chatCompletion(local, {
        model: local.fastModel,
        messages: [
          { role: 'user', content: 'Say "API connection successful" in both Chinese and English. Keep it brief.' }
        ],
        temperature: 0.1,
        maxTokens: 100,
      });
      setTestResult({ ok: true, msg: `${isCN ? '连接成功' : 'Connected'}: ${result.slice(0, 80)}` });
    } catch (e) {
      setTestResult({ ok: false, msg: `${isCN ? '连接失败' : 'Failed'}: ${(e as Error).message.slice(0, 150)}` });
    }
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-md rounded-t-3xl z-10">
          <div>
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
              <span className="w-10 h-10 bg-gradient-to-br from-tsinghua-500 to-tsinghua-700 rounded-xl flex items-center justify-center text-white text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </span>
              {isCN ? 'API 模型配置' : 'API Model Settings'}
            </h2>
            <p className="text-xs text-gray-400 mt-1">{isCN ? '配置 AI 分析所需的大模型 API' : 'Configure LLM API for AI analysis'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">{isCN ? '选择模型提供商' : 'Select Provider'}</label>
            <div className="grid grid-cols-3 gap-2">
              {LLM_PROVIDERS.map(p => {
                const isSelected = local.provider === p.id;
                const displayName = isCN ? p.nameCN : p.name;
                const defaultModel = p.models.find(m => m.isDefault)?.name || p.models[0]?.name;
                return (
                  <button
                    key={p.id}
                    onClick={() => setLocal(prev => ({ ...prev, provider: p.id }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-tsinghua-400 bg-tsinghua-50 shadow-md'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-xs font-bold block ${isSelected ? 'text-tsinghua-700' : 'text-gray-700'}`}>{displayName}</span>
                    {p.models.length > 0 ? (
                      <span className={`text-[9px] ${isSelected ? 'text-tsinghua-500' : 'text-gray-400'}`}>
                        {isSelected ? defaultModel : `${p.models.length} ${isCN ? '个模型' : 'models'}`}
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-400">{isCN ? '自填模型名称' : 'Enter model name'}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">API Key</label>
              {provider.docUrl && (
                <a href={provider.docUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-tsinghua-500 hover:text-tsinghua-700 font-bold">
                  {isCN ? '获取 API Key →' : 'Get API Key →'}
                </a>
              )}
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={local.apiKey}
                onChange={e => setLocal(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={provider.apiKeyPlaceholder}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 pr-20 text-sm font-mono outline-none focus:ring-4 focus:ring-tsinghua-100 focus:border-tsinghua-300 transition-all"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600 font-bold"
              >
                {showKey ? (isCN ? '隐藏' : 'Hide') : (isCN ? '显示' : 'Show')}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {isCN ? '密钥仅存储在您的浏览器本地，不会上传到任何服务器' : 'Key is stored locally in your browser only, never sent to any server'}
            </p>
          </div>

          {/* Base URL — always visible, for proxy/gateway users */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Base URL {local.provider !== 'custom' && <span className="text-gray-300 normal-case font-medium">({isCN ? '留空使用官方地址' : 'leave empty for official endpoint'})</span>}
              </label>
            </div>
            <input
              type="text"
              value={local.baseUrl}
              onChange={e => setLocal(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder={provider.baseUrl || 'https://your-proxy.example.com/v1'}
              className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-mono outline-none focus:ring-4 focus:ring-tsinghua-100 focus:border-tsinghua-300 transition-all"
            />
            {local.baseUrl && local.provider !== 'custom' && (
              <p className="text-[10px] text-amber-500 mt-1.5 font-medium">
                ⚠️ {isCN ? '使用自定义地址，模型名称需与代理允许的模型一致' : 'Using custom URL — model names must match your proxy\'s allowed models'}
              </p>
            )}
          </div>

          {/* Model Selection */}
          <div className="grid grid-cols-2 gap-4">
            {/* Fast Model */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                {isCN ? '快速模型（评分/决策）' : 'Fast Model (Scoring/Decision)'}
              </label>
              {allModels.length > 0 && !local.baseUrl ? (
                <select
                  value={local.fastModel}
                  onChange={e => setLocal(prev => ({ ...prev, fastModel: e.target.value }))}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-tsinghua-100 focus:border-tsinghua-300 transition-all"
                >
                  {allModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    value={local.fastModel}
                    onChange={e => setLocal(prev => ({ ...prev, fastModel: e.target.value }))}
                    placeholder={isCN ? '输入模型名称，如 Qwen3-235B-A22B-Instruct' : 'Enter model name, e.g. gpt-4o'}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-mono outline-none focus:ring-4 focus:ring-tsinghua-100 focus:border-tsinghua-300 transition-all"
                  />
                  {allModels.length > 0 && local.baseUrl && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {allModels.slice(0, 3).map(m => (
                        <button key={m.id} onClick={() => setLocal(prev => ({ ...prev, fastModel: m.id }))}
                          className="text-[9px] px-2 py-0.5 bg-gray-100 hover:bg-tsinghua-100 text-gray-500 hover:text-tsinghua-600 rounded-full transition cursor-pointer">
                          {m.id}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Deep Model */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                {isCN ? '深度模型（画像生成）' : 'Deep Model (Profile Gen)'}
              </label>
              {allModels.length > 0 && !local.baseUrl ? (
                <select
                  value={local.deepModel}
                  onChange={e => setLocal(prev => ({ ...prev, deepModel: e.target.value }))}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-tsinghua-100 focus:border-tsinghua-300 transition-all"
                >
                  {allModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    value={local.deepModel}
                    onChange={e => setLocal(prev => ({ ...prev, deepModel: e.target.value }))}
                    placeholder={isCN ? '输入模型名称，如 Qwen3-235B-A22B-Instruct' : 'Enter model name, e.g. gpt-4o'}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3 text-sm font-mono outline-none focus:ring-4 focus:ring-tsinghua-100 focus:border-tsinghua-300 transition-all"
                  />
                  {allModels.length > 0 && local.baseUrl && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {allModels.slice(0, 3).map(m => (
                        <button key={m.id} onClick={() => setLocal(prev => ({ ...prev, deepModel: m.id }))}
                          className="text-[9px] px-2 py-0.5 bg-gray-100 hover:bg-tsinghua-100 text-gray-500 hover:text-tsinghua-600 rounded-full transition cursor-pointer">
                          {m.id}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className={`p-4 rounded-2xl border-2 ${
            local.apiKey
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${local.apiKey ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
              <div>
                <span className={`text-xs font-bold ${local.apiKey ? 'text-green-700' : 'text-amber-700'}`}>
                  {local.apiKey
                    ? `${provider.name} ${isCN ? '已配置' : 'Configured'}`
                    : (isCN ? '未配置 API Key' : 'API Key not set')
                  }
                </span>
                {local.apiKey && (
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {isCN ? '快速' : 'Fast'}: {local.fastModel} &middot; {isCN ? '深度' : 'Deep'}: {local.deepModel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-2xl border-2 text-sm font-medium animate-fade-in ${
              testResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {testResult.msg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={!local.apiKey || testing}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {testing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  {isCN ? '测试中...' : 'Testing...'}
                </span>
              ) : (isCN ? '测试连接' : 'Test Connection')}
            </button>
            <button
              onClick={handleSave}
              disabled={!local.apiKey}
              className="flex-1 py-3 bg-tsinghua-500 hover:bg-tsinghua-600 text-white font-bold rounded-xl shadow-lg shadow-tsinghua-200/50 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {isCN ? '保存配置' : 'Save Config'}
            </button>
          </div>

          {/* Quick Reference */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              {isCN ? '快速参考 — 主流模型 API 获取方式' : 'Quick Reference — Getting API Keys'}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {LLM_PROVIDERS.filter(p => p.docUrl && p.id !== 'custom').map(p => (
                <a
                  key={p.id}
                  href={p.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition group"
                >
                  <span className="w-5 h-5 bg-gray-200 group-hover:bg-tsinghua-100 rounded flex items-center justify-center text-[8px] font-black text-gray-500 group-hover:text-tsinghua-600 transition">
                    {p.name.charAt(0)}
                  </span>
                  <div>
                    <span className="font-bold text-gray-600 group-hover:text-tsinghua-600">{p.name}</span>
                    <span className="block text-gray-400 truncate">{p.docUrl.replace('https://', '')}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiSettings;
