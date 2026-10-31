/**
 * Feedback System - Dynamic Theming Engine
 * Strictly adheres to design.md Section 4 (Theming architecture) & Section 5 (Color tokens)
 */

export interface ColorPreset {
  id: string;
  name: string;
  seed: string;
  description: string;
}

export const THEME_PRESETS: Record<string, ColorPreset> = {
  blue: {
    id: "blue",
    name: "Apple Blue",
    seed: "#0071E3",
    description: "Apple's signature system blue. Clean, crisp, focused.",
  },
  indigo: {
    id: "indigo",
    name: "Indigo",
    seed: "#4C5BD4",
    description: "Calm, trustworthy, distinct from every status color.",
  },
  violet: {
    id: "violet",
    name: "Violet",
    seed: "#7C4DDB",
    description: "Distinctive, creative, modern SaaS feel.",
  },
  graphite: {
    id: "graphite",
    name: "Graphite",
    seed: "#3B4252",
    description: "Nearly neutral, minimal, high-signal focus.",
  },
  teal: {
    id: "teal",
    name: "Teal",
    seed: "#0E8F8F",
    description: "Fresh, technical, high readability.",
  },
  rose: {
    id: "rose",
    name: "Rose",
    seed: "#D6336C",
    description: "Vibrant, consumer-friendly, warm.",
  },
  orange: {
    id: "orange",
    name: "Orange",
    seed: "#E8590C",
    description: "Energetic, bold, high contrast.",
  },
  green: {
    id: "green",
    name: "Green",
    seed: "#2F9E44",
    description: "Natural, optimistic, fresh.",
  },
};

export const DEFAULT_THEME_PRESET = "blue";

export interface OKLCH {
  l: number; // 0 to 1
  c: number; // 0 to ~0.4
  h: number; // 0 to 360
}

/**
 * Converts sRGB hex to OKLCH color space coordinates.
 */
export function hexToOklch(hex: string): OKLCH {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split("").map((c) => c + c).join("") : cleanHex, 16);
  
  const rLinear = sRgbToLinear((num >> 16) / 255);
  const gLinear = sRgbToLinear(((num >> 8) & 255) / 255);
  const bLinear = sRgbToLinear((num & 255) / 255);

  // Linear sRGB to OKLab
  const l = 0.4122214708 * rLinear + 0.5363325363 * gLinear + 0.0514459929 * bLinear;
  const m = 0.2119034982 * rLinear + 0.6806995451 * gLinear + 0.1073969566 * bLinear;
  const s = 0.0883024619 * rLinear + 0.2817188376 * gLinear + 0.6299787005 * bLinear;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;

  return { l: L, c: C, h };
}

function sRgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Generates an 11-step brand scale in OKLCH from a seed color.
 * Follows design.md Section 4.3 lightness and chroma easing curve.
 */
export function generateBrandScale(seedHex: string): Record<number, string> {
  const { c: seedC, h } = hexToOklch(seedHex);

  const steps = [
    { step: 50, l: 0.97, cRatio: 0.25 },
    { step: 100, l: 0.94, cRatio: 0.4 },
    { step: 200, l: 0.88, cRatio: 0.6 },
    { step: 300, l: 0.8, cRatio: 0.75 },
    { step: 400, l: 0.7, cRatio: 0.9 },
    { step: 500, l: 0.6, cRatio: 1.0 },
    { step: 600, l: 0.52, cRatio: 1.0 },
    { step: 700, l: 0.44, cRatio: 0.9 },
    { step: 800, l: 0.36, cRatio: 0.8 },
    { step: 900, l: 0.3, cRatio: 0.7 },
    { step: 950, l: 0.22, cRatio: 0.6 },
  ];

  const scale: Record<number, string> = {};
  for (const { step, l, cRatio } of steps) {
    const c = (seedC * cRatio).toFixed(3);
    scale[step] = `oklch(${l} ${c} ${h.toFixed(1)})`;
  }

  return scale;
}

