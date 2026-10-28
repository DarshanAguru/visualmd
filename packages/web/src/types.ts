import { VmdDocument, VmdNode } from '@visualmd/compiler';

export type ThemeType =
  | 'light'
  | 'dark'
  | 'obsidian'
  | 'editorial'
  | 'midnight'
  | 'tokyo'
  | 'dracula'
  | 'forest'
  | 'nord'
  | 'retro'
  | 'notebook'
  | 'sepia'
  | 'paper'
  | 'minimal-light';

export type FontScalePreset =
  | 'tiny'
  | 'compact'
  | 'small'
  | 'default'
  | 'reading'
  | 'medium'
  | 'large'
  | 'xlarge'
  | 'huge';

export interface FontScaleOption {
  id: FontScalePreset;
  label: string;
  percentage: number;
  scale: number;
  description: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  doc_id: string;
  node_id: string;
  label: string | null;
  created_at: string;
}

export interface Annotation {
  id: string;
  doc_id: string;
  node_id: string;
  selected_text: string;
  color: string;
  note: string;
  occurrence_index?: number;
  table_cell?: string | null;
  created_at: string;
}

export interface DocumentMeta {
  id: string;
  folder_id: string | null;
  title: string;
  last_read_position: number;
  last_read_node: string | null;
  created_at: string;
  updated_at: string;
}

export interface FullDocument extends DocumentMeta {
  content: string;
  parsed_json: string;
  bookmarks: Bookmark[];
  annotations: Annotation[];
  parsedDoc?: VmdDocument;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
}

export interface DocumentVersion {
  id: string;
  doc_id: string;
  version_number: number;
  title: string;
  content: string;
  summary: string | null;
  created_at: string;
  content_length?: number;
}

export interface WorkspaceAsset {
  name: string;
  relativePath: string;
  size: number;
  ext: string;
  isImage: boolean;
  isPdf: boolean;
  folderId?: string | null;
  folderName?: string | null;
}

export interface WorkspaceMeta {
  id: string;
  name: string;
  path: string;
  dbPath?: string;
}
