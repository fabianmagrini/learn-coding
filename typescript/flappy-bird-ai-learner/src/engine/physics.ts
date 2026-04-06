import type { BirdState, GameState, Pipe } from '../types';

/** Downward acceleration applied to velocity every frame (pixels/frame²). */
export const GRAVITY = 0.5;

/** Velocity impulse applied when a bird flaps (negative = upward). */
export const FLAP_STRENGTH = -8;

/** Horizontal speed at which pipes move left each frame (pixels/frame). */
export const PIPE_SPEED = 3;

/** Width of each pipe obstacle (pixels). */
export const PIPE_WIDTH = 60;

/** Canvas width (pixels). */
export const GAME_WIDTH = 400;

/** Canvas height (pixels). Birds die when they leave this range. */
export const GAME_HEIGHT = 600;

/** Vertical size of the gap birds must fly through (pixels). */
export const PIPE_GAP = 150;

/** How many frames between successive pipe spawns. */
export const PIPE_INTERVAL = 90; // frames

/** Collision radius of each bird (pixels). */
export const BIRD_RADIUS = 12;

/** Fixed horizontal position of all birds on the canvas (pixels from left). */
export const BIRD_X = 80; // fixed x position for birds

/**
 * Mulberry32 seeded pseudo-random number generator.
 *
 * Returns a closure that produces uniformly distributed floats in [0, 1).
 * Using a seeded PRNG (rather than `Math.random`) makes every simulation
 * fully deterministic and reproducible given the same seed.
 *
 * @param seed - 32-bit integer seed value.
 * @returns A stateful RNG function.
 */
export function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createBird(): BirdState {
  return {
    y: GAME_HEIGHT / 2,
    velocity: 0,
    alive: true,
    flapCount: 0,
    framesSurvived: 0,
    pipesPassed: 0,
  };
}

/**
 * Create a fresh game state with `count` birds, all placed at the vertical
 * centre of the screen with zero velocity. No pipes are present at the start.
 *
 * @param count - Number of birds (one per GP individual being evaluated).
 * @param _seed - Reserved for future use; currently unused.
 * @returns A new `GameState` at frame 0.
 */
export function createGameState(count: number, _seed: number): GameState {
  const birds: BirdState[] = [];
  for (let i = 0; i < count; i++) {
    birds.push(createBird());
  }
  return {
    birds,
    pipes: [],
    frame: 0,
  };
}

function checkCollision(bird: BirdState, pipes: Pipe[]): boolean {
  // Check top/bottom boundary
  if (bird.y - BIRD_RADIUS <= 0 || bird.y + BIRD_RADIUS >= GAME_HEIGHT) {
    return true;
  }

  // Check pipe collisions
  for (const pipe of pipes) {
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_WIDTH;

    // Check if bird x overlaps with pipe x range
    if (BIRD_X + BIRD_RADIUS > pipeLeft && BIRD_X - BIRD_RADIUS < pipeRight) {
      const gapTop = pipe.gapY;
      const gapBottom = pipe.gapY + pipe.gapHeight;

      // Bird is outside the gap -> collision
      if (bird.y - BIRD_RADIUS < gapTop || bird.y + BIRD_RADIUS > gapBottom) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Advance the game by one frame, returning a new immutable `GameState`.
 *
 * Order of operations each tick:
 *  1. Move existing pipes left by `PIPE_SPEED`.
 *  2. Spawn a new pipe every `PIPE_INTERVAL` frames (gap position chosen with
 *     the seeded RNG so the layout is reproducible).
 *  3. Apply gravity then optionally a flap impulse to each alive bird.
 *  4. Detect collisions (boundary + pipe) and mark birds dead.
 *  5. Count newly cleared pipes and credit each alive bird.
 *
 * Determinism: the RNG is seeded as `mulberry32(seed + state.frame)`, so
 * providing the same `seed` for every tick of a replay produces an identical
 * game regardless of wall-clock time.
 *
 * @param state        - Current game state (not mutated).
 * @param flapDecisions - One boolean per bird; `true` means flap this frame.
 * @param seed         - Base seed for this game; combined with the frame
 *                       counter to derive the per-tick RNG.
 * @returns A new `GameState` representing the next frame.
 */
export function tickGame(
  state: GameState,
  flapDecisions: boolean[],
  seed: number
): GameState {
  const rng = mulberry32(seed + state.frame);
  const newFrame = state.frame + 1;

  // Update pipes: move existing pipes left and remove off-screen ones
  let pipes: Pipe[] = state.pipes
    .map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
    .filter((pipe) => pipe.x + PIPE_WIDTH > 0);

  // Generate new pipe at interval; gap position is in [50, GAME_HEIGHT - PIPE_GAP - 50]
  // so it is always reachable from both the top and the bottom of the canvas.
  if (newFrame % PIPE_INTERVAL === 0) {
    const minGapY = 50;
    const maxGapY = GAME_HEIGHT - PIPE_GAP - 50;
    const gapY = Math.floor(rng() * (maxGapY - minGapY) + minGapY);
    pipes.push({
      x: GAME_WIDTH,
      gapY,
      gapHeight: PIPE_GAP,
      passed: false,
    });
  }

  // Update birds: apply physics, then collision-check in the new position
  const newBirds: BirdState[] = state.birds.map((bird, i) => {
    if (!bird.alive) return bird;

    const shouldFlap = flapDecisions[i] ?? false;
    let velocity = bird.velocity + GRAVITY;
    if (shouldFlap) {
      // Flap overrides accumulated velocity with a fixed upward impulse
      velocity = FLAP_STRENGTH;
    }

    let y = bird.y + velocity;
    // Clamp y to canvas bounds (collision check below will catch boundary hits)
    y = Math.max(0, Math.min(GAME_HEIGHT, y));

    const newBird: BirdState = {
      ...bird,
      y,
      velocity,
      flapCount: shouldFlap ? bird.flapCount + 1 : bird.flapCount,
      framesSurvived: bird.framesSurvived + 1,
    };

    // Check collision with updated position
    const collided = checkCollision(newBird, pipes);
    if (collided) {
      return { ...newBird, alive: false };
    }

    return newBird;
  });

  // Mark pipes as passed once their right edge clears the bird's x position
  const updatedPipes = pipes.map((pipe) => {
    if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
      return { ...pipe, passed: true };
    }
    return pipe;
  });

  // Count pipes that were newly cleared this frame and credit all alive birds
  const newlyPassedCount = updatedPipes.filter(
    (p, i) => p.passed && !pipes[i]?.passed
  ).length;

  const finalBirds = newBirds.map((bird) => {
    if (!bird.alive) return bird;
    return { ...bird, pipesPassed: bird.pipesPassed + newlyPassedCount };
  });

  return {
    birds: finalBirds,
    pipes: updatedPipes,
    frame: newFrame,
  };
}
