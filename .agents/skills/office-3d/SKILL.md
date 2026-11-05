---
name: office-3d
description: Build and maintain the React Three Fiber office, character selection, camera controls, and WebGL fallback.
---

# Office 3D

Project-specific guidance synthesized from official upstream documentation; this is not an installed third-party skill. Read `src/OfficeScene.tsx` and `src/style.css` before editing.

Sources consulted:
- https://github.com/pmndrs/react-three-fiber — React renderer for Three.js. Fiber 9 pairs with React 19.
- https://github.com/pmndrs/drei — helpers, especially OrbitControls, Html, RoundedBox and ContactShadows.
- https://github.com/mrdoob/three.js — geometry, materials and lighting reference (consult when needed).

Workflow:
1. Keep scene data in React props; render with Fiber inside Canvas. Do not mutate React state every animation frame. Use refs/useFrame for animation.
2. Prefer procedural geometry for this MVP. New GLB/textures require recorded source/license and local assets; do not introduce runtime CDN/font requests by default.
3. Keep camera polar/zoom limits and reset control. Character and roster selection must match.
4. Use HTML buttons for selectable labels and the roster as a keyboard-accessible alternative. Preserve the WebGL error boundary and fallback.
5. Keep animation lightweight, cap DPR, reuse geometry where scale warrants it. Respect reduced-motion preferences for animations.
6. Verify `npm run build`, then inspect desktop and narrow mobile viewports in a browser. Test selecting characters, orbit/reset, resizing, and a fallback without WebGL. Check browser console errors.

Do not copy upstream source or arbitrary install scripts from a repository. Add dependencies through npm with lockfile changes and verify compatibility.
