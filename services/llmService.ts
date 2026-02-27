
import { ApiConfig, LLMProvider, LLMProviderConfig } from '../types';

// ---------------------------------------------------------------------------
// Provider registry — all mainstream LLM providers
// ---------------------------------------------------------------------------
export const LLM_PROVIDERS: LLMProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    nameCN: '谷歌 Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', isDefault: true },
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
    apiKeyPlaceholder: 'AIza...',
    docUrl: 'https://aistudio.google.com/apikey',
    supportsJsonMode: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    nameCN: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', isDefault: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'o3-mini', name: 'o3-mini' },
    ],
    apiKeyPlaceholder: 'sk-...',
    docUrl: 'https://platform.openai.com/api-keys',
    supportsJsonMode: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    nameCN: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', isDefault: true },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
    apiKeyPlaceholder: 'sk-ant-...',
    docUrl: 'https://console.anthropic.com/settings/keys',
    supportsJsonMode: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    nameCN: '深度求索 DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3', isDefault: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1' },
    ],
    apiKeyPlaceholder: 'sk-...',
    docUrl: 'https://platform.deepseek.com/api_keys',
    supportsJsonMode: true,
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    nameCN: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K', isDefault: true },
      { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K' },
      { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K' },
    ],
    apiKeyPlaceholder: 'sk-...',
    docUrl: 'https://platform.moonshot.cn/console/api-keys',
    supportsJsonMode: true,
  },
  {
    id: 'qwen',
    name: 'Alibaba Qwen (DashScope)',
    nameCN: '阿里通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus', isDefault: true },
      { id: 'qwen-turbo', name: 'Qwen Turbo' },
      { id: 'qwen-max', name: 'Qwen Max' },
      { id: 'qwen-long', name: 'Qwen Long' },
    ],
    apiKeyPlaceholder: 'sk-...',
    docUrl: 'https://dashscope.console.aliyun.com/apiKey',
    supportsJsonMode: true,
  },
  {
    id: 'zhipu',
    name: 'Zhipu GLM (BigModel)',
    nameCN: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus', isDefault: true },
      { id: 'glm-4-flash', name: 'GLM-4 Flash' },
      { id: 'glm-4-long', name: 'GLM-4 Long' },
    ],
    apiKeyPlaceholder: '...',
    docUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    supportsJsonMode: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    nameCN: 'OpenRouter 聚合',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', isDefault: true },
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
      { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3' },
      { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick' },
    ],
    apiKeyPlaceholder: 'sk-or-...',
    docUrl: 'https://openrouter.ai/keys',
    supportsJsonMode: true,
  },
  {
    id: 'custom',
    name: 'Custom API',
    nameCN: '自定义 / 第三方接入',
    baseUrl: '',
    models: [],
    apiKeyPlaceholder: 'your-api-key',
    docUrl: '',
    supportsJsonMode: true,
  },
];

export const getProviderConfig = (id: LLMProvider): LLMProviderConfig =>
  LLM_PROVIDERS.find(p => p.id === id) || LLM_PROVIDERS[LLM_PROVIDERS.length - 1];

// ---------------------------------------------------------------------------
// Default API config
// ---------------------------------------------------------------------------
export const DEFAULT_API_CONFIG: ApiConfig = {
  provider: 'gemini',
  apiKey: '',
  baseUrl: '',
  fastModel: 'gemini-2.0-flash',
  deepModel: 'gemini-2.5-pro-preview-06-05',
};

// ---------------------------------------------------------------------------
// Unified chat completion interface
// ---------------------------------------------------------------------------
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  jsonMode?: boolean;     // request JSON output
  maxTokens?: number;
}

// ---------------------------------------------------------------------------
// Gemini REST API (no SDK needed)
// ---------------------------------------------------------------------------
async function callGemini(config: ApiConfig, opts: ChatCompletionOptions): Promise<string> {
  const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  const url = `${baseUrl}/models/${opts.model}:generateContent?key=${config.apiKey}`;

  // Convert chat messages to Gemini format
  const systemInstruction = opts.messages.find(m => m.role === 'system')?.content;
  const contents = opts.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const body: any = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const generationConfig: any = {};
  if (opts.temperature !== undefined) generationConfig.temperature = opts.temperature;
  if (opts.maxTokens) generationConfig.maxOutputTokens = opts.maxTokens;
  if (opts.jsonMode) generationConfig.responseMimeType = 'application/json';
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

// ---------------------------------------------------------------------------
// Anthropic Messages API
// ---------------------------------------------------------------------------
async function callAnthropic(config: ApiConfig, opts: ChatCompletionOptions): Promise<string> {
  const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  const url = `${baseUrl}/messages`;

  const systemText = opts.messages.find(m => m.role === 'system')?.content;
  const messages = opts.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const body: any = {
    model: opts.model,
    messages,
    max_tokens: opts.maxTokens || 4096,
  };
  if (systemText) body.system = systemText;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Anthropic returned empty response');
  return text;
}

// ---------------------------------------------------------------------------
// OpenAI-compatible API (covers OpenAI, DeepSeek, Moonshot, Qwen, Zhipu, OpenRouter, custom)
// ---------------------------------------------------------------------------
async function callOpenAICompatible(config: ApiConfig, opts: ChatCompletionOptions): Promise<string> {
  const providerCfg = getProviderConfig(config.provider);
  const baseUrl = config.baseUrl || providerCfg.baseUrl;
  const url = `${baseUrl}/chat/completions`;

  const body: any = {
    model: opts.model,
    messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.jsonMode) body.response_format = { type: 'json_object' };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  // OpenRouter requires extra headers
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Tsinghua BID AI Screener';
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`${providerCfg.name} API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${providerCfg.name} returned empty response`);
  return text;
}

// ---------------------------------------------------------------------------
// Unified dispatch
// ---------------------------------------------------------------------------
export async function chatCompletion(config: ApiConfig, opts: ChatCompletionOptions): Promise<string> {
  if (!config.apiKey) {
    throw new Error('API Key not configured. Please set your API key in Settings (设置).');
  }

  switch (config.provider) {
    case 'gemini':
      return callGemini(config, opts);
    case 'anthropic':
      return callAnthropic(config, opts);
    default:
      return callOpenAICompatible(config, opts);
  }
}

// ---------------------------------------------------------------------------
// JSON-safe completion: parse JSON from response
// ---------------------------------------------------------------------------
export async function chatCompletionJSON<T = any>(config: ApiConfig, opts: ChatCompletionOptions): Promise<T> {
  // Add JSON instruction to system prompt for providers that don't support native JSON mode
  const provider = getProviderConfig(config.provider);
  let messages = opts.messages;

  if (!provider.supportsJsonMode || config.provider === 'anthropic') {
    // Append JSON instruction to the last user message
    messages = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        return { ...m, content: m.content + '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code fences, no extra text.' };
      }
      return m;
    });
  }

  const text = await chatCompletion(config, {
    ...opts,
    messages,
    jsonMode: provider.supportsJsonMode && config.provider !== 'anthropic',
  });

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse JSON from LLM response: ${cleaned.slice(0, 200)}...`);
  }
}
