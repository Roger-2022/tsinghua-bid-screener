
import { PipelineStage, PromptVersion } from '../types';
import { saveSetting, fetchSetting } from './settingsService';

const STORAGE_KEY = 'tsinghua_prompt_versions';
const SETTING_ID = 'prompt_versions';
const MAX_VERSIONS = 50;

const loadVersions = (): PromptVersion[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveVersions = (versions: PromptVersion[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  // Async sync to backend (fire-and-forget)
  saveSetting(SETTING_ID, versions).catch(e =>
    console.warn('[PromptVersions] Backend sync failed:', e)
  );
};

/** Fetch prompt versions from backend, merge with localStorage */
export const fetchVersionsFromBackend = async (): Promise<PromptVersion[]> => {
  const local = loadVersions();
  try {
    const remote = await fetchSetting<PromptVersion[]>(SETTING_ID);
    if (!remote || !Array.isArray(remote)) return local;

    // Merge by id: combine both sources, keep latest by timestamp
    const mergedMap = new Map<string, PromptVersion>();
    remote.forEach(v => mergedMap.set(v.id, v));
    local.forEach(v => {
      if (!mergedMap.has(v.id)) mergedMap.set(v.id, v);
    });

    const merged = Array.from(mergedMap.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_VERSIONS);

    // Update localStorage cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.warn('[PromptVersions] Backend fetch failed, using localStorage:', e);
    return local;
  }
};

export const savePromptVersion = (
  stage: PipelineStage,
  systemPrompt: string,
  inheritedContext: string,
  changeNote: string,
  author: 'admin' | 'system' = 'admin'
): PromptVersion => {
  const version: PromptVersion = {
    id: `pv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: Date.now(),
    stage,
    system_prompt: systemPrompt,
    inherited_context: inheritedContext,
    changeNote,
    author,
  };

  const versions = loadVersions();
  versions.unshift(version);
  // FIFO cap
  while (versions.length > MAX_VERSIONS) versions.pop();
  saveVersions(versions);

  return version;
};

export const getVersionHistory = (stage: PipelineStage): PromptVersion[] => {
  return loadVersions().filter(v => v.stage === stage);
};

export const getVersionById = (id: string): PromptVersion | undefined => {
  return loadVersions().find(v => v.id === id);
};

export const deleteVersion = (id: string): void => {
  const versions = loadVersions().filter(v => v.id !== id);
  saveVersions(versions);
};

/** Simple diff: count changed lines */
export const computeSimpleDiff = (oldText: string, newText: string): { added: number; removed: number } => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  const added = newLines.filter(l => !oldSet.has(l)).length;
  const removed = oldLines.filter(l => !newSet.has(l)).length;
  return { added, removed };
};
