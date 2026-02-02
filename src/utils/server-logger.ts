type ErrorMeta = Record<string, unknown>

export function logApiError(
  route: string,
  error: unknown,
  meta: ErrorMeta = {},
) {
  const normalized =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : { error }

  console.error(`[API ERROR] ${route}`, {
    timestamp: new Date().toISOString(),
    ...meta,
    ...normalized,
  })
}
