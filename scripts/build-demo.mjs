// Construit la version de démonstration en un seul fichier HTML (sans serveur ni IA),
// publiable telle quelle : node scripts/build-demo.mjs -> dist-demo/index.html
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist-demo");
mkdirSync(out, { recursive: true });

execFileSync("npx", ["@tailwindcss/cli", "-i", "src/app/globals.css", "-o", "dist-demo/app.css", "--minify"], { cwd: root, stdio: "inherit" });

const result = await build({
  entryPoints: [path.join(root, "demo/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  write: false,
  alias: {
    "next/link": path.join(root, "demo/next-link.tsx"),
    "next/navigation": path.join(root, "demo/next-navigation.ts"),
    "pdfjs-dist": path.join(root, "demo/pdfjs-stub.ts"),
    "@": path.join(root, "src"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_DEMO": '"1"',
  },
  logLevel: "warning",
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(path.join(out, "app.css"), "utf8").replace(/<\/style/gi, "<\\/style");

const html = `<title>Synapse</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap">
<style>
:root { --font-inter: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; --font-grotesk: "Space Grotesk", "Inter", system-ui, sans-serif; color-scheme: light; }
body { background: #f4f6fa; color: #14213d; }
#root { padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px); }
</style>
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
writeFileSync(path.join(out, "index.html"), html);
console.log(`dist-demo/index.html : ${(html.length / 1024).toFixed(0)} Ko`);
