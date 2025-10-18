import { env } from '../config/env.js';
import { AI_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';

interface MentorPrepData {
  mentorId: string;
  mentorName: string;
  teamName: string;
  metrics: {
    ccPct?: number;
    scPct?: number;
    upPct?: number;
    fixedPct?: number;
    conversionPct?: number;
    weightedScore?: number;
  };
  targets: {
    ccTarget: number;
    scTarget: number;
    upTarget: number;
    fixedTarget: number;
  };
  missedTargets: string[];
  targetsHit: number;
}

interface MeetingPrepResult {
  mentorId: string;
  mentorName: string;
  summary: string;
  missedTargets: string[];
  talkingPoints: string[];
  actionItems: string[];
  strengths: string[];
}

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
}

/**
 * AI Meeting Prep Service
 * Generates meeting preparation materials for underperforming mentors
 */
class MeetingPrepService {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY;
    this.model = env.OPENROUTER_MODEL;
    this.baseUrl = env.OPENROUTER_BASE_URL;
  }

  /**
   * Generate meeting prep insights for multiple mentors
   */
  async generateMeetingPrep(mentors: MentorPrepData[]): Promise<MeetingPrepResult[]> {
    if (!this.apiKey) {
      logger.warn('Meeting prep requested but OPENROUTER_API_KEY not configured');
      return mentors.map(m => this.generateFallbackPrep(m));
    }

    const results: MeetingPrepResult[] = [];

    for (const mentor of mentors) {
      try {
        const result = await this.generateSingleMentorPrep(mentor);
        results.push(result);
      } catch (error) {
        logger.error('Meeting prep generation failed for mentor', {
          mentorId: mentor.mentorId,
          error,
        });
        results.push(this.generateFallbackPrep(mentor));
      }
    }

    return results;
  }

  /**
   * Generate prep notes for a single mentor
   */
  private async generateSingleMentorPrep(mentor: MentorPrepData): Promise<MeetingPrepResult> {
    const systemPrompt = this.buildMeetingPrepSystemPrompt();
    const userPrompt = this.buildMeetingPrepUserPrompt(mentor);

    const response = await this.callOpenRouter(systemPrompt, userPrompt);

    // Parse the AI response into structured format
    return this.parseAIResponse(mentor, response);
  }

  /**
   * Build system prompt for meeting prep
   */
  private buildMeetingPrepSystemPrompt(): string {
    return `You are a performance coaching assistant preparing materials for one-on-one meetings with underperforming Course Mentors.

Your goal is to help team leaders conduct productive, supportive meetings that lead to concrete improvements.

For each mentor, provide:
1. **Summary** (2-3 sentences): Quick overview of their performance situation
2. **Missed Targets** (list): Which specific metrics fell short
3. **Talking Points** (3-5 bullet points): Key discussion topics for the meeting
4. **Action Items** (3-5 bullet points): Specific, measurable steps they should take
5. **Strengths** (2-3 bullet points): Positive aspects to acknowledge and build on

Guidelines:
- Be constructive and supportive, not punitive
- Focus on actionable improvements
- Acknowledge any areas where they ARE meeting targets
- Suggest realistic next steps (not overwhelming)
- Use markdown formatting for readability

Format your response EXACTLY like this:

## Summary
[2-3 sentence overview]

## Missed Targets
- [Target name]: Current X%, Target Y%
- [Target name]: Current X%, Target Y%

## Talking Points
- [Point 1]
- [Point 2]
- [Point 3]

## Action Items
- [Action 1]
- [Action 2]
- [Action 3]

## Strengths
- [Strength 1]
- [Strength 2]`;
  }

  /**
   * Build user prompt with mentor data
   */
  private buildMeetingPrepUserPrompt(mentor: MentorPrepData): string {
    let prompt = `Prepare meeting notes for:\n\n`;
    prompt += `**Mentor**: ${mentor.mentorName} (${mentor.teamName})\n\n`;

    prompt += `**Current Performance**:\n`;
    if (mentor.metrics.ccPct !== undefined) {
      prompt += `- Class Consumption: ${mentor.metrics.ccPct.toFixed(1)}% (Target: ${mentor.targets.ccTarget}%)\n`;
    }
    if (mentor.metrics.scPct !== undefined) {
      prompt += `- Super-Class: ${mentor.metrics.scPct.toFixed(1)}% (Target: ${mentor.targets.scTarget}%)\n`;
    }
    if (mentor.metrics.upPct !== undefined) {
      prompt += `- Upgrade Rate: ${mentor.metrics.upPct.toFixed(1)}% (Target: ${mentor.targets.upTarget}%)\n`;
    }
    if (mentor.metrics.fixedPct !== undefined) {
      prompt += `- Fixed Rate: ${mentor.metrics.fixedPct.toFixed(1)}% (Target: ${mentor.targets.fixedTarget}%)\n`;
    }
    if (mentor.metrics.weightedScore !== undefined) {
      prompt += `- Weighted Score: ${mentor.metrics.weightedScore.toFixed(1)}%\n`;
    }

    prompt += `\n**Targets Hit**: ${mentor.targetsHit} out of 4\n\n`;

    if (mentor.missedTargets.length > 0) {
      prompt += `**Targets Not Met**: ${mentor.missedTargets.join(', ')}\n\n`;
    }

    prompt += `Generate meeting preparation materials following the exact format specified.`;

    return prompt;
  }

  /**
   * Call OpenRouter API
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
        temperature: 0.7, // Slightly higher for more creative suggestions
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
   * Parse AI response into structured format
   */
  private parseAIResponse(mentor: MentorPrepData, aiResponse: string): MeetingPrepResult {
    const sections = {
      summary: '',
      missedTargets: [] as string[],
      talkingPoints: [] as string[],
      actionItems: [] as string[],
      strengths: [] as string[],
    };

    // Split by markdown headers
    const summaryMatch = aiResponse.match(/## Summary\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim();
    }

    const missedMatch = aiResponse.match(/## Missed Targets\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (missedMatch) {
      const lines = missedMatch[1].trim().split('\n');
      sections.missedTargets = lines
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'))
        .map(l => l.replace(/^[-•]\s*/, '').trim());
    }

    const talkingMatch = aiResponse.match(/## Talking Points\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (talkingMatch) {
      const lines = talkingMatch[1].trim().split('\n');
      sections.talkingPoints = lines
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'))
        .map(l => l.replace(/^[-•]\s*/, '').trim());
    }

    const actionMatch = aiResponse.match(/## Action Items\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (actionMatch) {
      const lines = actionMatch[1].trim().split('\n');
      sections.actionItems = lines
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'))
        .map(l => l.replace(/^[-•]\s*/, '').trim());
    }

    const strengthsMatch = aiResponse.match(/## Strengths\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (strengthsMatch) {
      const lines = strengthsMatch[1].trim().split('\n');
      sections.strengths = lines
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'))
        .map(l => l.replace(/^[-•]\s*/, '').trim());
    }

    return {
      mentorId: mentor.mentorId,
      mentorName: mentor.mentorName,
      summary: sections.summary || `Performance review for ${mentor.mentorName}`,
      missedTargets: sections.missedTargets.length > 0 ? sections.missedTargets : mentor.missedTargets,
      talkingPoints: sections.talkingPoints,
      actionItems: sections.actionItems,
      strengths: sections.strengths,
    };
  }

  /**
   * Generate fallback prep notes without AI
   */
  private generateFallbackPrep(mentor: MentorPrepData): MeetingPrepResult {
    return {
      mentorId: mentor.mentorId,
      mentorName: mentor.mentorName,
      summary: `${mentor.mentorName} is currently achieving ${mentor.targetsHit} out of 4 targets. This meeting will focus on improvement strategies.`,
      missedTargets: mentor.missedTargets,
      talkingPoints: [
        'Review current performance metrics',
        'Discuss challenges and obstacles',
        'Identify areas for immediate improvement',
      ],
      actionItems: [
        'Set specific improvement goals for next period',
        'Schedule follow-up check-in',
        'Identify resources or support needed',
      ],
      strengths: [],
    };
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return !!this.apiKey;
  }
}

export default new MeetingPrepService();
