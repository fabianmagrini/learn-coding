import { LLMRequest, LLMResponse } from '../../../shared/types/common.types';
import { config } from '../../../shared/utils/config';
import { logger } from '../../../shared/utils/logger';
import { MockLlmService } from './mockLlmService';
import { OpenAIService } from './openaiService';

export class LlmRouter {
  private mockService: MockLlmService;
  private openaiService: OpenAIService | null = null;

  constructor() {
    this.mockService = new MockLlmService();
    
    if (config.LLM_PROVIDER === 'openai' && config.OPENAI_API_KEY) {
      try {
        this.openaiService = new OpenAIService();
        logger.info('OpenAI service initialized');
      } catch (error) {
        logger.error('Failed to initialize OpenAI service, falling back to mock', { error });
      }
    }
  }

  async processMessage(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.getProvider();
    
    logger.info('Processing message', { 
      provider,
      sessionId: request.sessionId,
      customerId: request.customerId 
    });

    try {
      switch (provider) {
        case 'openai':
          if (this.openaiService) {
            return await this.openaiService.processMessage(request);
          }
          // Fall through to mock if OpenAI not available
        case 'mock':
        default:
          return await this.mockService.processMessage(request);
      }
    } catch (error) {
      logger.error('LLM processing error, falling back to mock service', { 
        error, 
        provider,
        sessionId: request.sessionId 
      });
      
      // Always fall back to mock service on error
      return await this.mockService.processMessage(request);
    }
  }

  private getProvider(): 'openai' | 'mock' {
    if (config.LLM_PROVIDER === 'openai' && this.openaiService) {
      return 'openai';
    }
    return 'mock';
  }

  getStatus() {
    return {
      provider: this.getProvider(),
      openaiAvailable: !!this.openaiService,
      mockAvailable: true,
    };
  }
}