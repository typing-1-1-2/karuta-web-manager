import { atom, map } from 'nanostores';

// ── Core data ──────────────────────────────────────────────
export interface CardEntry {
  character: string;
  series?: string;
  code?: string;
  quality?: string;
  edition?: string;
  number?: string;
  burnValue?: string;
  wishlists?: string;
  morphed?: string;
  trimmed?: string;
  frame?: string;
  grabber?: string;
  date?: string;
  tag?: string;
  effort?: string;
  print?: string;
}

export const $cards       = atom<CardEntry[]>([]);
export const $csvRaw      = atom<string>('');
export const $userId      = atom<string>('');
export const $activeTab   = atom<string>('personajes');
export const $theme       = atom<string>('dark');
export const $lang        = atom<string>('es');
export const $hasData     = atom<boolean>(false);

// ── Albums ─────────────────────────────────────────────────
export interface AlbumSlot { slots: (string | null)[] }
export interface AlbumBook {
  id: number;
  name: string;
  icon: string;
  bg: string;
  bgUrl: string;
  open: boolean;
  activePage: number;
  pages: AlbumSlot[];
}
export const $albums = atom<AlbumBook[]>([]);

// ── Tag overrides ──────────────────────────────────────────
export const $tagOverrides = atom<Record<string, string>>({});

// ── Selection mode ─────────────────────────────────────────
export const $selMode     = atom<boolean>(false);
export const $selSet      = atom<Set<string>>(new Set());

// ── Sketch ────────────────────────────────────────────────
export const $sketchSrc    = atom<HTMLImageElement | null>(null);
export const $sketchResult = atom<HTMLCanvasElement | null>(null);
export const $sketchLayers = atom<any[]>([]);
