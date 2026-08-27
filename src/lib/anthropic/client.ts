import Anthropic from '@anthropic-ai/sdk';

// Round-robin key rotation client
class AnthropicClient {
  private clients: Anthropic[] = [];
  private currentKeyIndex = 0;
  private keyErrors: Map<number, { count: number; lastError: string; retryAfter?: number }> = new Map();
  private model: string;

  constructor() {
    const apiKeys = process.env.ANTHROPIC_API_KEYS?.split(',').filter(Boolean) ?? [];
    const singleKey = process.env.ANTHROPIC_API_KEY;
    const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
    const baseUrl = process.env.ANTHROPIC_BASE_URL;

    if (apiKeys.length > 0) {
      this.clients = apiKeys.map(
        (key) => new Anthropic({ apiKey: key.trim() })
      );
    } else if (singleKey && singleKey.trim().length > 0) {
      this.clients = [new Anthropic({ apiKey: singleKey })];
    } else if (authToken && authToken.trim().length > 0 && baseUrl && baseUrl.trim().length > 0) {
      // Support proxy-based auth (e.g., Claude Code local proxy)
      this.clients = [new Anthropic({
        apiKey: authToken,
        baseURL: baseUrl,
      })];
    } else {
      console.warn('⚠️  No ANTHROPIC_API_KEYS, ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN+BASE_URL found in environment');
    }

    // Use configurable model, defaulting to Claude Opus 5
    this.model = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
  }

  get numKeys(): number {
    return this.clients.length;
  }

  getModel(): string {
    return this.model;
  }

  private getNextUsableKeyIndex(): number {
    if (this.clients.length === 0) {
      throw new Error('No API keys configured');
    }

    const now = Date.now();
    let attempts = 0;
    let index = this.currentKeyIndex;

    do {
      const errorInfo = this.keyErrors.get(index);
      if (!errorInfo) {
        this.currentKeyIndex = (index + 1) % this.clients.length;
        return index;
      }

      // Check if rate-limited key can be used again
      if (errorInfo.retryAfter && now < errorInfo.retryAfter) {
        index = (index + 1) % this.clients.length;
        attempts++;
      } else {
        // Clear old errors
        if (now - (errorInfo.retryAfter ?? 0) > 60000) {
          this.keyErrors.delete(index);
        }
        this.currentKeyIndex = (index + 1) % this.clients.length;
        return index;
      }
    } while (attempts < this.clients.length);

    // All keys rate-limited — fall back to round-robin
    const fallbackIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.clients.length;
    return fallbackIndex;
  }

  private recordError(index: number, error: string, isRateLimit = false) {
    const current = this.keyErrors.get(index) ?? { count: 0, lastError: '' };
    this.keyErrors.set(index, {
      count: current.count + 1,
      lastError: error,
      retryAfter: isRateLimit ? Date.now() + 60000 : undefined,
    });
  }

  async callClaude(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    maxTokens = 4000,
    model: string | null = null
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    if (this.clients.length === 0) {
      throw new Error('No Anthropic API keys configured. Set ANTHROPIC_API_KEYS or ANTHROPIC_API_KEY env variable.');
    }

    const resolvedModel = model || this.model;
    const maxRetries = Math.max(3, this.clients.length * 2);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const keyIndex = this.getNextUsableKeyIndex();
      const client = this.clients[keyIndex];

      if (!client) {
        throw new Error('Client not initialized for key index');
      }

      try {
        const response = await client.messages.create({
          model: resolvedModel,
          max_tokens: maxTokens,
          system,
          messages,
        });

        const text = response.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n')
          .trim();

        // Reset error count on success
        this.keyErrors.delete(keyIndex);

        return {
          text,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        };
      } catch (err: any) {
        const errorMessage = err?.message ?? String(err);
        const isRateLimit =
          errorMessage.includes('rate limit') ||
          errorMessage.includes('429') ||
          errorMessage.includes('Rate-Limited');

        lastError = err instanceof Error ? err : new Error(errorMessage);

        if (isRateLimit) {
          this.recordError(keyIndex, errorMessage, true);
          // Try next key immediately
          continue;
        }

        // Non-rate-limit error — record but don't necessarily retry
        this.recordError(keyIndex, errorMessage, false);

        if (attempt < maxRetries - 1) {
          // Try another key
          continue;
        }
      }
    }

    throw lastError ?? new Error('Failed to get response from any API key');
  }
}

// Singleton instance
export const anthropicClient = new AnthropicClient();
