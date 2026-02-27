
import { PipelineStage, PromptVersion } from '../types';

const STORAGE_KEY = 'tsinghua_prompt_versions';
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
