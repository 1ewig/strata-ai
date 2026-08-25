/**
 * Granular classification of upstream LLM provider and network errors.
 * Normalizes vendor-specific error messages (Google, Fireworks, DeepSeek, network timeouts)
 * into safe, structured categories and client-friendly copy without leaking secrets or raw stack traces.
 */

export type ErrorClassificationCode =
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_RESTRICTED'
  | 'SAFETY_FILTER_TRIGGERED'
  | 'CONTEXT_EXCEEDED'
  | 'AUTHENTICATION_ERROR'
  | 'ABORTED'
  | 'NETWORK_ERROR'
  | 'INFERENCE_FAILURE';

export interface ClassifiedError {
  code: ErrorClassificationCode;
  message: string;
  isRetryable: boolean;
}

/**
 * Classifies an error into a standardized user-facing category and message.
 * @param error - The raw error object, string, or unknown exception.
 * @returns A structured ClassifiedError object.
 */
export function classifyProviderError(error: unknown): ClassifiedError {
  if (!error) {
    return {
      code: 'INFERENCE_FAILURE',
      message: 'I ran into a problem while processing your request. Please try again in a moment.',
      isRetryable: true,
    };
  }

  const errStr = error instanceof Error ? error.message : String(error);
  const lower = errStr.toLowerCase();

  // 1. Client Abort / User Cancellation
  if (lower.includes('abort') || lower.includes('cancelled') || lower.includes('the user aborted')) {
    return {
      code: 'ABORTED',
      message: 'Request was cancelled.',
      isRetryable: false,
    };
  }

  // 2. Upstream Provider Rate Limits / Overload
  if (
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('overloaded') ||
    lower.includes('503')
  ) {
    return {
      code: 'PROVIDER_RATE_LIMIT',
      message: 'The AI provider is temporarily overloaded or rate limits were reached. Please try again shortly.',
      isRetryable: true,
    };
  }

  // 3. Provider Account / Key Restriction
  if (
    lower.includes('restricted') ||
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('project has been restricted')
  ) {
    return {
      code: 'PROVIDER_RESTRICTED',
      message: 'The AI provider reported a service restriction. Please verify your API key and project status.',
      isRetryable: false,
    };
  }

  // 4. Model Safety / Content Policy Filters
  if (
    lower.includes('safety') ||
    lower.includes('harm_category') ||
    lower.includes('blocked') ||
    lower.includes('candidate was blocked')
  ) {
    return {
      code: 'SAFETY_FILTER_TRIGGERED',
      message: 'The request was blocked by the model safety filters. Please rephrase your prompt.',
      isRetryable: false,
    };
  }

  // 5. Context Window Limit Exceeded
  if (
    lower.includes('context_length_exceeded') ||
    lower.includes('max_tokens') ||
    lower.includes('context length') ||
    lower.includes('prompt is too long') ||
    lower.includes('maximum context')
  ) {
    return {
      code: 'CONTEXT_EXCEEDED',
      message: 'Conversation context window limit was reached. Please use /compact to summarize.',
      isRetryable: true,
    };
  }

  // 6. Upstream Provider Authentication
  if (lower.includes('api_key') || lower.includes('unauthorized') || lower.includes('401')) {
    return {
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed with the AI provider. Please check provider credentials.',
      isRetryable: false,
    };
  }

  // 7. Network / Socket / Gateway Failures
  if (
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('enotfound') ||
    lower.includes('socket hang up')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the AI model provider. Please check your network connection.',
      isRetryable: true,
    };
  }

  // 8. General Default
  return {
    code: 'INFERENCE_FAILURE',
    message: 'I ran into a problem while processing your request. Please try again in a moment.',
    isRetryable: true,
  };
}
