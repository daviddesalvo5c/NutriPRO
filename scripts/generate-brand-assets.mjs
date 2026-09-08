import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const sharedDefs = `
  <defs>
    <radialGradient id="outerVignette" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#08282e"/>
      <stop offset="65%" stop-color="#041619"/>
      <stop offset="100%" stop-color="#020a0d"/>
    </radialGradient>

    <radialGradient id="discBg" cx="50%" cy="45%" r="52%">
      <stop offset="0%" stop-color="#114e59"/>
      <stop offset="35%" stop-color="#0a353d"/>
      <stop offset="75%" stop-color="#051f24"/>
      <stop offset="100%" stop-color="#031417"/>
    </radialGradient>

    <linearGradient id="cyanRim" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9"/>
      <stop offset="25%" stop-color="#22d3ee"/>
      <stop offset="60%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#164e63"/>
    </linearGradient>

    <linearGradient id="innerRim" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0e7490"/>
      <stop offset="50%" stop-color="#22d3ee" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#083344"/>
    </linearGradient>

    <linearGradient id="appleSilver" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#e2e8f0"/>
      <stop offset="55%" stop-color="#94a3b8"/>
      <stop offset="85%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>

    <linearGradient id="appleCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>

    <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="20%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#67e8f9"/>
      <stop offset="55%" stop-color="#ffffff"/>
      <stop offset="80%" stop-color="#a5f3fc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>

    <linearGradient id="goldStem" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fde047"/>
    </linearGradient>

    <linearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0d9488"/>
      <stop offset="50%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#99f6e4"/>
    </linearGradient>

    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="pulseGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
`;

const badgeInnerContent = `
  <!-- Circular Outer Shield / Badge -->
  <g>
    <!-- Outer Glow Rim -->
    <circle cx="256" cy="256" r="216" fill="none" stroke="#22d3ee" stroke-width="2" opacity="0.4"/>
    <!-- Main Circular Emblem Disc -->
    <circle cx="256" cy="256" r="210" fill="url(#discBg)" stroke="url(#cyanRim)" stroke-width="8"/>
    <!-- Inner Accent Ring -->
    <circle cx="256" cy="256" r="198" fill="none" stroke="url(#innerRim)" stroke-width="3" opacity="0.6"/>
  </g>

  <!-- Apple Motif with Leaf and Stem -->
  <g transform="translate(0, 8)">
    <!-- Golden Stem (curving upward to the right) -->
    <path d="M 258 165 C 262 145, 272 130, 288 122" 
          fill="none" stroke="url(#goldStem)" stroke-width="8" stroke-linecap="round"/>

    <!-- 3 Golden Spark Rays radiating from stem tip -->
    <line x1="284" y1="102" x2="282" y2="88" stroke="#fde047" stroke-width="5" stroke-linecap="round"/>
    <line x1="300" y1="108" x2="310" y2="94" stroke="#facc15" stroke-width="5.5" stroke-linecap="round"/>
    <line x1="306" y1="126" x2="320" y2="126" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>

    <!-- Leaf (top-left of apple cleft) -->
    <g transform="rotate(-15 238 135)">
      <path d="M 238 152 C 205 142, 202 110, 238 98 C 255 125, 255 142, 238 152 Z" 
            fill="url(#leafGrad)" stroke="#e2e8f0" stroke-width="4" stroke-linejoin="round"/>
      <path d="M 238 152 C 234 135, 230 120, 226 106" 
            fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
    </g>

    <!-- Apple Glow shadow behind -->
    <path d="M 256 168 
             C 275 145, 332 145, 348 185
             C 365 225, 355 285, 325 328
             C 300 362, 270 368, 256 352
             C 242 368, 212 362, 187 328
             C 157 285, 147 225, 164 185
             C 180 145, 237 145, 256 168 Z" 
          fill="none" stroke="#22d3ee" stroke-width="18" opacity="0.25" filter="url(#softGlow)"/>

    <!-- Inner Cyan Apple Accent Line -->
    <path d="M 256 172 
             C 273 153, 324 153, 338 189
             C 353 225, 344 278, 317 317
             C 294 348, 269 353, 256 340
             C 243 353, 218 348, 195 317
             C 168 278, 159 225, 174 189
             C 188 153, 239 153, 256 172 Z" 
          fill="none" stroke="url(#appleCyan)" stroke-width="8" stroke-linejoin="round"/>

    <!-- Outer Chrome / Silver Apple Contour -->
    <path d="M 256 168 
             C 275 145, 332 145, 348 185
             C 365 225, 355 285, 325 328
             C 300 362, 270 368, 256 352
             C 242 368, 212 362, 187 328
             C 157 285, 147 225, 164 185
             C 180 145, 237 145, 256 168 Z" 
          fill="none" stroke="url(#appleSilver)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Cardiogram / ECG Heartbeat Line -->
  <g filter="url(#pulseGlow)">
    <!-- Cyan glow underlayer -->
    <path d="M 130 264 
             L 210 264 
             L 226 288 
             L 246 220 
             L 272 312 
             L 294 204 
             L 308 264 
             L 382 264" 
          fill="none" stroke="#22d3ee" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>

    <!-- Main Metallic Chrome ECG Pulse Line -->
    <path d="M 130 264 
             L 210 264 
             L 226 288 
             L 246 220 
             L 272 312 
             L 294 204 
             L 308 264 
             L 382 264" 
          fill="none" stroke="url(#pulseGrad)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
`;

// 1. Standard Square Icon (Vignette Background)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${sharedDefs}
  <rect width="512" height="512" rx="104" fill="url(#outerVignette)"/>
  ${badgeInnerContent}
</svg>`;

// 2. Transparent Emblem (For in-app Navbar / Brand / Badges)
const transparentIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${sharedDefs}
  ${badgeInnerContent}
</svg>`;

// 3. Maskable PWA Icon (Safely padded inside 72% center circle)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${sharedDefs}
  <rect width="512" height="512" fill="url(#outerVignette)"/>
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    ${badgeInnerContent}
  </g>
</svg>`;

// 4. Full Product Logo Banner (Emblem + NUTRIFIT PRO + Subtitle)
const fullLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="800" height="480">
  ${sharedDefs}
  <rect width="800" height="480" rx="32" fill="url(#outerVignette)"/>
  
  <g transform="translate(400, 168) scale(0.68) translate(-256, -256)">
    ${badgeInnerContent}
  </g>

  <!-- Typography -->
  <g text-anchor="middle">
    <text x="400" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="44" font-weight="900" letter-spacing="3">
      <tspan fill="#ffffff">NUTRIFIT </tspan>
      <tspan fill="#2dd4bf">PRO</tspan>
    </text>
    <text x="400" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="19" font-weight="500" fill="#5eead4" letter-spacing="1">
      Calculadora Nutricional &amp; Perfil de Usuario
    </text>
  </g>
</svg>`;

// Save SVGs to public directory
fs.writeFileSync('public/icon.svg', iconSvg);
fs.writeFileSync('public/logo-icon.svg', transparentIconSvg);
fs.writeFileSync('public/logo-full.svg', fullLogoSvg);

// Function to render PNG buffer
const renderToPng = (svgString, size) => {
  const resvg = new Resvg(svgString, { fitTo: { mode: 'width', value: size } });
  return resvg.render().asPng();
};

// Generate all PNG resolutions
console.log('Rendering 512x512 standard icon...');
const png512 = renderToPng(iconSvg, 512);
fs.writeFileSync('public/pwa-512x512.png', png512);

console.log('Rendering 192x192 standard icon...');
const png192 = renderToPng(iconSvg, 192);
fs.writeFileSync('public/pwa-192x192.png', png192);

console.log('Rendering 512x512 maskable icon (safe zone)...');
const pngMaskable = renderToPng(maskableSvg, 512);
fs.writeFileSync('public/pwa-maskable-512x512.png', pngMaskable);

console.log('Rendering 180x180 apple touch icon...');
const pngApple = renderToPng(iconSvg, 180);
fs.writeFileSync('public/apple-touch-icon.png', pngApple);

console.log('Rendering 64x64 favicon...');
const pngFavicon = renderToPng(iconSvg, 64);
fs.writeFileSync('public/favicon.ico', pngFavicon);
fs.writeFileSync('public/favicon.png', pngFavicon);

console.log('Rendering 800x480 full banner logo...');
const pngFull = renderToPng(fullLogoSvg, 800);
fs.writeFileSync('public/logo-full.png', pngFull);

console.log('Rendering 128x128 transparent emblem...');
const pngTransparent = renderToPng(transparentIconSvg, 128);
fs.writeFileSync('public/logo-emblem.png', pngTransparent);

console.log('ALL ASSETS GENERATED SUCCESSFULLY!');
