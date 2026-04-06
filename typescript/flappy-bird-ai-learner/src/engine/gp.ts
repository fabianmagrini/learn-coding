import type {
  Program,
  Node,
  FuncNode,
  TerminalNode,
  FuncOp,
  Variable,
  Individual,
  EvolutionConfig,
} from '../types';

const FUNC_OPS: FuncOp[] = ['add', 'sub', 'mul', 'div', 'gt', 'lt'];
const VARIABLES: Variable[] = [
  'bird_y',
  'bird_velocity',
  'pipe_distance',
  'pipe_gap_y',
];

function randomInt(max: number, rng: () => number): number {
  return Math.floor(rng() * max);
}

function randomChoice<T>(arr: T[], rng: () => number): T {
  return arr[randomInt(arr.length, rng)];
}

/**
 * Grow a random expression tree up to `maxDepth` levels deep.
 *
 * At each node there is a 30 % chance of producing a terminal (leaf) even
 * when the depth budget allows further branching. This "ramped" approach
 * produces a mix of shallow and deep trees in the initial population.
 *
 * Terminal leaves are either a random variable (50 % chance) or a random
 * constant drawn from [−300, 300].
 *
 * @param maxDepth - Maximum depth of the generated tree (root is depth 0).
 * @param rng      - Seeded RNG to use; consumed in-place.
 * @returns A valid, immutable program tree.
 */
export function generateRandomProgram(
  maxDepth: number,
  rng: () => number
): Program {
  return generateNode(maxDepth, rng);
}

function generateNode(depth: number, rng: () => number): Node {
  if (depth <= 0 || rng() < 0.3) {
    return generateTerminal(rng);
  }
  return generateFunc(depth - 1, rng);
}

function generateTerminal(rng: () => number): TerminalNode {
  if (rng() < 0.5) {
    // Variable terminal — one of the four GP sensor inputs
    return { type: 'terminal', value: randomChoice(VARIABLES, rng) };
  } else {
    // Constant terminal — random value in [-300, 300]
    return { type: 'terminal', value: (rng() * 600) - 300 };
  }
}

function generateFunc(depth: number, rng: () => number): FuncNode {
  const op = randomChoice(FUNC_OPS, rng);
  return {
    type: 'func',
    op,
    left: generateNode(depth, rng),
    right: generateNode(depth, rng),
  };
}

// Internal type used by getAllNodes to carry parent/position info alongside
// each node so genetic operators can rewrite the tree in-place on a clone.
type NodeRef = {
  node: Node;
  parent: FuncNode | null;
  side: 'left' | 'right' | null;
  depth: number;
};

function getAllNodes(root: Node): NodeRef[] {
  const result: NodeRef[] = [];
  function traverse(
    node: Node,
    parent: FuncNode | null,
    side: 'left' | 'right' | null,
    depth: number
  ) {
    result.push({ node, parent, side, depth });
    if (node.type === 'func') {
      traverse(node.left, node, 'left', depth + 1);
      traverse(node.right, node, 'right', depth + 1);
    }
  }
  traverse(root, null, null, 0);
  return result;
}

function cloneNode(node: Node): Node {
  if (node.type === 'terminal') {
    return { ...node };
  }
  return {
    type: 'func',
    op: node.op,
    left: cloneNode(node.left),
    right: cloneNode(node.right),
  };
}

function getDepth(node: Node): number {
  if (node.type === 'terminal') return 0;
  return 1 + Math.max(getDepth(node.left), getDepth(node.right));
}

/**
 * Subtree crossover: produce two children by swapping a random subtree
 * between parent `a` and parent `b`.
 *
 * - Neither input is mutated; the operation works on deep clones.
 * - If either program is a single terminal (no subtrees to swap), the
 *   whole roots are exchanged instead.
 * - The swap point is chosen uniformly from all non-root nodes, so every
 *   subtree has an equal probability of being selected.
 *
 * @param a   - First parent program.
 * @param b   - Second parent program.
 * @param rng - Seeded RNG consumed in-place.
 * @returns A tuple `[childA, childB]` — new programs derived from `a` and `b`.
 */
export function crossover(
  a: Program,
  b: Program,
  rng: () => number
): [Program, Program] {
  const cloneA = cloneNode(a) as Program;
  const cloneB = cloneNode(b) as Program;

  const nodesA = getAllNodes(cloneA);
  const nodesB = getAllNodes(cloneB);

  // Prefer non-root nodes so the swap modifies the tree rather than
  // replacing it wholesale.
  const nonRootA = nodesA.filter((n) => n.parent !== null);
  const nonRootB = nodesB.filter((n) => n.parent !== null);

  // If either tree is a single terminal, swap the whole root
  if (nonRootA.length === 0 || nonRootB.length === 0) {
    return [cloneNode(b) as Program, cloneNode(a) as Program];
  }

  const refA = randomChoice(nonRootA, rng);
  const refB = randomChoice(nonRootB, rng);

  // Swap subtrees: splice a copy of B's subtree into A's position, and vice versa
  const subtreeA = cloneNode(refA.node);
  const subtreeB = cloneNode(refB.node);

  if (refA.parent && refA.side) {
    refA.parent[refA.side] = subtreeB;
  }
  if (refB.parent && refB.side) {
    refB.parent[refB.side] = subtreeA;
  }

  return [cloneA, cloneB];
}

/**
 * Apply one of three random mutations to a deep clone of `program`.
 *
 * The input is never modified. Whether mutation is applied at all is governed
 * by `rate` (a probability sampled at the start of the call).
 *
 * Mutation types (chosen uniformly at random when mutation fires):
 *  0. **Replace subtree** — grow a new random subtree at a random non-root
 *     node, respecting the remaining depth budget.
 *  1. **Change operator** — replace the operator of a random `func` node with
 *     a different randomly chosen operator.
 *  2. **Replace terminal** — swap a random leaf for a new variable or constant.
 *
 * @param program  - Source program (not mutated).
 * @param rate     - Probability in [0, 1] that any mutation occurs.
 * @param maxDepth - Maximum allowed tree depth; constrains subtree replacement.
 * @param rng      - Seeded RNG consumed in-place.
 * @returns A (possibly mutated) deep clone of `program`.
 */
export function mutate(
  program: Program,
  rate: number,
  maxDepth: number,
  rng: () => number
): Program {
  const clone = cloneNode(program) as Program;

  // Roll against mutation rate; skip all mutation if the roll fails
  if (rng() > rate) return clone;

  const nodes = getAllNodes(clone);
  const mutationType = randomInt(3, rng);

  if (mutationType === 0) {
    // Replace a random subtree
    const nonRoot = nodes.filter((n) => n.parent !== null);
    if (nonRoot.length > 0) {
      const ref = randomChoice(nonRoot, rng);
      // Limit depth of new subtree based on where we're inserting
      const remainingDepth = Math.max(0, maxDepth - ref.depth);
      const newSubtree = generateNode(remainingDepth, rng);
      if (ref.parent && ref.side) {
        ref.parent[ref.side] = newSubtree;
      }
    }
  } else if (mutationType === 1) {
    // Modify a random operator
    const funcNodes = nodes.filter((n) => n.node.type === 'func');
    if (funcNodes.length > 0) {
      const ref = randomChoice(funcNodes, rng);
      const funcNode = ref.node as FuncNode;
      funcNode.op = randomChoice(FUNC_OPS, rng);
    }
  } else {
    // Replace a random terminal
    const terminals = nodes.filter((n) => n.node.type === 'terminal');
    if (terminals.length > 0) {
      const ref = randomChoice(terminals, rng);
      const termNode = ref.node as TerminalNode;
      if (rng() < 0.5) {
        termNode.value = randomChoice(VARIABLES, rng);
      } else {
        termNode.value = (rng() * 600) - 300;
      }
    }
  }

  return clone;
}

/**
 * Tournament selection: draw `k` individuals at random (with replacement)
 * and return the one with the highest fitness.
 *
 * Larger `k` values increase selection pressure (the best individual wins
 * more often). `k = 3` is the project default.
 *
 * @param population - The current evaluated population.
 * @param k          - Tournament size (number of candidates to sample).
 * @param rng        - Seeded RNG consumed in-place.
 * @returns The winner of the tournament (a reference into `population`).
 */
export function tournamentSelect(
  population: Individual[],
  k: number,
  rng: () => number
): Individual {
  let best: Individual | null = null;
  for (let i = 0; i < k; i++) {
    const candidate = randomChoice(population, rng);
    if (best === null || candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best ?? population[0];
}

/**
 * Compute the fitness score for a single bird's run.
 *
 * Formula:
 * ```
 * fitness = framesSurvived + pipesPassed × 100 − flapCount × 0.1
 * ```
 *
 * The large pipe bonus (×100) strongly rewards birds that navigate obstacles.
 * The small flap penalty (×0.1) breaks ties in favour of smoother flight.
 *
 * @param framesSurvived - Total frames alive before collision or cap.
 * @param pipesPassed    - Number of pipe gaps successfully cleared.
 * @param flapCount      - Total number of flaps performed during the run.
 * @returns Fitness score (higher is better; may be negative for excessive flapping).
 */
export function evaluateFitness(
  framesSurvived: number,
  pipesPassed: number,
  flapCount: number
): number {
  return framesSurvived + pipesPassed * 100 - flapCount * 0.1;
}

/**
 * Serialise a node to a canonical S-expression string for comparison.
 * Example: `(add bird_y (mul pipe_distance 2))`
 */
function programToString(node: Node): string {
  if (node.type === 'terminal') {
    return String(node.value);
  }
  return `(${node.op} ${programToString(node.left)} ${programToString(node.right)})`;
}

/**
 * Measure population diversity as the fraction of structurally distinct
 * programs, using S-expression serialisation for comparison.
 *
 * - Returns `0` for populations of size ≤ 1 (undefined otherwise).
 * - Returns `1` when every individual has a unique program structure.
 * - Returns values near `0` when the population has converged to a single
 *   program (a sign of premature convergence).
 *
 * @param population - Any array of evaluated individuals.
 * @returns A diversity score in [0, 1].
 */
export function calculateDiversity(population: Individual[]): number {
  if (population.length <= 1) return 0;

  const strings = population.map((ind) => programToString(ind.program));
  const unique = new Set(strings);

  return unique.size / population.length;
}

/**
 * Breed the next generation from an evaluated, fitness-sorted population.
 *
 * Steps:
 *  1. **Elitism** — the top 5 % of individuals (minimum 1) pass unchanged.
 *  2. **Selection** — remaining slots are filled via tournament selection.
 *  3. **Crossover** — two parents produce two children via subtree swap.
 *  4. **Mutation** — each child is independently mutated with probability
 *     `config.mutationRate`.
 *  5. **Depth guard** — any child that exceeds `config.maxDepth` is replaced
 *     with a freshly generated random program.
 *
 * Note: returns `Program[]` rather than `Individual[]`; callers assign new
 * IDs and reset fitness to 0 before the next evaluation round.
 *
 * @param population - Current generation, ideally sorted by fitness descending.
 * @param config     - Evolution hyper-parameters.
 * @param rng        - Seeded RNG consumed in-place.
 * @returns An array of `config.populationSize` programs for the next generation.
 */
export function nextGeneration(
  population: Individual[],
  config: EvolutionConfig,
  rng: () => number
): Program[] {
  const newPrograms: Program[] = [];
  const eliteCount = Math.max(1, Math.floor(population.length * 0.05));

  // Elitism: keep top individuals unchanged
  const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
  for (let i = 0; i < eliteCount && i < sorted.length; i++) {
    newPrograms.push(cloneNode(sorted[i].program) as Program);
  }

  // Fill rest with crossover + mutation
  while (newPrograms.length < config.populationSize) {
    const parentA = tournamentSelect(population, config.tournamentSize, rng);
    const parentB = tournamentSelect(population, config.tournamentSize, rng);

    let [childA, childB] = crossover(parentA.program, parentB.program, rng);

    childA = mutate(childA, config.mutationRate, config.maxDepth, rng);
    childB = mutate(childB, config.mutationRate, config.maxDepth, rng);

    // Depth guard: replace over-deep children with fresh random programs
    if (getDepth(childA) <= config.maxDepth) {
      newPrograms.push(childA);
    } else {
      newPrograms.push(generateRandomProgram(config.maxDepth, rng));
    }

    if (newPrograms.length < config.populationSize) {
      if (getDepth(childB) <= config.maxDepth) {
        newPrograms.push(childB);
      } else {
        newPrograms.push(generateRandomProgram(config.maxDepth, rng));
      }
    }
  }

  return newPrograms.slice(0, config.populationSize);
}
