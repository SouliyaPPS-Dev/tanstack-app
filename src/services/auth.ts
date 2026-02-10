function logServerAction(
  action: string,
  payload: Record<string, unknown>,
  extra?: Record<string, unknown>,
) {
  console.log(
    `[ServerFn] ${action}`,
    JSON.stringify(
      {
        payload,
        ...extra,
      },
      null,
      2,
    ),
  );
}

import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/start-server-core";
import type { Tokens, User } from "trailbase";
import { initClient } from "trailbase";
import { z } from "zod";

import { env } from "@/env";

const AUTH_COOKIE = "tb_auth_token";
const REFRESH_COOKIE = "tb_refresh_token";
const CSRF_COOKIE = "tb_csrf_token";

const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
};

function persistTokens(tokens: Tokens) {
  setCookie(AUTH_COOKIE, tokens.auth_token, {
    ...baseCookieOptions,
    maxAge: 60 * 60,
  });

  if (tokens.refresh_token) {
    setCookie(REFRESH_COOKIE, tokens.refresh_token, {
      ...baseCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (tokens.csrf_token) {
    setCookie(CSRF_COOKIE, tokens.csrf_token, {
      ...baseCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

function clearTokens() {
  const options = { path: "/" };
  deleteCookie(AUTH_COOKIE, options);
  deleteCookie(REFRESH_COOKIE, options);
  deleteCookie(CSRF_COOKIE, options);
}

function readTokensFromCookies(): Tokens | undefined {
  const auth = getCookie(AUTH_COOKIE);
  if (!auth) {
    return undefined;
  }

  return {
    auth_token: auth,
    refresh_token: getCookie(REFRESH_COOKIE) ?? null,
    csrf_token: getCookie(CSRF_COOKIE) ?? null,
  };
}

function getTrailbaseUrl() {
  if (!env.SERVER_URL) {
    throw new Error("SERVER_URL is not configured for TrailBase auth");
  }
  return env.SERVER_URL;
}

function createTrailbaseClient(tokens?: Tokens) {
  const url = getTrailbaseUrl();
  return initClient(url, tokens ? { tokens } : undefined);
}

async function refreshAndPersist(
  client: ReturnType<typeof createTrailbaseClient>,
) {
  try {
    await client.refreshAuthToken();
  } catch (error) {
    clearTokens();
    throw error;
  }

  const latestTokens = client.tokens();
  if (latestTokens) {
    persistTokens(latestTokens);
  }
}

export type SessionUser = User | null;

export const getSessionUser = createServerFn({ method: "GET" }).handler(
  async () => {
    logServerAction("getSessionUser:start", {});
    const tokens = readTokensFromCookies();
    if (!tokens) {
      logServerAction("getSessionUser:unauthenticated", {});
      return { user: null as SessionUser };
    }

    const client = createTrailbaseClient(tokens);
    try {
      await refreshAndPersist(client);
    } catch (error) {
      logServerAction("getSessionUser:refresh_failed", {}, { error });
      return { user: null as SessionUser };
    }

    const user = client.user() ?? null;
    logServerAction("getSessionUser:success", { userExists: Boolean(user) });
    return { user };
  },
);

export const loginWithEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const client = createTrailbaseClient();
    logServerAction("loginWithEmail:start", {
      email: data.email,
      password: "[redacted]",
    });

    try {
      await client.login(data.email, data.password);
      logServerAction("loginWithEmail:login_success", { email: data.email });
    } catch (error) {
      logServerAction("loginWithEmail:error", { email: data.email }, { error });
      throw new Error("Invalid email or password");
    }

    const tokens = client.tokens();
    if (!tokens) {
      logServerAction("loginWithEmail:no_tokens", { email: data.email });
      throw new Error("TrailBase did not return auth tokens");
    }

    persistTokens(tokens);
    logServerAction("loginWithEmail:tokens_persisted", { email: data.email });

    const user = client.user() ?? null;
    logServerAction("loginWithEmail:success", {
      email: data.email,
      userExists: Boolean(user),
    });

    return {
      user,
    };
  });

export const logoutSession = createServerFn({ method: "POST" }).handler(
  async () => {
    logServerAction("logoutSession:start", {});
    const tokens = readTokensFromCookies();
    if (tokens) {
      const client = createTrailbaseClient(tokens);
      try {
        await client.logout();
        logServerAction("logoutSession:trailbase_logout", { success: true });
      } catch (error) {
        logServerAction("logoutSession:trailbase_error", {}, { error });
        // Ignore logout errors and continue clearing cookies
      }
    }

    clearTokens();
    logServerAction("logoutSession:tokens_cleared", {});

    return { success: true };
  },
);
