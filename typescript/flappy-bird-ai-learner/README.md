# Flappy Bird AI Learner

An interactive web app that evolves Flappy Bird–playing programs using **Genetic Programming (GP)**. Multiple birds are controlled by evolved expression trees. Over generations, the population learns to survive longer — all visible in real-time.

## What it demonstrates

- **Emergent behaviour** — intelligent flight arising from simple arithmetic trees
- **Explainable AI** — the decision logic is a readable expression tree, not a black-box neural network
- **Evolutionary optimisation** — tournament selection, subtree crossover, and three mutation operators

---

## Quick start

```bash
npm install
npm run dev        # start dev server at http://localhost:5173
```

### Other commands

```bash
npm test           # run all tests (vitest)
npm run test:watch # watch mode
npm run build      # production build
npm run preview    # preview production build
```

---

## How to use the app

1. **Start** — click Start to begin evolution with the default config
2. **Speed up** — drag the Speed slider (1×–20×) to fast-forward generations
3. **Pause / Resume** — freeze evolution at any point to inspect the current state
4. **Inspect** — the Program Tree panel shows the best individual's decision logic
5. **Replay** — click Replay Best to watch the all-time best bird play in real-time
6. **Reset** — click Stop then Start to restart from generation 0

---

## Architecture

```
Browser main thread
├── React UI
│   ├── GameCanvas      canvas renderer (requestAnimationFrame)
│   ├── Dashboard       controls + metrics
│   ├── Charts          fitness history (Recharts)
│   └── ProgramTree     SVG tree of best program
└── Zustand store       manages Worker lifecycle + app state

Web Worker (background thread)
└── Evolution loop
    ├── simulation.ts   headless game simulation per individual
    ├── gp.ts           genetic operators + selection
    └── physics.ts      deterministic game physics

Shared (imported by both)
├── src/types/index.ts  all shared TypeScript types
├── src/engine/physics.ts
├── src/engine/executor.ts
├── src/engine/gp.ts
└── src/engine/simulation.ts
```

### Key design principle

The evolution loop runs **headless** in a Web Worker — no canvas, no rendering. Each generation it:

1. Simulates every individual's game (up to 2 000 frames) using the physics engine
2. Evaluates fitness: `frames_survived + pipes_passed × 100 − flap_count × 0.1`
3. Breeds the next generation (elitism + tournament selection + crossover + mutation)
4. Posts `generationComplete` stats to the main thread

The main thread renders independently using `requestAnimationFrame`.

---

## Bird "brain" — the Program tree

Each bird's decision is made by evaluating an expression tree every frame:

```
Node =
  | { type: "func";     op: add|sub|mul|div|gt|lt; left: Node; right: Node }
  | { type: "terminal"; value: number | Variable }

Variable = bird_y | bird_velocity | pipe_distance | pipe_gap_y
```

- `pipe_distance` — horizontal distance from the bird to the next pipe (pixels)
- `pipe_gap_y` — vertical centre of the next pipe's gap (pixels from top)

If the tree evaluates to a value **> flapThreshold** (default 0), the bird flaps.

---

## Genetic operators

| Operator | Description |
|---|---|
| **Crossover** | Swap a random subtree between two parents |
| **Mutate — replace subtree** | Grow a new random subtree at a random position |
| **Mutate — change operator** | Replace a func node's operator (e.g. `add` → `mul`) |
| **Mutate — replace terminal** | Swap a leaf for a different variable or constant |
| **Elitism** | Top 5% of individuals pass unchanged to the next generation |

---

## Configuration

| Parameter | Default | Range | Description |
|---|---|---|---|
| Population size | 50 | 10–500 | Individuals per generation |
| Mutation rate | 0.1 | 0.01–0.5 | Probability a child is mutated |
| Max depth | 5 | 3–8 | Maximum tree depth |
| Speed | 5× | 1×–20× | Simulation speed multiplier |
| Flap threshold | 0 | −10–10 | Output value required to trigger a flap |

Population size and max depth are locked while evolution is running.

---

## Project structure

```
src/
  types/index.ts          shared TypeScript types
  engine/
    physics.ts            game physics + seeded PRNG (mulberry32)
    executor.ts           GP tree evaluator
    gp.ts                 genetic operators, selection, diversity
    simulation.ts         headless game simulation + generation runner
    worker.ts             Web Worker evolution loop
  store/
    useStore.ts           Zustand store (Worker lifecycle + UI state)
  components/
    GameCanvas.tsx        Canvas renderer
    Dashboard.tsx         controls + metrics panel
    Charts.tsx            fitness over generations (Recharts)
    ProgramTree.tsx       SVG program tree visualiser
  tests/
    physics.test.ts       physics engine + PRNG (20 tests)
    executor.test.ts      tree evaluation + operators (20 tests)
    gp.test.ts            GP operators + selection (26 tests)
    simulation.test.ts    headless simulation + integration (17 tests)
    useStore.test.ts      Zustand store actions (19 tests)
    Dashboard.test.tsx    React component (22 tests)
```

---

## Tech stack

| Concern | Library |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| State management | Zustand 5 |
| Charts | Recharts 2 |
| Background computation | Native Web Workers |
| Testing | Vitest 2 + Testing Library |
