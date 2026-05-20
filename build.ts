import tailwindPlugin from "bun-plugin-tailwind"

const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: "./dist",
  minify: true,
  plugins: [tailwindPlugin],
})

if (!result.success) {
  console.error("Build failed")
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

console.log(`Built ${result.outputs.length} files to ./dist`)
