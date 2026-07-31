import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
});

try {
  const benchmark = await server.ssrLoadModule(
    "/src/domain/economy/percentileBenchmark.ts",
  );
  const artifact = benchmark.generatePercentileBenchmark();
  const target = resolve(
    process.cwd(),
    "src/domain/economy/percentileTable.generated.ts",
  );

  await writeFile(
    target,
    benchmark.serializePercentileBenchmark(artifact),
    "utf8",
  );
  process.stdout.write(
    `${artifact.metadata.artifactHash} · ${artifact.metadata.sampleCount} careers\n`,
  );
} finally {
  await server.close();
}
