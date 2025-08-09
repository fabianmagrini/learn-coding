# Interactive Three.js Rubik’s Cube (2–20)

This is a single-file (index.html) Three.js app that renders an interactive Rubik’s Cube of any size from 2×2×2 up to 20×20×20. Rotate layers via UI controls, scramble, and watch a smooth step-by-step "Solve" animation (inverse of your moves). Built with performance in mind using InstancedMesh.

## Features
- Adjustable cube size (2–20) with instant rebuild
- Orbit camera controls (rotate, zoom, pan)
- Layer rotation via UI (axis, layer, direction)
- Scramble and smooth Solve animation (replays inverse history)
- Standard cube colors: white, yellow, red, orange, blue, green
- Scales to large cubes using InstancedMesh for cubies and stickers

## Quick start
Open directly in a modern browser (single-file):

```zsh
open index.html
```

If your browser restricts module import maps over file://, serve locally:

```zsh
# Option A: Python 3
python3 -m http.server 5173
# Then open http://localhost:5173

# Option B: Node (if you have http-server installed)
# npm i -g http-server
http-server -p 5173
```

Tested on recent Chrome/Edge/Safari.

## Usage
- Size: Enter 2–20 and click Build.
- Axis/Layer/Dir + Rotate: Turns the selected layer 90°.
- Scramble: Enqueues random moves (also recorded for Solve).
- Solve: Replays the inverse of the recorded moves with easing.
- Speed: Adjusts animation speed (affects new moves).
- Reset View: Reframes camera to fit the cube.
- Reset Cube: Instantly returns to solved state and clears history.
- Camera: Drag to orbit, Shift+Wheel to zoom, Ctrl+Drag to pan.

## Notes on the simulation
- The solver is a visual replay of the inverse of your move history, not a real Rubik’s solver.
- Stickers are rendered as instanced planes offset from each cubie face to avoid z-fighting.
- Only affected cubies update per animation frame; the whole cube snaps to the grid after each move.

## Performance tips
- Large cubes (e.g., 20×20×20) are supported but will push the GPU. Tips:
  - Reduce window size or devicePixelRatio in code if needed.
  - Lower animation speed for readability.
  - Use fewer scramble moves.

## Troubleshooting
- Error: Failed to resolve module specifier "three"
  - This app includes an import map for the bare specifier `three`. Use a modern browser or run via a local server (see Quick start).
- Nothing renders / black screen
  - Ensure WebGL is enabled in your browser.
  - Try resizing the window to trigger a layout update.
- Controls feel slow
  - Lower cube size or reduce browser zoom. Close other GPU-heavy tabs.

## File layout
- `index.html` — Entire app (UI, styles, rendering, controls, animation) in one file.

## Thanks
- Built with [Three.js](https://threejs.org/) and OrbitControls.
