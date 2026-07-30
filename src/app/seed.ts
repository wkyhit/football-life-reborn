export function seedFromSearch(search: string): string {
  const seed = new URLSearchParams(search).get("seed")?.trim();
  return seed ? seed.slice(0, 128) : "phase-1-default";
}
