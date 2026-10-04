/**
 * CVbuilder v0.9.0 - Formal Domain Type Definitions
 * Serves as the central architectural contract bridging to the React + TypeScript migration.
 */

export type LanguageFilter = 'en' | 'es' | 'all';

export interface CvBasics {
  firstname?: string;
  lastname?: string;
  title?: string;
  headline?: string;
  role?: string;
  label?: string;
  email?: string;
  phone?: string;
  location?: string;
  homepage?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  photo?: string;
  [key: string]: unknown;
}

export interface CvWorkEntry {
  id?: string;
  role?: string;
  organization?: string;
  company?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  details?: string;
  highlights?: string[];
  selected?: boolean;
  lang?: LanguageFilter;
  [key: string]: unknown;
}

export interface CvEducationEntry {
  id?: string;
  degree?: string;
  institution?: string;
  area?: string;
  start?: string;
  end?: string;
  year?: string;
  date?: string;
  dissertation?: string;
  courses?: Array<string | { name: string }>;
  selected?: boolean;
  lang?: LanguageFilter;
  [key: string]: unknown;
}

export interface CvPublicationEntry {
  id?: string;
  title?: string;
  authors?: string;
  venue?: string;
  publisher?: string;
  year?: string;
  date?: string;
  type?: string;
  selected?: boolean;
  lang?: LanguageFilter;
  [key: string]: unknown;
}

export type CvSkills = Record<string, string[] | Array<{ name: string; level?: string; selected?: boolean; lang?: LanguageFilter }>>;

export interface CvSectionMeta {
  title?: string;
  include?: boolean;
  order?: number;
  [key: string]: unknown;
}

export interface CvStyleTheme {
  accentColor: string;
  font: 'sans' | 'serif' | 'mono';
  textAlign: 'left' | 'center' | 'right';
  photoLeftOffset?: number;
  photoTopOffset?: number;
}

export interface CvStyleConfig {
  cvTitle: string;
  style: string;
  preamble: string;
  footer: string;
  latexTemplate: string;
  htmlTemplate: string;
  mappers: Record<string, string>;
  theme: CvStyleTheme;
}

export interface CvInstance {
  style?: CvStyleConfig;
  overwrites: Record<string, unknown>;
  visibility: Record<string, boolean>;
  propertyNames?: Record<string, string>;
  sections?: Record<string, CvSectionMeta>;
}

export interface CvDatabase {
  basics: CvBasics;
  work_experience?: CvWorkEntry[];
  work?: CvWorkEntry[];
  education?: CvEducationEntry[];
  publications?: CvPublicationEntry[];
  skills?: CvSkills;
  instances?: Record<string, CvInstance>;
  _style?: CvStyleConfig;
  _sections?: Record<string, CvSectionMeta>;
  _activeInstanceName?: string | null;
  [sectionKey: string]: unknown;
}

export interface AtsCheckItem {
  name: string;
  passed: boolean;
  weight: number;
  tip: string;
}

export interface AtsScoreResult {
  score: number;
  checks: AtsCheckItem[];
}

export interface JobKeywordMatchResult {
  matched: string[];
  missing: string[];
  matchPercentage: number;
}

export interface AiProviderSettings {
  provider: 'gemini' | 'ollama';
  geminiApiKey: string;
  geminiModel: string;
  ollamaUrl: string;
  ollamaModel: string;
}

export interface ToastOptions {
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}
