/**
 * Error Reporter Utility
 * Sends errors to Slack for monitoring
 */

export interface ErrorContext {
  // User context
  userId?: string;
  userEmail?: string;
  userName?: string;

  // Request context
  url?: string;
  action?: string;

  // Additional context
  metadata?: Record<string, unknown>;
}

export interface ErrorReport {
  error: Error | unknown;
  context?: ErrorContext;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Report error to Slack
 */
export async function reportError({ error, context, severity = 'medium' }: ErrorReport): Promise<void> {
  // Only report in production or when explicitly enabled
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING) {
    console.warn('Error reporting disabled in development');
    return;
  }

  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    const payload = {
      error: {
        message: errorMessage,
        stack: errorStack,
        name: error instanceof Error ? error.name : 'Unknown Error',
      },
      context: {
        ...context,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        timestamp: new Date().toISOString(),
        url: context?.url || (typeof window !== 'undefined' ? window.location.href : 'Unknown'),
      },
      severity,
      environment: process.env.NODE_ENV,
    };

    // Send to API route
    await fetch('/api/error-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (reportingError) {
    // Don't let error reporting break the app
    console.error('Failed to report error:', reportingError);
  }
}

/**
 * Supabase-specific error reporter
 */
export async function reportSupabaseError(
  error: unknown,
  action: string,
  context?: Omit<ErrorContext, 'action'>
): Promise<void> {
  const supabaseError = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const metadata = {
    code: supabaseError.code,
    details: supabaseError.details,
    hint: supabaseError.hint,
    ...context?.metadata,
  };

  await reportError({
    error: new Error(supabaseError.message || 'Supabase Error'),
    context: {
      ...context,
      action,
      metadata,
    },
    severity: 'high',
  });
}
