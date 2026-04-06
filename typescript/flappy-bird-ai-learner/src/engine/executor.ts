import type { Program, Variable } from '../types';

/**
 * Evaluate a GP program tree given the current game variables, returning the
 * bird's "decision value" for this frame.
 *
 * The caller compares the result against `flapThreshold` (typically 0):
 * - result  >  threshold → flap
 * - result ≤  threshold → do nothing
 *
 * Output is clamped to [−1000, 1000] to guard against runaway multiplication
 * chains producing Infinity or NaN at intermediate nodes.
 *
 * @param program - Root node of the expression tree.
 * @param vars    - Current sensor readings mapped to the four GP variables.
 * @returns A number in [−1000, 1000].
 */
export function executeProgram(
  program: Program,
  vars: Record<Variable, number>
): number {
  const result = evaluate(program, vars);
  // Clamp output to [-1000, 1000]
  return Math.max(-1000, Math.min(1000, result));
}

/**
 * Recursively evaluate a node without clamping.
 *
 * Operator semantics:
 *  - `add` / `sub` / `mul` — standard arithmetic
 *  - `div`  — protected division: returns 0 when the divisor is exactly 0
 *  - `gt`   — returns 1 if left > right, −1 otherwise
 *  - `lt`   — returns 1 if left < right, −1 otherwise
 *
 * `gt` and `lt` return ±1 (rather than a boolean) so their output can be
 * composed with arithmetic operators in the same tree.
 */
function evaluate(
  node: Program,
  vars: Record<Variable, number>
): number {
  if (node.type === 'terminal') {
    if (typeof node.value === 'number') {
      return node.value;
    }
    // It's a variable — look up the current sensor reading
    return vars[node.value] ?? 0;
  }

  // It's a function node — evaluate both branches first
  const left = evaluate(node.left, vars);
  const right = evaluate(node.right, vars);

  switch (node.op) {
    case 'add':
      return left + right;
    case 'sub':
      return left - right;
    case 'mul':
      return left * right;
    case 'div':
      // Protected division: avoids division-by-zero crashes in evolved programs
      if (right === 0) return 0;
      return left / right;
    case 'gt':
      return left > right ? 1 : -1;
    case 'lt':
      return left < right ? 1 : -1;
    default:
      return 0;
  }
}
