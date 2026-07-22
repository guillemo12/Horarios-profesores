import { serveDir } from "jsr:@std/http/file-server";
import * as esbuild from "npm:esbuild";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1. Interceptar los archivos TypeScript (.ts)
  if (url.pathname.endsWith(".ts")) {
    const filePath = `./src${url.pathname}`;

    try {
      // Leemos el código TypeScript original de tu carpeta src
      const tsCode = await Deno.readTextFile(filePath);

      // Lo convertimos a JavaScript puro en memoria
      const jsCode = await esbuild.transform(tsCode, { loader: "ts" });

      // Se lo enviamos al navegador indicando que es JavaScript
      return new Response(jsCode.code, {
        headers: { "Content-Type": "application/javascript" },
      });
    } catch (error) {
      console.error("Error leyendo o transpilando:", error);
      return new Response("Archivo no encontrado", { status: 404 });
    }
  }

  // 2. Servir el resto de archivos (HTML, CSS, imágenes) desde 'src'
  return serveDir(req, {
    fsRoot: "./src",
    showDirListing: true,
  });
});