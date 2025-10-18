import { env } from '../config/env.js';
import { AICoachRequest, AIHelpRequest, AIResponse } from '../types/index.js';
import { AI_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';

// Simple in-memory cache for AI responses
const responseCache = new Map<string, { response: AIResponse; timestamp: number }>();

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter AI service
 * Handles communication with OpenRouter API for coaching and help
 */
class AIService {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY;
    this.model = env.OPENROUTER_MODEL;
    this.baseUrl = env.OPENROUTER_BASE_URL;
  }

  /**
   * AI Coach endpoint
   * Provides performance coaching based on metrics
   */
  async coach(request: AICoachRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      logger.warn('AI coaching requested but OPENROUTER_API_KEY not configured');
      return {
        answer: 'AI coaching is not available. Please configure OPENROUTER_API_KEY.',
        cached: false,
      };
    }

    const cacheKey = this.getCacheKey('coach', request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('Returning cached AI coach response');
      return { ...cached, cached: true };
    }

    logger.info('AI coach request', { agentId: request.agentId, question: request.question });

    try {
      const systemPrompt = this.buildCoachSystemPrompt();
      const userPrompt = this.buildCoachUserPrompt(request);

      const answer = await this.callOpenRouter(systemPrompt, userPrompt);

      const response: AIResponse = {
        answer,
        cached: false,
      };

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      logger.error('AI coach error', { error });
      return {
        answer: 'Unable to generate coaching insights at this time. Please try again later.',
        cached: false,
      };
    }
  }

  /**
   * AI Help endpoint
   * Answers questions based on documentation
   */
  async help(request: AIHelpRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      logger.warn('AI help requested but OPENROUTER_API_KEY not configured');
      return {
        answer: 'AI help is not available. Please configure OPENROUTER_API_KEY.',
        cached: false,
      };
    }

    const cacheKey = this.getCacheKey('help', request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('Returning cached AI help response');
      return { ...cached, cached: true };
    }

    logger.info('AI help request', { question: request.question });

    try {
      const systemPrompt = this.buildHelpSystemPrompt();
      const userPrompt = request.question;

      const answer = await this.callOpenRouter(systemPrompt, userPrompt);

      const response: AIResponse = {
        answer,
        citations: this.extractCitations(answer),
        cached: false,
      };

      this.setCache(cacheKey, response);
      return response;
    } catch (error) {
      logger.error('AI help error', { error });
      return {
        answer: 'Unable to answer your question at this time. Please try again later.',
        cached: false,
      };
    }
  }

  /**
   * Call OpenRouter API
   * @private
   */
  private async callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://cmetrics.app',
        'X-Title': 'CMetrics Performance Analytics',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: AI_CONFIG.RESPONSE_MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenRouter API error', { status: response.status, error: errorText });
      throw new Error(`OpenRouter API failed: ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    return data.choices[0]?.message?.content || 'No response generated';
  }

  /**
   * Build system prompt for coaching
   * @private
   */
  private buildCoachSystemPrompt(): string {
    return `You are a performance coach for Course Mentors at an educational organization.
Your role is to provide actionable, data-driven insights to help mentors improve their performance.

Focus on:
- Identifying strengths and areas for improvement
- Providing 2-3 specific, actionable recommendations
- Being encouraging but honest
- Considering weekly pacing and targets
- Noting which metrics are on/off track

Keep responses concise (4-6 bullet points) and avoid generic advice.
Use markdown formatting for readability.`;
  }

  /**
   * Build user prompt for coaching
   * @private
   */
  private buildCoachUserPrompt(request: AICoachRequest): string {
    const { metrics, targets, question } = request;

    let prompt = `Analyze performance metrics:\n\n`;

    if (metrics) {
      prompt += `**Current Metrics**:\n`;
      if (metrics.ccPct !== undefined) prompt += `- Class Consumption: ${metrics.ccPct.toFixed(1)}%\n`;
      if (metrics.scPct !== undefined) prompt += `- Super-Class: ${metrics.scPct.toFixed(1)}%\n`;
      if (metrics.upPct !== undefined) prompt += `- Upgrade Rate: ${metrics.upPct.toFixed(1)}%\n`;
      if (metrics.fixedPct !== undefined) prompt += `- Fixed Rate: ${metrics.fixedPct.toFixed(1)}%\n`;
      if (metrics.conversionPct !== undefined) prompt += `- Lead Conversion: ${metrics.conversionPct.toFixed(1)}%\n`;
      prompt += `\n`;
    }

    if (targets) {
      prompt += `**Targets**:\n`;
      if (targets.ccTarget !== undefined) prompt += `- CC Target: ${targets.ccTarget}%\n`;
      if (targets.scTarget !== undefined) prompt += `- SC Target: ${targets.scTarget}%\n`;
      if (targets.upTarget !== undefined) prompt += `- UP Target: ${targets.upTarget}%\n`;
      if (targets.fixedTarget !== undefined) prompt += `- Fixed Target: ${targets.fixedTarget}%\n`;
      prompt += `\n`;
    }

    if (question) {
      prompt += `**Specific Question**: ${question}\n\n`;
    }

    prompt += `Provide:\n1. Performance summary\n2. Top strengths\n3. Improvement areas with specific actions\n4. Priority focus`;

    return prompt;
  }

  /**
   * Build system prompt for help
   * @private
   */
  private buildHelpSystemPrompt(): string {
    return `You are a helpful assistant for the CMetrics performance analytics platform.

IMPORTANT: Users already know what metrics mean (CC, SC, UP, Fixed, etc.). Do NOT explain metric definitions unless specifically asked.

You help with TWO things only:

1. **Platform Usage** - How to use the system:
   - How to upload data (Excel files via /admin/ingestion page)
   - How to create meetings (Meeting Prep page)
   - How to view reports and dashboards
   - Navigation and features

2. **Data Queries** - Answer questions about actual data in the system:
   - "What is [mentor name]'s CC%?"
   - "Who has the lowest Fixed%?"
   - "Show me mentors below 60% score"
   - NOTE: You do NOT have access to live database data, so respond: "I don't have access to live data. Please check the Mentors page or Overview dashboard for current metrics."

DO NOT:
- Explain what CC, SC, UP, Fixed mean (users already know)
- Give definitions of metrics (they work here, they know the business)
- Provide generic advice

DO:
- Help them navigate the platform
- Tell them which page to find specific information
- Explain how features work

Keep responses SHORT and practical. Use markdown formatting for readability.`;
  }

  /**
   * Extract citations from AI response
   * @private
   */
  private extractCitations(answer: string): string[] | undefined {
    // Look for citation patterns like "Docs › Overview" or [Documentation: XYZ]
    const citationPatterns = [
      /Docs\s*›\s*([^,\n]+)/gi,
      /\[Documentation:\s*([^\]]+)\]/gi,
      /see\s+([A-Z][a-z]+\.md)/gi,
    ];

    const citations: Set<string> = new Set();

    citationPatterns.forEach(pattern => {
      const matches = answer.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          citations.add(match[1].trim());
        }
      }
    });

    return citations.size > 0 ? Array.from(citations) : undefined;
  }

  /**
   * Get cache key for request
   * @private
   */
  private getCacheKey(type: string, request: any): string {
    return `${type}:${JSON.stringify(request)}`;
  }

  /**
   * Get response from cache if valid
   * @private
   */
  private getFromCache(key: string): AIResponse | null {
    const cached = responseCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > AI_CONFIG.CACHE_TTL_MS) {
      responseCache.delete(key);
      return null;
    }

    return cached.response;
  }

  /**
   * Store response in cache
   * @private
   */
  private setCache(key: string, response: AIResponse): void {
    responseCache.set(key, { response, timestamp: Date.now() });
  }

  /**
   * Check if AI is enabled
   */
  isEnabled(): boolean {
    return !!this.apiKey;
  }
}

export default new AIService();
