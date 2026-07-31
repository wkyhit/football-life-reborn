import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type HeaderRule = {
  readonly headers: readonly {
    readonly key: string;
    readonly value: string;
  }[];
  readonly source: string;
};

type VercelHttpConfig = {
  readonly headers?: readonly HeaderRule[];
  readonly rewrites?: readonly {
    readonly destination: string;
    readonly source: string;
  }[];
};

type WebManifest = {
  readonly display?: string;
  readonly icons?: readonly {
    readonly sizes: string;
    readonly src: string;
    readonly type: string;
  }[];
  readonly scope?: string;
  readonly start_url?: string;
};

const ROOT = process.cwd();
const PUBLIC = join(ROOT, "public");
const REVALIDATE = "public, max-age=0, must-revalidate";
const IMMUTABLE =
  "public, max-age=31536000, immutable";

describe("Vercel HTTP contract", () => {
  it("serves every direct SPA path through index.html", () => {
    const config = readConfig();

    expect(config.rewrites).toEqual([
      {
        destination: "/index.html",
        source: "/(.*)",
      },
    ]);
  });

  it("revalidates documents and keeps hashed assets immutable", () => {
    const config = readConfig();
    const globalRule = requireHeaderRule(config, "/(.*)");
    const assetRule = requireHeaderRule(
      config,
      "/assets/(.*)",
    );
    const globalHeaders = toHeaderMap(globalRule);
    const assetHeaders = toHeaderMap(assetRule);

    expect(globalHeaders["Cache-Control"]).toBe(REVALIDATE);
    expect(assetHeaders["Cache-Control"]).toBe(IMMUTABLE);
    expect(
      config.headers?.indexOf(assetRule),
    ).toBeGreaterThan(config.headers?.indexOf(globalRule) ?? -1);
  });

  it("owns security headers in Vercel without exposing a provider artifact", () => {
    const config = readConfig();
    const headers = toHeaderMap(
      requireHeaderRule(config, "/(.*)"),
    );

    expect(headers).toMatchObject({
      "Content-Security-Policy": expect.stringContaining(
        "default-src 'self'",
      ),
      "Cross-Origin-Opener-Policy": "same-origin",
      "Permissions-Policy":
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    expect(headers["Content-Security-Policy"]).not.toContain(
      "'unsafe-eval'",
    );
    expect(existsSync(join(PUBLIC, "_headers"))).toBe(false);
  });

  it("ships reload-safe manifest, favicon, and install icons without a service worker", () => {
    const html = readFileSync(
      join(ROOT, "index.html"),
      "utf8",
    );
    const manifest = JSON.parse(
      readFileSync(
        join(PUBLIC, "manifest.webmanifest"),
        "utf8",
      ),
    ) as WebManifest;

    expect(html).toContain(
      '<link rel="manifest" href="/manifest.webmanifest" />',
    );
    expect(html).toContain(
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
    );
    expect(manifest).toMatchObject({
      display: "standalone",
      scope: "/",
      start_url: "/",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sizes: "192x192",
          src: "/icons/icon-192.png",
          type: "image/png",
        }),
        expect.objectContaining({
          sizes: "512x512",
          src: "/icons/icon-512.png",
          type: "image/png",
        }),
      ]),
    );
    expect(existsSync(join(PUBLIC, "favicon.svg"))).toBe(true);
    expect(
      existsSync(join(PUBLIC, "icons", "apple-touch-icon.png")),
    ).toBe(true);
    expect(
      ["sw.js", "service-worker.js"].filter((path) =>
        existsSync(join(PUBLIC, path)),
      ),
    ).toEqual([]);
  });
});

function readConfig(): VercelHttpConfig {
  return JSON.parse(
    readFileSync(join(ROOT, "vercel.json"), "utf8"),
  ) as VercelHttpConfig;
}

function requireHeaderRule(
  config: VercelHttpConfig,
  source: string,
): HeaderRule {
  const rule = config.headers?.find(
    (candidate) => candidate.source === source,
  );

  expect(rule, `Missing header rule for ${source}`).toBeDefined();
  return rule!;
}

function toHeaderMap(
  rule: HeaderRule,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    rule.headers.map(({ key, value }) => [key, value]),
  );
}
