// Program tree types
export type FuncOp = "add" | "sub" | "mul" | "div" | "gt" | "lt";
export type Variable = "bird_y" | "bird_velocity" | "pipe_distance" | "pipe_gap_y";

export type FuncNode = { type: "func"; op: FuncOp; left: Node; right: Node };
export type TerminalNode = { type: "terminal"; value: number | Variable };
export type Node = FuncNode | TerminalNode;
export type Program = Node;

export type Individual = { program: Program; fitness: number; id: string };

export type BirdState = {
  y: number;
  velocity: number;
  alive: boolean;
  flapCount: number;
  framesSurvived: number;
  pipesPassed: number;
};

export type Pipe = { x: number; gapY: number; gapHeight: number; passed: boolean };

export type GameState = { birds: BirdState[]; pipes: Pipe[]; frame: number };

export type GenerationStats = {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  diversity: number;
  bestProgram: Program;
};

export type EvolutionConfig = {
  populationSize: number;
  mutationRate: number;
  maxDepth: number;
  tournamentSize: number;
  flapThreshold: number;
  simulationSpeed: number;
};
