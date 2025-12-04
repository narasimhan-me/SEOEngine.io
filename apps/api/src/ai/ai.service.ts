import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface MetadataInput {
  url: string;
  currentTitle?: string;
  currentDescription?: string;
  pageTextSnippet?: string;
  h1?: string;
  targetKeywords?: string[];
}

interface MetadataOutput {
  title: string;
  description: string;
}

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly provider: 'openai' | 'anthropic' | 'gemini';
  private readonly geminiModel: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AI_API_KEY') || '';
    this.provider =
      (this.configService.get<string>('AI_PROVIDER') as 'openai' | 'anthropic' | 'gemini') ||
      'openai';
    // Allow configurable Gemini model, default to gemini-2.0-flash-lite for best rate limits
    this.geminiModel = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash-lite';
  }

  async generateMetadata(input: MetadataInput): Promise<MetadataOutput> {
    const prompt = this.buildPrompt(input);

    if (this.provider === 'anthropic') {
      return this.callAnthropic(prompt);
    }
    if (this.provider === 'gemini') {
      return this.callGemini(prompt);
    }
    return this.callOpenAI(prompt);
  }

  private buildPrompt(input: MetadataInput): string {
    const keywordsText = input.targetKeywords?.length
      ? `Target keywords: ${input.targetKeywords.join(', ')}`
      : '';

    return `You are an SEO assistant. Generate an SEO-friendly title (max 60 characters) and meta description (max 155 characters) for a webpage.

URL: ${input.url}
Current Title: ${input.currentTitle || 'None'}
Current Meta Description: ${input.currentDescription || 'None'}
H1: ${input.h1 || 'None'}
Page Content Snippet: ${input.pageTextSnippet || 'Not available'}
${keywordsText}

Requirements:
- Title should be compelling and include primary keyword naturally
- Meta description should summarize the page and include a call-to-action
- Both should be optimized for click-through rate

Respond in JSON format only:
{"title": "your suggested title", "description": "your suggested meta description"}`;
  }

  private async callOpenAI(prompt: string): Promise<MetadataOutput> {
    if (!this.apiKey) {
      return this.getFallbackMetadata();
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI API error:', await response.text());
        return this.getFallbackMetadata();
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content || '';

      return this.parseJsonResponse(content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getFallbackMetadata();
    }
  }

  private async callAnthropic(prompt: string): Promise<MetadataOutput> {
    if (!this.apiKey) {
      return this.getFallbackMetadata();
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        console.error('Anthropic API error:', await response.text());
        return this.getFallbackMetadata();
      }

      const data = (await response.json()) as {
        content?: Array<{ text?: string }>;
      };
      const content = data.content?.[0]?.text || '';

      return this.parseJsonResponse(content);
    } catch (error) {
      console.error('Anthropic API error:', error);
      return this.getFallbackMetadata();
    }
  }

  private async callGemini(prompt: string): Promise<MetadataOutput> {
    if (!this.apiKey) {
      return this.getFallbackMetadata();
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          },
        }),
      });

      if (!response.ok) {
        console.error('Gemini API error:', await response.text());
        return this.getFallbackMetadata();
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return this.parseJsonResponse(content);
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackMetadata();
    }
  }

  private parseJsonResponse(content: string): MetadataOutput {
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || 'Suggested Title',
          description: parsed.description || 'Suggested meta description for this page.',
        };
      }
    } catch {
      console.error('Failed to parse AI response:', content);
    }
    return this.getFallbackMetadata();
  }

  private getFallbackMetadata(): MetadataOutput {
    return {
      title: '',
      description: '',
    };
  }
}
