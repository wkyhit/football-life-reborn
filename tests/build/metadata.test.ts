import {
  existsSync,
  readFileSync,
} from "node:fs";
import { extname, join } from "node:path";

import { describe, expect, it } from "vitest";

const PUBLIC_DIRECTORY = join(process.cwd(), "public");
const DIST_DIRECTORY = join(process.cwd(), "dist");
const PRODUCTION_URL =
  "https://football-life-reborn.vercel.app/" as const;
const SOCIAL_IMAGE_URL =
  `${PRODUCTION_URL}social-card.png` as const;
const DESCRIPTION =
  "用相同 seed 和选择重放完全一致的足球职业生涯。61 个国家、192 家俱乐部，纯前端、本地优先。" as const;
const TITLE =
  "Football Life Reborn | 确定性足球生涯模拟器" as const;

describe("Static metadata artifacts", () => {
  it("emits canonical, social, install, icon, and theme metadata", () => {
    const html = readFileSync(
      join(DIST_DIRECTORY, "index.html"),
      "utf8",
    );

    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain(`<title>${TITLE}</title>`);
    expect(
      attribute(
        requireElement(html, "meta", {
          name: "viewport",
        }),
        "content",
      ),
    ).toBe("width=device-width, initial-scale=1.0");
    expectMeta(html, "name", "description", DESCRIPTION);
    expectLink(html, "canonical", PRODUCTION_URL);
    expectMeta(html, "property", "og:type", "website");
    expectMeta(html, "property", "og:locale", "zh_CN");
    expectMeta(html, "property", "og:title", TITLE);
    expectMeta(
      html,
      "property",
      "og:description",
      DESCRIPTION,
    );
    expectMeta(html, "property", "og:url", PRODUCTION_URL);
    expectMeta(
      html,
      "property",
      "og:image",
      SOCIAL_IMAGE_URL,
    );
    expectMeta(html, "property", "og:image:width", "1200");
    expectMeta(html, "property", "og:image:height", "630");
    expectMeta(
      html,
      "property",
      "og:image:alt",
      "Football Life Reborn 确定性足球生涯模拟器",
    );
    expectMeta(
      html,
      "name",
      "twitter:card",
      "summary_large_image",
    );
    expectMeta(html, "name", "twitter:title", TITLE);
    expectMeta(
      html,
      "name",
      "twitter:description",
      DESCRIPTION,
    );
    expectMeta(
      html,
      "name",
      "twitter:image",
      SOCIAL_IMAGE_URL,
    );
    expectMeta(
      html,
      "name",
      "twitter:image:alt",
      "Football Life Reborn 确定性足球生涯模拟器",
    );
    expectMeta(html, "name", "theme-color", "#09090b");
    expectMeta(html, "name", "color-scheme", "dark");
    expectLink(html, "manifest", "/manifest.webmanifest");
    expectLink(html, "icon", "/favicon.svg", {
      type: "image/svg+xml",
    });
    expectLink(
      html,
      "apple-touch-icon",
      "/icons/apple-touch-icon.png",
      { sizes: "180x180" },
    );
  });

  it("ships a valid standalone web app manifest and icon set", () => {
    const manifest = readJsonArtifact<{
      readonly background_color: string;
      readonly description: string;
      readonly display: string;
      readonly icons: readonly {
        readonly purpose: string;
        readonly sizes: string;
        readonly src: string;
        readonly type: string;
      }[];
      readonly id: string;
      readonly lang: string;
      readonly name: string;
      readonly orientation: string;
      readonly scope: string;
      readonly short_name: string;
      readonly start_url: string;
      readonly theme_color: string;
    }>("manifest.webmanifest");

    expect(manifest).toMatchObject({
      background_color: "#09090b",
      description: DESCRIPTION,
      display: "standalone",
      id: "/",
      lang: "zh-CN",
      name: "Football Life Reborn",
      orientation: "any",
      scope: "/",
      short_name: "Football Life",
      start_url: "/",
      theme_color: "#09090b",
    });
    expect(manifest.icons).toEqual([
      {
        purpose: "any maskable",
        sizes: "192x192",
        src: "/icons/icon-192.png",
        type: "image/png",
      },
      {
        purpose: "any maskable",
        sizes: "512x512",
        src: "/icons/icon-512.png",
        type: "image/png",
      },
    ]);

    expectPngArtifact("icons/apple-touch-icon.png", 180, 180);
    expectPngArtifact("icons/icon-192.png", 192, 192);
    expectPngArtifact("icons/icon-512.png", 512, 512);
  });

  it("ships a valid SVG favicon and 1200 by 630 social card", () => {
    const favicon = readArtifact("favicon.svg", "utf8");

    expect(extname("favicon.svg")).toBe(".svg");
    expect(favicon).toContain("<svg");
    expect(favicon).toContain('viewBox="0 0 64 64"');
    expect(favicon).toContain("<title>Football Life Reborn</title>");
    expectPngArtifact("social-card.png", 1200, 630);
    expect(
      readFileSync(
        join(PUBLIC_DIRECTORY, "social-card.png"),
      ).byteLength,
    ).toBeLessThan(1_000_000);
  });

  it("ships restrictive static security headers", () => {
    const headers = readArtifact("_headers", "utf8");
    const vercelConfig = JSON.parse(
      readFileSync(
        join(process.cwd(), "vercel.json"),
        "utf8",
      ),
    ) as {
      readonly headers: readonly {
        readonly headers: readonly {
          readonly key: string;
          readonly value: string;
        }[];
        readonly source: string;
      }[];
    };

    expect(headers).toContain("/*");
    expect(headers).toContain(
      "Content-Security-Policy: default-src 'self';",
    );
    expect(headers).toContain("script-src 'self'");
    expect(headers).toContain(
      "style-src 'self' 'unsafe-inline'",
    );
    expect(headers).toContain(
      "img-src 'self' blob: data:",
    );
    expect(headers).toContain("object-src 'none'");
    expect(headers).toContain("base-uri 'self'");
    expect(headers).toContain("form-action 'self'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).not.toContain("'unsafe-eval'");
    expect(headers).toContain(
      "Referrer-Policy: strict-origin-when-cross-origin",
    );
    expect(headers).toContain(
      "X-Content-Type-Options: nosniff",
    );
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).toContain(
      "Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    expect(headers).toContain(
      "Cross-Origin-Opener-Policy: same-origin",
    );
    expect(vercelConfig.headers).toHaveLength(1);
    expect(vercelConfig.headers[0]?.source).toBe("/(.*)");
    expect(
      Object.fromEntries(
        vercelConfig.headers[0]?.headers.map(({ key, value }) => [
          key,
          value,
        ]) ?? [],
      ),
    ).toEqual(parseStaticHeaders(headers));
  });
});

function expectMeta(
  html: string,
  key: "name" | "property",
  keyValue: string,
  content: string,
): void {
  expect(
    attribute(
      requireElement(html, "meta", {
        [key]: keyValue,
      }),
      "content",
    ),
  ).toBe(content);
}

function expectLink(
  html: string,
  rel: string,
  href: string,
  attributes: Readonly<Record<string, string>> = {},
): void {
  const element = requireElement(html, "link", {
    rel,
    ...attributes,
  });
  expect(attribute(element, "href")).toBe(href);
}

function requireElement(
  html: string,
  tagName: "link" | "meta",
  attributes: Readonly<Record<string, string>>,
): string {
  const candidates =
    html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gu")) ?? [];
  const matching = candidates.find((candidate) =>
    Object.entries(attributes).every(
      ([name, value]) => attribute(candidate, name) === value,
    ),
  );

  if (matching === undefined) {
    throw new Error(
      `Missing <${tagName}> with ${JSON.stringify(attributes)}`,
    );
  }

  return matching;
}

function attribute(element: string, name: string): string | null {
  const escapedName = name.replace(
    /[.*+?^${}()|[\]\\]/gu,
    "\\$&",
  );
  const match = element.match(
    new RegExp(
      `(?:^|\\s)${escapedName}=(["'])(.*?)\\1`,
      "u",
    ),
  );

  return match?.[2] ?? null;
}

function readJsonArtifact<T>(relativePath: string): T {
  return JSON.parse(
    readArtifact(relativePath, "utf8"),
  ) as T;
}

function readArtifact(
  relativePath: string,
  encoding: "utf8",
): string;
function readArtifact(
  relativePath: string,
  encoding?: undefined,
): Buffer;
function readArtifact(
  relativePath: string,
  encoding?: "utf8",
): Buffer | string {
  const publicPath = join(PUBLIC_DIRECTORY, relativePath);
  const distPath = join(DIST_DIRECTORY, relativePath);

  expect(existsSync(publicPath)).toBe(true);
  expect(existsSync(distPath)).toBe(true);

  const publicArtifact = readFileSync(publicPath);
  const distArtifact = readFileSync(distPath);
  expect(distArtifact).toEqual(publicArtifact);

  return encoding === "utf8"
    ? publicArtifact.toString("utf8")
    : publicArtifact;
}

function expectPngArtifact(
  relativePath: string,
  width: number,
  height: number,
): void {
  const png = readArtifact(relativePath);

  expect(Array.from(png.subarray(0, 8))).toEqual([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);
  expect(png.readUInt32BE(16)).toBe(width);
  expect(png.readUInt32BE(20)).toBe(height);
}

function parseStaticHeaders(
  document: string,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    document
      .split("\n")
      .slice(1)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const separator = line.indexOf(":");

        if (separator < 0) {
          throw new Error(`Invalid static header line: ${line}`);
        }

        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim(),
        ];
      }),
  );
}
