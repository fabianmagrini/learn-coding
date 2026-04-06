import { useStore } from '../store/useStore';
import type { Node } from '../types';

const NODE_RADIUS = 22;
const LEVEL_HEIGHT = 70;
const MIN_H_SPACING = 50;

interface LayoutNode {
  node: Node;
  x: number;
  y: number;
  id: string;
  children: LayoutNode[];
}

function layoutTree(
  node: Node,
  depth: number,
  xOffset: number,
  xSpacing: number,
  id: string
): { layout: LayoutNode; width: number } {
  if (node.type === 'terminal') {
    return {
      layout: {
        node,
        x: xOffset,
        y: depth * LEVEL_HEIGHT + NODE_RADIUS + 10,
        id,
        children: [],
      },
      width: Math.max(MIN_H_SPACING, xSpacing),
    };
  }

  const childSpacing = Math.max(MIN_H_SPACING, xSpacing / 2);
  const leftResult = layoutTree(node.left, depth + 1, 0, childSpacing, id + 'L');
  const rightResult = layoutTree(node.right, depth + 1, 0, childSpacing, id + 'R');

  const totalWidth = leftResult.width + rightResult.width;

  // Center parent above children
  const leftX = xOffset;
  const rightX = xOffset + leftResult.width;
  const parentX = xOffset + leftResult.width / 2;

  // Adjust children x positions
  function shiftLayout(l: LayoutNode, dx: number): LayoutNode {
    return {
      ...l,
      x: l.x + dx,
      children: l.children.map((c) => shiftLayout(c, dx)),
    };
  }

  const shiftedLeft = shiftLayout(leftResult.layout, leftX);
  const shiftedRight = shiftLayout(rightResult.layout, rightX);

  return {
    layout: {
      node,
      x: parentX,
      y: depth * LEVEL_HEIGHT + NODE_RADIUS + 10,
      id,
      children: [shiftedLeft, shiftedRight],
    },
    width: totalWidth,
  };
}

function getLabel(node: Node): string {
  if (node.type === 'terminal') {
    if (typeof node.value === 'number') {
      return node.value.toFixed(1);
    }
    const abbrevMap: Record<string, string> = {
      bird_y: 'by',
      bird_velocity: 'bv',
      pipe_distance: 'pd',
      pipe_gap_y: 'pg',
    };
    return abbrevMap[node.value] ?? node.value;
  }
  const opMap: Record<string, string> = {
    add: '+',
    sub: '-',
    mul: '*',
    div: '/',
    gt: '>',
    lt: '<',
  };
  return opMap[node.op] ?? node.op;
}

function getNodeColor(node: Node): string {
  if (node.type === 'terminal') {
    if (typeof node.value === 'number') return '#FFE082';
    return '#A5D6A7';
  }
  const colors: Record<string, string> = {
    add: '#90CAF9',
    sub: '#F48FB1',
    mul: '#CE93D8',
    div: '#FFAB91',
    gt: '#80DEEA',
    lt: '#80DEEA',
  };
  return colors[node.op] ?? '#B0BEC5';
}

interface SVGNodeProps {
  layout: LayoutNode;
  parentX?: number;
  parentY?: number;
}

function SVGNode({ layout, parentX, parentY }: SVGNodeProps) {
  const label = getLabel(layout.node);
  const color = getNodeColor(layout.node);

  return (
    <g>
      {parentX !== undefined && parentY !== undefined && (
        <line
          x1={parentX}
          y1={parentY}
          x2={layout.x}
          y2={layout.y}
          stroke="#999"
          strokeWidth={1.5}
        />
      )}
      <circle
        cx={layout.x}
        cy={layout.y}
        r={NODE_RADIUS}
        fill={color}
        stroke="#555"
        strokeWidth={1.5}
      />
      <text
        x={layout.x}
        y={layout.y + 4}
        textAnchor="middle"
        fontSize={10}
        fontFamily="monospace"
        fill="#333"
      >
        {label.length > 4 ? label.slice(0, 4) : label}
      </text>
      {layout.children.map((child) => (
        <SVGNode
          key={child.id}
          layout={child}
          parentX={layout.x}
          parentY={layout.y}
        />
      ))}
    </g>
  );
}

function getTreeDimensions(layout: LayoutNode): { width: number; height: number } {
  let maxX = layout.x;
  let maxY = layout.y;

  function traverse(l: LayoutNode) {
    if (l.x > maxX) maxX = l.x;
    if (l.y > maxY) maxY = l.y;
    l.children.forEach(traverse);
  }
  traverse(layout);

  return { width: maxX + NODE_RADIUS + 10, height: maxY + NODE_RADIUS + 10 };
}

export function ProgramTree() {
  const { bestIndividual } = useStore();

  if (!bestIndividual) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
        <p>No program tree yet. Start evolution to see the best program.</p>
      </div>
    );
  }

  const { layout } = layoutTree(
    bestIndividual.program,
    0,
    0,
    300,
    'root'
  );
  const { width, height } = getTreeDimensions(layout);
  const svgWidth = Math.max(width + 20, 400);

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Best Program Tree</h2>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
        Fitness: {bestIndividual.fitness.toFixed(2)} |{' '}
        <span style={{ color: '#A5D6A7' }}>■ var</span>{' '}
        <span style={{ color: '#FFE082' }}>■ const</span>{' '}
        <span style={{ color: '#90CAF9' }}>■ op</span>
      </p>
      <div style={{ overflowX: 'auto' }}>
        <svg width={svgWidth} height={height + 10} style={{ display: 'block' }}>
          <SVGNode layout={layout} />
        </svg>
      </div>
    </div>
  );
}
