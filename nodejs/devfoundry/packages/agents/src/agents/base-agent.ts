/**
 * BaseAgent — abstract foundation for all DevFoundry AI agents.
 *
 * Handles:
 * - Anthropic SDK initialization with mock fallback
 * - Standardised run() lifecycle
 * - Token usage tracking
 * - Error handling
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentResult,
  AgentType,
} from '../types/index.js';
import { buildMockOutput } from '../utils/mock-responses.js';
import { parseAgentResponse } from '../utils/response-parser.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.2;

export abstract class BaseAgent {
  protected readonly client: Anthropic | null;
  protected readonly model: string;
  protected readonly maxTokens: number;
  protected readonly temperature: number;
  protected readonly useMock: boolean;

  constructor(protected readonly agentType: AgentType, config: AgentConfig = {}) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;

    const apiKey = process.env['ANTHROPIC_API_KEY'];
    const allowMock = config.allowMock ?? true;

    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.useMock = false;
    } else if (allowMock) {
      this.client = null;
      this.useMock = true;
    } else {
      throw new Error(
        'ANTHROPIC_API_KEY is not set and mock mode is disabled. Set the API key or pass allowMock: true.',
      );
    }
  }

  /** System prompt that defines this agent's role and behaviour */
  protected abstract getSystemPrompt(): string;

  /** Builds the user-facing prompt for a specific input */
  protected abstract buildPrompt(input: AgentInput): string;

  /**
   * Runs the agent with the given input and returns a structured result.
   */
  async run(input: AgentInput): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      let output: AgentOutput;

      if (this.useMock) {
        output = buildMockOutput(this.agentType, input.task, input.repo);
      } else {
        output = await this.callAnthropic(input);
      }

      return {
        success: true,
        output,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Calls the Anthropic API and parses the response.
   */
  private async callAnthropic(input: AgentInput): Promise<AgentOutput> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    const userPrompt = this.buildPrompt(input);

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: this.getSystemPrompt(),
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawResponse = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');

    const output = parseAgentResponse(rawResponse, this.agentType, input.task, input.repo);

    output.usage = {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };

    return output;
  }
}
