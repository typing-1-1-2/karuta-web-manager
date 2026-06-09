/**
 * lib/utils.ts
 * Pure utility functions — no DOM dependencies
 */

export function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

export function fmtNum(n: number | string | null | undefined): string {
  if (n == null || n === '') return '—';
  const num = +n;
  return isNaN(num) ? String(n) : num.toLocaleString('es');
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Quality display helpers
export const QL: Record<string, string> = { '4':'★★★★','3':'★★★','2':'★★','1':'★','0':'—' };
export const QC: Record<string, string> = { '4':'#ffc825','3':'#b4b4b4','2':'#bf6f4a','1':'#858585','0':'#424c70' };
export const QS: Record<string, string> = {
  '4':'linear-gradient(135deg,#ffa214,#ffc825)',
  '3':'linear-gradient(135deg,#858585,#b4b4b4)',
  '2':'linear-gradient(135deg,#8a4836,#bf6f4a)',
  '1':'linear-gradient(135deg,#3d3d3d,#5d5d5d)',
  '0':'linear-gradient(135deg,#2a2f4e,#424c70)',
};
export const QB: Record<string, string> = { '4':'bq4','3':'bq3','2':'bq2','1':'bq1','0':'bq0' };

export const CDN       = 'https://d2l56h9h5tj8ue.cloudfront.net/images/cards/';
export const FRAME_CDN = 'https://wintertide.bz/assets/';
