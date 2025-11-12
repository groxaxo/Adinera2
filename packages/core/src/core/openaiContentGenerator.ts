/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentParameters,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  Content,
  Part,
} from '@google/genai';
import { FinishReason, GenerateContentResponse } from '@google/genai';
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
   * ContentListUnion = Content | Content[] | PartUnion | PartUnion[]
   * PartUnion = Part | string
   */
  private convertToOpenAIMessages(
    contentsUnion: unknown,
  ): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [];

    // Handle string or string[] directly
    if (typeof contentsUnion === 'string') {
      return [{ role: 'user', content: contentsUnion }];
    }

    // Normalize to Content array
    let contents: Content[] = [];
    if (Array.isArray(contentsUnion)) {
      // Check if it's all strings
      if (contentsUnion.length > 0 && typeof contentsUnion[0] === 'string') {
        return [
          { role: 'user', content: (contentsUnion as string[]).join('\n') },
        ];
      }
      // Check if it's Part[] or Content[]
      if (
        contentsUnion.length > 0 &&
        typeof contentsUnion[0] === 'object' &&
        'role' in contentsUnion[0]
      ) {
        contents = contentsUnion as Content[];
      } else {
        // It's Part[] - wrap in a user Content
        contents = [{ role: 'user', parts: contentsUnion as Part[] }];
      }
    } else if (
      typeof contentsUnion === 'object' &&
      contentsUnion !== null &&
      'role' in contentsUnion
    ) {
      // Single Content
      contents = [contentsUnion as Content];
    } else if (typeof contentsUnion === 'object' && contentsUnion !== null) {
      // Single Part - wrap in a user Content
      contents = [{ role: 'user', parts: [contentsUnion as Part] }];
    }

    for (const content of contents) {
      if (!content.parts) continue;

      if (content.role === 'user') {
        const textParts: string[] = [];
        for (const part of content.parts) {
          if (typeof part === 'string') {
            textParts.push(part);
          } else if (typeof part === 'object' && 'text' in part && part.text) {
            textParts.push(part.text);
          }
        }

        if (textParts.length > 0) {
          messages.push({
            role: 'user',
            content: textParts.join('\n'),
          });
        }
      } else if (content.role === 'model') {
        const textParts: string[] = [];
        for (const part of content.parts) {
          if (typeof part === 'string') {
            textParts.push(part);
          } else if (typeof part === 'object' && 'text' in part && part.text) {
            textParts.push(part.text);
          }
        }

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

    // Map OpenAI finish reasons to Gemini FinishReason enum
    let finishReason = FinishReason.OTHER;
    if (choice?.finish_reason === 'stop') {
      finishReason = FinishReason.STOP;
    } else if (choice?.finish_reason === 'length') {
      finishReason = FinishReason.MAX_TOKENS;
    } else if (choice?.finish_reason === 'content_filter') {
      finishReason = FinishReason.SAFETY;
    }

    const geminiResponse = new GenerateContentResponse();
    geminiResponse.candidates = [
      {
        content: {
          role: 'model',
          parts: [{ text: content }],
        },
        finishReason,
        index: 0,
      },
    ];
    geminiResponse.usageMetadata = {
      promptTokenCount: response.usage?.prompt_tokens || 0,
      candidatesTokenCount: response.usage?.completion_tokens || 0,
      totalTokenCount: response.usage?.total_tokens || 0,
    };

    return geminiResponse;
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
        const textParts: string[] = [];
        for (const part of request.config.systemInstruction) {
          if (typeof part === 'string') {
            textParts.push(part);
          } else if (typeof part === 'object' && 'text' in part && part.text) {
            textParts.push(part.text);
          }
        }
        systemText = textParts.join('\n');
      } else if ('parts' in request.config.systemInstruction) {
        const textParts: string[] = [];
        const parts = (request.config.systemInstruction as Content).parts;
        if (parts) {
          for (const part of parts) {
            if (typeof part === 'string') {
              textParts.push(part);
            } else if (
              typeof part === 'object' &&
              'text' in part &&
              part.text
            ) {
              textParts.push(part.text);
            }
          }
        }
        systemText = textParts.join('\n');
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

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const convertToOpenAIMessages = this.convertToOpenAIMessages.bind(this);
    const client = this.client;

    async function* streamGenerator(): AsyncGenerator<GenerateContentResponse> {
      const messages = convertToOpenAIMessages(request.contents);

      // Add system instruction if present
      if (request.config?.systemInstruction) {
        let systemText = '';
        if (typeof request.config.systemInstruction === 'string') {
          systemText = request.config.systemInstruction;
        } else if ('text' in request.config.systemInstruction) {
          systemText = (request.config.systemInstruction as { text: string })
            .text;
        } else if (Array.isArray(request.config.systemInstruction)) {
          const textParts: string[] = [];
          for (const part of request.config.systemInstruction) {
            if (typeof part === 'string') {
              textParts.push(part);
            } else if (
              typeof part === 'object' &&
              'text' in part &&
              part.text
            ) {
              textParts.push(part.text);
            }
          }
          systemText = textParts.join('\n');
        } else if ('parts' in request.config.systemInstruction) {
          const textParts: string[] = [];
          const parts = (request.config.systemInstruction as Content).parts;
          if (parts) {
            for (const part of parts) {
              if (typeof part === 'string') {
                textParts.push(part);
              } else if (
                typeof part === 'object' &&
                'text' in part &&
                part.text
              ) {
                textParts.push(part.text);
              }
            }
          }
          systemText = textParts.join('\n');
        }

        if (systemText) {
          messages.unshift({
            role: 'system',
            content: systemText,
          });
        }
      }

      const stream = await client.chat.completions.create({
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

        // Map OpenAI finish reasons to Gemini FinishReason enum
        let finishReason = FinishReason.OTHER;
        if (chunk.choices[0]?.finish_reason === 'stop') {
          finishReason = FinishReason.STOP;
        } else if (chunk.choices[0]?.finish_reason === 'length') {
          finishReason = FinishReason.MAX_TOKENS;
        } else if (chunk.choices[0]?.finish_reason === 'content_filter') {
          finishReason = FinishReason.SAFETY;
        }

        const geminiResponse = new GenerateContentResponse();
        geminiResponse.candidates = [
          {
            content: {
              role: 'model',
              parts: [{ text: accumulatedText }],
            },
            finishReason,
            index: 0,
          },
        ];
        geminiResponse.usageMetadata = {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
        };

        yield geminiResponse;
      }
    }

    return streamGenerator();
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
    // Convert contents to text
    const messages = this.convertToOpenAIMessages(request.contents);
    const text = messages.map((m) => m.content).join('\n');

    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return {
      embeddings: [
        {
          values: response.data[0].embedding,
        },
      ],
    };
  }
}
