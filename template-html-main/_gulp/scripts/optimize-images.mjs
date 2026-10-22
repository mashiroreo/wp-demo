import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { optimize } from "svgo";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.name.startsWith(".") || entry.name.endsWith(".icloud")) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
      continue;
    }

    if (entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function optimizeImages(srcDir, distDir) {
const files = (await walk(srcDir)).sort();
// Keep deterministic legacy ordering: a same-stem PNG supplies WebP after JPEG.
for (const file of files) {
  const relativePath = relative(srcDir, file);
  const outputPath = join(distDir, relativePath);
  const ext = extname(file).toLowerCase();
  const source = await readFile(file);

  await mkdir(dirname(outputPath), { recursive: true });

  if (ext === ".jpg" || ext === ".jpeg") {
    const image = sharp(source).autoOrient();
    const optimized = await image.clone().keepIccProfile().jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const webp = await image.clone().keepIccProfile().webp({ quality: 80 }).toBuffer();

    await writeFile(outputPath, optimized);
    await writeFile(outputPath.replace(/\.(jpe?g)$/i, ".webp"), webp);
    console.log(`optimized ${relativePath}`);
    continue;
  }

  if (ext === ".png") {
    const image = sharp(source).autoOrient();
    const optimized = await image.clone().keepIccProfile().png({
      compressionLevel: 9,
      palette: true,
      quality: 80
    }).toBuffer();
    const webp = await image.clone().keepIccProfile().webp({ quality: 80 }).toBuffer();

    await writeFile(outputPath, optimized);
    await writeFile(outputPath.replace(/\.png$/i, ".webp"), webp);
    console.log(`optimized ${relativePath}`);
    continue;
  }

  if (ext === ".svg") {
    const optimized = optimize(source.toString("utf8"), {
      path: file,
      plugins: [
        {
          name: "preset-default"
        }
      ]
    });

    await writeFile(outputPath, optimized.data);
    console.log(`optimized ${relativePath}`);
    continue;
  }

  await writeFile(outputPath, source);
  console.log(`optimized ${relativePath}`);
}

}
