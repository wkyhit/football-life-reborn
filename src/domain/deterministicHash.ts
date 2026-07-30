export function deterministicHash(value: unknown): string {
  return `fnv1a64:${fnv1a64(stableStringify(value))}`;
}

export function fnv1a64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let hash = 0xcbf29ce484222325n;

  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(
      64,
      hash * 0x100000001b3n,
    );
  }

  return hash.toString(16).padStart(16, "0");
}

export function stableStringify(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) => stableStringify(item))
      .join(",")}]`;
  }

  if (isRecord(value)) {
    const fields = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify(value[key])}`,
      );

    return `{${fields.join(",")}}`;
  }

  throw new TypeError(
    `Cannot stringify value of type ${typeof value}`,
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
