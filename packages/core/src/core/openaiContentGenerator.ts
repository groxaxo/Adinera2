/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  Content,
  Part,
} from '@google/genai';
import OpenAI from 'openai';
import type { ContentGenerator } from './contentGenerator.js';
import type { UserTierId } from '../code_assist/types.js';

// Type alias to avoid internal module imports
type ChatCompletionMessageParam =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };

/**
 * ContentGenerator implementation using OpenAI API.
 * This adapts OpenAI's API to match the Gemini ContentGenerator interface.
 */
export class OpenAIContentGenerator implements ContentGenerator {
  private client: OpenAI;
  userTier?: UserTierId;

  constructor(config: { apiKey: string; baseURL?: string }) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  /**
   * Converts Gemini Content format to OpenAI messages format
   */
  private convertToOpenAIMessages(
    contents: Content[],
  ): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    for (const content of contents) {
      if (content.role === 'user') {
        const textParts = content.parts
          .filter((part) => 'text' in part && part.text)
          .map((part) => (part as { text: string }).text);

        if (textParts.length > 0) {
          messages.push({
            role: 'user',
            content: textParts.join('\n'),
          });
        }
      } else if (content.role === 'model') {
        const textParts = content.parts
          .filter((part) => 'text' in part && part.text)
          .map((part) => (part as { text: string }).text);

        if (textParts.length > 0) {
          messages.push({
            role: 'assistant',
            content: textParts.join('\n'),
          });
        }
      }
    }

    return messages;
  }

  /**
   * Converts OpenAI response to Gemini format
   */
  private convertToGeminiResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): GenerateContentResponse {
    const choice = response.choices[0];
    const content = choice?.message?.content || '';

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: content }],
          },
          finishReason: choice?.finish_reason === 'stop' ? 'STOP' : 'OTHER',
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: response.usage?.prompt_tokens || 0,
        candidatesTokenCount: response.usage?.completion_tokens || 0,
        totalTokenCount: response.usage?.total_tokens || 0,
      },
    };
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const messages = this.convertToOpenAIMessages(request.contents);

    // Add system instruction if present
    if (request.config?.systemInstruction) {
      let systemText = '';
      if (typeof request.config.systemInstruction === 'string') {
        systemText = request.config.systemInstruction;
      } else if ('text' in request.config.systemInstruction) {
        systemText = (request.config.systemInstruction as { text: string })
          .text;
      } else if (Array.isArray(request.config.systemInstruction)) {
        systemText = request.config.systemInstruction
          .filter((part: Part) => 'text' in part && part.text)
          .map((part: Part) => (part as { text: string }).text)
          .join('\n');
      } else if ('parts' in request.config.systemInstruction) {
        systemText = (request.config.systemInstruction as Content).parts
          .filter((part) => 'text' in part && part.text)
          .map((part) => (part as { text: string }).text)
          .join('\n');
      }

      if (systemText) {
        messages.unshift({
          role: 'system',
          content: systemText,
        });
      }
    }

    const response = await this.client.chat.completions.create({
      model: request.model,
      messages,
      temperature: request.config?.temperature,
      max_tokens: request.config?.maxOutputTokens,
      top_p: request.config?.topP,
    });

    return this.convertToGeminiResponse(response);
  }

  async *generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): AsyncGenerator<GenerateContentResponse> {
    const messages = this.convertToOpenAIMessages(request.contents);

    // Add system instruction if present
    if (request.config?.systemInstruction) {
      let systemText = '';
      if (typeof request.config.systemInstruction === 'string') {
        systemText = request.config.systemInstruction;
      } else if ('text' in request.config.systemInstruction) {
        systemText = (request.config.systemInstruction as { text: string })
          .text;
      } else if (Array.isArray(request.config.systemInstruction)) {
        systemText = request.config.systemInstruction
          .filter((part: Part) => 'text' in part && part.text)
          .map((part: Part) => (part as { text: string }).text)
          .join('\n');
      } else if ('parts' in request.config.systemInstruction) {
        systemText = (request.config.systemInstruction as Content).parts
          .filter((part) => 'text' in part && part.text)
          .map((part) => (part as { text: string }).text)
          .join('\n');
      }

      if (systemText) {
        messages.unshift({
          role: 'system',
          content: systemText,
        });
      }
    }

    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages,
      temperature: request.config?.temperature,
      max_tokens: request.config?.maxOutputTokens,
      top_p: request.config?.topP,
      stream: true,
    });

    let accumulatedText = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      accumulatedText += delta;

      yield {
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: accumulatedText }],
            },
            finishReason:
              chunk.choices[0]?.finish_reason === 'stop' ? 'STOP' : 'OTHER',
            index: 0,
          },
        ],
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
        },
      };
    }
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // OpenAI doesn't have a direct token counting API
    // We'll estimate based on the GPT tokenizer (rough estimate: 1 token ≈ 4 chars)
    const messages = this.convertToOpenAIMessages(request.contents);
    const totalText = messages.map((m) => m.content).join('');
    const estimatedTokens = Math.ceil(totalText.length / 4);

    return {
      totalTokens: estimatedTokens,
    };
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    // OpenAI embeddings use a different model and API
    // This is a simplified implementation
    const textParts = request.content.parts
      .filter((part) => 'text' in part && part.text)
      .map((part) => (part as { text: string }).text);

    const text = textParts.join('\n');

    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return {
      embedding: {
        values: response.data[0].embedding,
      },
    };
  }
}
