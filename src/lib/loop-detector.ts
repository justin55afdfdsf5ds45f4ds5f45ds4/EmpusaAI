import crypto from 'crypto';

/**
 * Loop Detection Logic
 * 
 * Generates a hash based on:
 * - Tool/Action
 * - Arguments
 * - Error Code (if present)
 * - Remedy Attempted (if present)
 * 
 * This allows the same action to be retried with different remedies
 * without being flagged as a loop immediately.
 */

export interface ActionSignature {
  action: string;
  errorCode?: string;
  remedyAttempted?: string;
}

/**
 * Generate a unique hash for an action attempt
 * 
 * Examples:
 * - Click(Login) + 500 + retry_with_backoff = hash1
 * - Click(Login) + 500 + change_model = hash2 (different!)
 * - Click(Login) + 403 + retry_with_backoff = hash3 (different!)
 */
export function generateActionHash(signature: ActionSignature): string {
  const components = [
    signature.action,
    signature.errorCode || 'no_error',
    signature.remedyAttempted || 'no_remedy'
  ];
  
  const hashInput = components.join('::');
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
}

/**
 * Detect if an action sequence represents a loop
 * 
 * A loop is detected when:
 * 1. The same action hash appears multiple times
 * 2. The threshold (default: 3) is exceeded
 */
export function detectLoop(
  actionHistory: ActionSignature[],
  threshold: number = 3
): {
  isLoop: boolean;
  loopHash?: string;
  occurrences?: number;
  remedyChain?: string[];
} {
  const hashCounts = new Map<string, number>();
  const hashRemedies = new Map<string, string[]>();
  
  // Count occurrences of each hash
  for (const signature of actionHistory) {
    const hash = generateActionHash(signature);
    hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
    
    // Track remedy chain for this hash
    if (!hashRemedies.has(hash)) {
      hashRemedies.set(hash, []);
    }
    if (signature.remedyAttempted) {
      hashRemedies.get(hash)!.push(signature.remedyAttempted);
    }
  }
  
  // Check if any hash exceeds threshold
  for (const [hash, count] of hashCounts.entries()) {
    if (count >= threshold) {
      return {
        isLoop: true,
        loopHash: hash,
        occurrences: count,
        remedyChain: hashRemedies.get(hash)
      };
    }
  }
  
  return { isLoop: false };
}

/**
 * Build a remedy history from log entries
 */
export function buildRemedyHistory(logs: any[]): {
  attempts: Array<{
    step: number;
    remedy: string;
    outcome: 'success' | 'failure';
    errorCode?: string;
  }>;
  totalAttempts: number;
} {
  const attempts = logs
    .filter(log => log.remedy_attempted)
    .map(log => ({
      step: log.step,
      remedy: log.remedy_attempted,
      outcome: log.status === 'success' ? 'success' : 'failure',
      errorCode: log.error_code
    }));
  
  return {
    attempts,
    totalAttempts: attempts.length
  };
}

/**
 * Suggest next remedy based on history
 */
export function suggestNextRemedy(remedyHistory: string[]): string {
  const remedySequence = [
    'standard_retry',
    'retry_with_backoff',
    'change_selector',
    'wait_for_element',
    'change_model',
    'manual_intervention'
  ];
  
  // Find the last attempted remedy
  const lastRemedy = remedyHistory[remedyHistory.length - 1];
  const lastIndex = remedySequence.indexOf(lastRemedy);
  
  // Suggest next in sequence
  if (lastIndex >= 0 && lastIndex < remedySequence.length - 1) {
    return remedySequence[lastIndex + 1];
  }
  
  // Default to manual intervention if all else fails
  return 'manual_intervention';
}
