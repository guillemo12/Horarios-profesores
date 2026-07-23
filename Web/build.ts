import * as esbuild from "npm:esbuild@^0.20.2";

await esbuild.build({
  entryPoints: ["./src/Datos.ts"],
  bundle: true,
  outfile: "../src/main/resources/static/Datos.js",
  format: "esm",
  target: ["es2020"],
});

Deno.copyFileSync("./src/eduschedule.html", "../src/main/resources/static/index.html");

try {
  Deno.mkdirSync("../src/main/resources/static/lib", { recursive: true });
} catch (e) {}

for (const entry of Deno.readDirSync("./src/lib")) {
  if (entry.isFile) {
    Deno.copyFileSync(`./src/lib/${entry.name}`, `../src/main/resources/static/lib/${entry.name}`);
  }
}

esbuild.stop();
