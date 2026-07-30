import type {
  ClassicIdentity,
} from "../../domain/classicEngine";
import {
  fnv1a64,
  stableStringify,
} from "../../domain/deterministicHash";
import { CLASSIC_CONTENT_VERSION } from "../../domain/catalog/classicCatalog";
import type { PacingMode } from "../../domain/pacing";
import type { ClassicPosition } from "../../domain/role";

export const REPLAY_CODEC_VERSION = 1 as const;
export const REPLAY_HASH_PREFIX = "#r=" as const;
export const REPLAY_MAX_URL_LENGTH = 1_800 as const;

const REPLAY_MAX_CHOICES = 32;
const REPLAY_POSITIONS = [
  "LW",
  "ST",
  "RW",
  "LM",
  "CAM",
  "RM",
  "LB",
  "CM",
  "RB",
  "CDM",
  "CB",
  "GK",
] as const satisfies readonly ClassicPosition[];
const MODE_TO_CODE = {
  express: 2,
  long: 0,
  normal: 1,
} as const satisfies Readonly<Record<PacingMode, number>>;
const CODE_TO_MODE = [
  "long",
  "normal",
  "express",
] as const satisfies readonly PacingMode[];

export type ReplayChoice = {
  readonly forcedOutcome?: "negative" | "positive";
  readonly optionId: string;
};

export type ReplayPayload = {
  readonly challengeId: string;
  readonly choiceLog: readonly ReplayChoice[];
  readonly contentVersion: string;
  readonly identity: ClassicIdentity;
  readonly mode: PacingMode;
  readonly seed: string;
  readonly stateHash: string;
};

export type ReplayDecodeResult =
  | {
      readonly payload: ReplayPayload;
      readonly status: "ready";
    }
  | {
      readonly reason:
        | "alphabet"
        | "checksum"
        | "duplicate_field"
        | "empty"
        | "invalid_json"
        | "oversized"
        | "prefix"
        | "schema"
        | "truncated"
        | "utf8";
      readonly status: "invalid";
    }
  | {
      readonly codecVersion: unknown;
      readonly reason: "codec_version";
      readonly status: "unsupported";
    }
  | {
      readonly contentVersion: unknown;
      readonly reason: "content_version";
      readonly status: "unsupported";
    };

type ReplayWireUnsignedV1 = {
  readonly c: string;
  readonly d: string;
  readonly h: string;
  readonly i: readonly [
    lastName: string,
    nationalityFifaCode: string,
    positionCode: number,
    preferredNumber: number,
    firstName?: string,
  ];
  readonly l: readonly string[];
  readonly m: number;
  readonly s: string;
  readonly v: typeof REPLAY_CODEC_VERSION;
};

type ReplayWireDocumentV1 = ReplayWireUnsignedV1 & {
  readonly x: string;
};

export function encodeReplayHash(
  payload: ReplayPayload,
): string {
  const unsigned = toWire(payload);
  const document: ReplayWireDocumentV1 = {
    ...unsigned,
    x: checksum(unsigned),
  };
  const encoded = encodeBase64Url(JSON.stringify(document));
  const hash = `${REPLAY_HASH_PREFIX}${encoded}`;

  if (hash.length > REPLAY_MAX_URL_LENGTH) {
    throw new RangeError(
      `Replay hash exceeds ${REPLAY_MAX_URL_LENGTH} characters`,
    );
  }

  return hash;
}

export function createReplayUrl(
  baseUrl: string | URL,
  payload: ReplayPayload,
): string {
  const url = new URL(baseUrl.toString());
  const hash = encodeReplayHash(payload);
  url.hash = hash.slice(1);
  const value = url.toString();

  if (value.length > REPLAY_MAX_URL_LENGTH) {
    throw new RangeError(
      `Replay URL exceeds ${REPLAY_MAX_URL_LENGTH} characters`,
    );
  }

  return value;
}

export function decodeReplayHash(
  hash: string,
): ReplayDecodeResult {
  if (!hash.startsWith(REPLAY_HASH_PREFIX)) {
    return { reason: "prefix", status: "invalid" };
  }

  if (hash.length > REPLAY_MAX_URL_LENGTH) {
    return { reason: "oversized", status: "invalid" };
  }

  const encoded = hash.slice(REPLAY_HASH_PREFIX.length);

  if (encoded.length === 0) {
    return { reason: "empty", status: "invalid" };
  }

  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    return { reason: "alphabet", status: "invalid" };
  }

  if (encoded.length % 4 === 1) {
    return { reason: "truncated", status: "invalid" };
  }

  let raw: string;

  try {
    raw = decodeBase64Url(encoded);
  } catch (error) {
    return {
      reason:
        error instanceof TypeError &&
        error.message === "invalid_utf8"
          ? "utf8"
          : "truncated",
      status: "invalid",
    };
  }

  const keys = readTopLevelKeys(raw);

  if (
    keys !== null &&
    new Set(keys).size !== keys.length
  ) {
    return {
      reason: "duplicate_field",
      status: "invalid",
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { reason: "invalid_json", status: "invalid" };
  }

  if (
    !isRecord(parsed) ||
    !hasExactKeys(parsed, [
      "c",
      "d",
      "h",
      "i",
      "l",
      "m",
      "s",
      "v",
      "x",
    ])
  ) {
    return { reason: "schema", status: "invalid" };
  }

  if (parsed.v !== REPLAY_CODEC_VERSION) {
    return {
      codecVersion: parsed.v,
      reason: "codec_version",
      status: "unsupported",
    };
  }

  if (!isWireDocument(parsed)) {
    return { reason: "schema", status: "invalid" };
  }

  const unsigned: ReplayWireUnsignedV1 = {
    c: parsed.c,
    d: parsed.d,
    h: parsed.h,
    i: parsed.i,
    l: parsed.l,
    m: parsed.m,
    s: parsed.s,
    v: REPLAY_CODEC_VERSION,
  };

  if (parsed.x !== checksum(unsigned)) {
    return { reason: "checksum", status: "invalid" };
  }

  if (parsed.c !== CLASSIC_CONTENT_VERSION) {
    return {
      contentVersion: parsed.c,
      reason: "content_version",
      status: "unsupported",
    };
  }

  const payload = fromWire(unsigned);

  return payload === null
    ? { reason: "schema", status: "invalid" }
    : { payload, status: "ready" };
}

function toWire(
  payload: ReplayPayload,
): ReplayWireUnsignedV1 {
  assertPayload(payload);
  const firstName = payload.identity.firstName;
  const identity =
    firstName === undefined
      ? ([
          payload.identity.lastName,
          payload.identity.nationalityFifaCode,
          REPLAY_POSITIONS.indexOf(
            payload.identity.position,
          ),
          payload.identity.preferredNumber,
        ] as const)
      : ([
          payload.identity.lastName,
          payload.identity.nationalityFifaCode,
          REPLAY_POSITIONS.indexOf(
            payload.identity.position,
          ),
          payload.identity.preferredNumber,
          firstName,
        ] as const);

  return {
    c: payload.contentVersion,
    d: payload.challengeId,
    h: payload.stateHash.slice("fnv1a64:".length),
    i: identity,
    l: payload.choiceLog.map(encodeChoice),
    m: MODE_TO_CODE[payload.mode],
    s: payload.seed,
    v: REPLAY_CODEC_VERSION,
  };
}

function fromWire(
  wire: ReplayWireUnsignedV1,
): ReplayPayload | null {
  const position = REPLAY_POSITIONS[wire.i[2]];
  const mode = CODE_TO_MODE[wire.m];

  if (position === undefined || mode === undefined) {
    return null;
  }

  const choices: ReplayChoice[] = [];

  for (const value of wire.l) {
    const choice = decodeChoice(value);

    if (choice === null) {
      return null;
    }

    choices.push(choice);
  }

  const firstName = wire.i[4];
  const identity: ClassicIdentity = Object.freeze({
    ...(firstName === undefined ? {} : { firstName }),
    lastName: wire.i[0],
    nationalityFifaCode: wire.i[1],
    position,
    preferredNumber: wire.i[3],
  });

  return Object.freeze({
    challengeId: wire.d,
    choiceLog: Object.freeze(choices),
    contentVersion: wire.c,
    identity,
    mode,
    seed: wire.s,
    stateHash: `fnv1a64:${wire.h}`,
  });
}

function encodeChoice(choice: ReplayChoice): string {
  const outcome =
    choice.forcedOutcome === undefined
      ? "0"
      : choice.forcedOutcome === "positive"
        ? "1"
        : "2";

  return `${outcome}${compactOptionId(choice.optionId)}`;
}

function decodeChoice(value: string): ReplayChoice | null {
  if (value.length < 2) {
    return null;
  }

  const optionId = expandOptionId(value.slice(1));

  if (optionId === null || !isOptionId(optionId)) {
    return null;
  }

  const marker = value[0];
  const forcedOutcome =
    marker === "0"
      ? undefined
      : marker === "1"
        ? "positive"
        : marker === "2"
          ? "negative"
          : null;

  if (forcedOutcome === null) {
    return null;
  }

  return Object.freeze({
    ...(forcedOutcome === undefined
      ? {}
      : { forcedOutcome }),
    optionId,
  });
}

function compactOptionId(value: string): string {
  if (value === "stay") {
    return "s";
  }
  if (value === "retire") {
    return "r";
  }
  if (value === "return_parent") {
    return "p";
  }
  if (value.startsWith("join:")) {
    return `j${value.slice("join:".length)}`;
  }
  if (value.startsWith("loan:")) {
    return `l${value.slice("loan:".length)}`;
  }
  if (value.startsWith("event:")) {
    return `e${value.slice("event:".length)}`;
  }

  return `x${value}`;
}

function expandOptionId(value: string): string | null {
  const suffix = value.slice(1);

  switch (value[0]) {
    case "s":
      return suffix.length === 0 ? "stay" : null;
    case "r":
      return suffix.length === 0 ? "retire" : null;
    case "p":
      return suffix.length === 0 ? "return_parent" : null;
    case "j":
      return `join:${suffix}`;
    case "l":
      return `loan:${suffix}`;
    case "e":
      return `event:${suffix}`;
    case "x":
      return suffix;
    default:
      return null;
  }
}

function assertPayload(payload: ReplayPayload): void {
  if (
    !isBoundedString(payload.challengeId, 1, 120) ||
    !/^[A-Za-z0-9:_-]+$/.test(payload.challengeId)
  ) {
    throw new RangeError("Replay challenge ID is invalid");
  }
  if (payload.contentVersion !== CLASSIC_CONTENT_VERSION) {
    throw new RangeError(
      `Unsupported replay content version: ${payload.contentVersion}`,
    );
  }
  if (!isBoundedString(payload.seed, 1, 200)) {
    throw new RangeError("Replay seed is invalid");
  }
  if (!(payload.mode in MODE_TO_CODE)) {
    throw new RangeError("Replay pacing mode is invalid");
  }
  if (!isIdentity(payload.identity)) {
    throw new RangeError("Replay identity is invalid");
  }
  if (
    !Array.isArray(payload.choiceLog) ||
    payload.choiceLog.length > REPLAY_MAX_CHOICES ||
    !payload.choiceLog.every(isReplayChoice)
  ) {
    throw new RangeError("Replay choice log is invalid");
  }
  if (!/^fnv1a64:[0-9a-f]{16}$/.test(payload.stateHash)) {
    throw new RangeError("Replay state hash is invalid");
  }
}

function isWireDocument(
  value: Record<string, unknown>,
): value is ReplayWireDocumentV1 {
  return (
    value.v === REPLAY_CODEC_VERSION &&
    typeof value.c === "string" &&
    isBoundedString(value.d, 1, 120) &&
    /^[A-Za-z0-9:_-]+$/.test(value.d) &&
    typeof value.h === "string" &&
    /^[0-9a-f]{16}$/.test(value.h) &&
    Array.isArray(value.i) &&
    (value.i.length === 4 || value.i.length === 5) &&
    isBoundedString(value.i[0], 1, 80) &&
    typeof value.i[1] === "string" &&
    /^[A-Z]{3}$/.test(value.i[1]) &&
    Number.isInteger(value.i[2]) &&
    (value.i[2] as number) >= 0 &&
    (value.i[2] as number) < REPLAY_POSITIONS.length &&
    Number.isInteger(value.i[3]) &&
    (value.i[3] as number) >= 1 &&
    (value.i[3] as number) <= 99 &&
    (value.i.length === 4 ||
      (typeof value.i[4] === "string" &&
        value.i[4].length <= 80)) &&
    Array.isArray(value.l) &&
    value.l.length <= REPLAY_MAX_CHOICES &&
    value.l.every(
      (item) =>
        typeof item === "string" &&
        item.length >= 2 &&
        item.length <= 162,
    ) &&
    Number.isInteger(value.m) &&
    (value.m as number) >= 0 &&
    (value.m as number) < CODE_TO_MODE.length &&
    isBoundedString(value.s, 1, 200) &&
    typeof value.x === "string" &&
    /^[0-9a-f]{16}$/.test(value.x)
  );
}

function isIdentity(value: ClassicIdentity): boolean {
  return (
    isBoundedString(value.lastName, 1, 80) &&
    /^[A-Z]{3}$/.test(value.nationalityFifaCode) &&
    REPLAY_POSITIONS.includes(value.position) &&
    Number.isInteger(value.preferredNumber) &&
    value.preferredNumber >= 1 &&
    value.preferredNumber <= 99 &&
    (value.firstName === undefined ||
      (typeof value.firstName === "string" &&
        value.firstName.length <= 80))
  );
}

function isReplayChoice(value: ReplayChoice): boolean {
  return (
    isOptionId(value.optionId) &&
    (value.forcedOutcome === undefined ||
      value.forcedOutcome === "positive" ||
      value.forcedOutcome === "negative")
  );
}

function isOptionId(value: string): boolean {
  return (
    isBoundedString(value, 1, 160) &&
    /^[A-Za-z0-9:_-]+$/.test(value)
  );
}

function isBoundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return (
    typeof value === "string" &&
    value.length >= minimum &&
    value.length <= maximum
  );
}

function checksum(value: ReplayWireUnsignedV1): string {
  return fnv1a64(stableStringify(value));
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string): string {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (item) =>
    item.charCodeAt(0),
  );

  try {
    return new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes);
  } catch {
    throw new TypeError("invalid_utf8");
  }
}

function readTopLevelKeys(raw: string): string[] | null {
  const keys: string[] = [];
  let objectDepth = 0;
  let arrayDepth = 0;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];

    if (character === "{") {
      objectDepth += 1;
      continue;
    }
    if (character === "}") {
      objectDepth -= 1;
      continue;
    }
    if (character === "[") {
      arrayDepth += 1;
      continue;
    }
    if (character === "]") {
      arrayDepth -= 1;
      continue;
    }
    if (character !== '"') {
      continue;
    }

    const start = index;
    let escaped = false;

    for (index += 1; index < raw.length; index += 1) {
      const current = raw[index];

      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === '"') {
        break;
      }
    }

    if (index >= raw.length) {
      return null;
    }

    let next = index + 1;

    while (/\s/.test(raw[next] ?? "")) {
      next += 1;
    }

    if (
      objectDepth === 1 &&
      arrayDepth === 0 &&
      raw[next] === ":"
    ) {
      try {
        keys.push(
          JSON.parse(raw.slice(start, index + 1)) as string,
        );
      } catch {
        return null;
      }
    }
  }

  return keys;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();

  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index])
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
