// Genera los PNGs del PWA a partir del shape de LogoMark con colores hardcodeados
// del theme light. Correr manualmente cuando cambie el logo o los colores:
//   node scripts/generate-pwa-icons.mjs
//
// Usa `sharp`, que ya viene como dep transitiva de Next.js — no agrega dependencias.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");

// Aproximación hex de los oklch del theme light (src/app/globals.css)
const COLORS = {
  background: "#FCF8EC",   // crema (oklch(0.987 0.022 95))
  primary: "#48835D",       // verde hoja (oklch(0.520 0.105 155))
  foreground: "#293D33",    // ink verde (oklch(0.265 0.020 155))
  accent: "#C8E082",        // lima (oklch(0.873 0.165 120))
};

// SVG base — clon del shape de src/components/illustrations/logo-mark.tsx
// con colores resueltos y un fondo redondeado para los íconos "any".
function buildSvg({ size, withBackground, safeZone }) {
  const bg = withBackground
    ? `<rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${COLORS.background}"/>`
    : "";

  // Escala el viewBox 48x48 original al tamaño objetivo, dejando safe zone para maskable.
  const inset = safeZone ? size * 0.2 : 0; // 20% padding cuando hay safe zone (maskable)
  const drawSize = size - inset * 2;
  const scale = drawSize / 48;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    <!-- Hoja arriba a la derecha -->
    <path d="M30 6c-1.4 4 .8 7.4 4.4 9.6 1.2-4.4-1-7.6-4.4-9.6Z" fill="${COLORS.primary}" opacity="0.95"/>
    <path d="M30 6c-1.4 4 .8 7.4 4.4 9.6" stroke="${COLORS.primary}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.5"/>
    <!-- Mango de la cesta -->
    <path d="M16 18c.6-4.8 4-8 8-8 4 0 7.4 3.2 8 8" stroke="${COLORS.foreground}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <!-- Cesta -->
    <path d="M8 18h32l-3.2 18a4 4 0 0 1-4 3.4H15.2a4 4 0 0 1-4-3.4L8 18Z" fill="${COLORS.accent}"/>
    <path d="M8 18h32l-3.2 18a4 4 0 0 1-4 3.4H15.2a4 4 0 0 1-4-3.4L8 18Z" stroke="${COLORS.foreground}" stroke-width="2" stroke-linejoin="round" fill="none"/>
    <!-- Líneas de la cesta -->
    <path d="M16 22v15M24 22v15M32 22v15" stroke="${COLORS.foreground}" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>
    <path d="M9.5 27h29M10.5 33h27" stroke="${COLORS.foreground}" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>
  </g>
</svg>`.trim();
}

async function renderPng({ size, outFile, withBackground = true, safeZone = false }) {
  const svg = buildSvg({ size, withBackground, safeZone });
  const out = resolve(publicDir, outFile);
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(`  wrote ${outFile} (${size}x${size})`);
}

async function main() {
  console.log("Generating PWA icons in /public ...");
  await renderPng({ size: 192, outFile: "icon-192.png", withBackground: true });
  await renderPng({ size: 512, outFile: "icon-512.png", withBackground: true });
  // Maskable: necesita safe zone (Android recorta los bordes para adaptive icons)
  await renderPng({ size: 512, outFile: "icon-maskable-512.png", withBackground: true, safeZone: true });
  // Apple touch icon: 180x180, sin transparencia
  await renderPng({ size: 180, outFile: "apple-touch-icon.png", withBackground: true });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
