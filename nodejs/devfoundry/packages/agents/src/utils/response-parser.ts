/**
 * Parses and validates structured JSON responses from Claude.
 */

import { AgentOutput, AgentType } from '../types/index.js';

/**
 * Thrown when a Claude response cannot be parsed into a valid {@link AgentOutput}.
 * The `rawResponse` property contains the original string for debugging.
 */
export class ResponseParseError extends Error {
  /**
   * @param message - Human-readable description of the parse failure.
   * @param rawResponse - The raw string returned by the model.
   */
  constructor(
    message: string,
    public readonly rawResponse: string,
  ) {
    super(message);
    this.name = 'ResponseParseError';
  }
}

/**
 * Extracts JSON from a model response that may contain markdown code fences.
 */
function extractJSON(text: string): string {
  // Try to extract from ```json ... ``` blocks first
  const jsonFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonFenceMatch) {
    return jsonFenceMatch[1].trim();
  }
  // Otherwise assume the whole text is JSON
  return text.trim();
}

/**
 * Parses a raw Claude response into a typed AgentOutput.
 */
export function parseAgentResponse(
  rawResponse: string,
  agentType: AgentType,
  task: string,
  repo: string,
): AgentOutput {
  const jsonText = extractJSON(rawResponse);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch (err) {
    throw new ResponseParseError(
      `Failed to parse agent response as JSON: ${String(err)}`,
      rawResponse,
    );
  }

  // Validate required fields
  if (typeof parsed['summary'] !== 'string') {
    throw new ResponseParseError('Response missing required field: summary', rawResponse);
  }

  if (!Array.isArray(parsed['files'])) {
    throw new ResponseParseError('Response missing required field: files (array)', rawResponse);
  }

  const files = (parsed['files'] as Array<Record<string, unknown>>).map((f) => ({
    path: String(f['path'] ?? ''),
    content: String(f['content'] ?? ''),
    operation: (f['operation'] as 'create' | 'update' | 'delete') ?? 'create',
  }));

  const paths: string[] =
    Array.isArray(parsed['paths'])
      ? (parsed['paths'] as unknown[]).map(String)
      : files.map((f) => f.path);

  const tests: string[] = Array.isArray(parsed['tests'])
    ? (parsed['tests'] as unknown[]).map(String)
    : [];

  const notes: string[] = Array.isArray(parsed['notes'])
    ? (parsed['notes'] as unknown[]).map(String)
    : [];

  return {
    agentType,
    task,
    repo,
    summary: parsed['summary'] as string,
    files,
    diff: typeof parsed['diff'] === 'string' ? parsed['diff'] : '',
    paths,
    tests,
    notes,
    rawResponse,
  };
}
