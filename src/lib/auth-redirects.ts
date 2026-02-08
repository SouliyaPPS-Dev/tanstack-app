export const AUTH_REDIRECT_TARGETS = ["/", "/crud", "/i18n"] as const;

export type AuthRedirectTarget = (typeof AUTH_REDIRECT_TARGETS)[number];

export const DEFAULT_AUTH_REDIRECT: AuthRedirectTarget = "/crud";

const redirectSet = new Set<string>(AUTH_REDIRECT_TARGETS);

export function resolveAuthRedirect(
  target?: string | null,
): AuthRedirectTarget {
  if (target && redirectSet.has(target)) {
    return target as AuthRedirectTarget;
  }

  return DEFAULT_AUTH_REDIRECT;
}
