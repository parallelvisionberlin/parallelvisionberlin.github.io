import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE_PAGES = ["index.html", "tanzen-im-kreis.html", "berlin-2063.html", "future-fashion.html"];
const EXTRA_ASSETS = ["nina-fok/HDNINACANON.png"];
const FORCE = process.argv.includes("--force");
const IMAGE_REFERENCE = /["']((?:https:\/\/parallelvisionlabel\.com\/)?(?:\.\/)?assets\/[^"']+?\.(?:png|jpe?g|webp))["']/gi;

const HERO_POSTERS = new Set([
  "assets/2063/POV DARK HARMONY.png",
  "assets/2063/urban-form/urbangalleryfirst.png",
  "assets/fashion-hero.png",
  "nina-fok/HDNINACANON.png"
]);

const SQUARE_ARTWORKS = new Set([
  "assets/artworks/acid-chacha-final-bigger-original-name.png",
  "assets/artworks/cultoalavida.jpg",
  "assets/tanzenfinal.jpeg",
  "assets/Ravesiamolinariremix.png",
  "assets/Ravesiaremixesart.png",
  "assets/Builttolast.png",
  "assets/artfunkybeats.png",
  "assets/Artdarkrock.png",
  "assets/vision-neo.jpg"
]);

const PROOF_SCREENSHOTS = new Set([
  "assets/releases/tanzenimkreis/EG Premiere Ëlorian.png",
  "assets/releases/tanzenimkreis/x3 Beatport Charts Original.png",
  "assets/releases/tanzenimkreis/Tanzen Minimal Hype Picks.png"
]);

function normalizedReference(value) {
  return value.replace(/^https:\/\/parallelvisionlabel\.com\//i, "").replace(/^\.\//, "").replaceAll("\\", "/");
}

async function referencedAssets() {
  const assets = new Set(EXTRA_ASSETS);
  for (const page of SOURCE_PAGES) {
    const html = await readFile(path.join(ROOT, page), "utf8");
    for (const match of html.matchAll(IMAGE_REFERENCE)) {
      let source = normalizedReference(match[1]);
      if (source.startsWith("assets/optimized/")) {
        const originalBase = source.replace(/^assets\/optimized\//, "assets/").replace(/\.webp$/i, "");
        const candidates = [".png", ".jpg", ".jpeg", ".webp"].map(extension => `${originalBase}${extension}`);
        for (const candidate of candidates) {
          if (await exists(path.join(ROOT, candidate))) { source = candidate; break; }
        }
      }
      assets.add(source);
    }
  }
  return [...assets].sort((left, right) => left.localeCompare(right));
}

function settingsFor(source) {
  if (HERO_POSTERS.has(source)) return { width: 1800, quality: 78, role: "hero" };
  if (SQUARE_ARTWORKS.has(source)) return { width: 900, quality: 80, role: "artwork" };
  if (PROOF_SCREENSHOTS.has(source)) return { width: 900, quality: 78, role: "proof" };
  return { width: 1400, quality: 78, role: "content" };
}

function outputPath(source) {
  const relative = source.replace(/^assets\//, "").replace(/\.(?:png|jpe?g|webp)$/i, ".webp");
  return path.join(ROOT, "assets", "optimized", relative);
}

async function exists(file) {
  try { await stat(file); return true; } catch { return false; }
}

const assets = await referencedAssets();
let created = 0;
let skipped = 0;
let originalBytes = 0;
let optimizedBytes = 0;

for (const source of assets) {
  const input = path.join(ROOT, source);
  const output = outputPath(source);
  const sourceStat = await stat(input);
  originalBytes += sourceStat.size;
  if (!FORCE && await exists(output)) {
    optimizedBytes += (await stat(output)).size;
    skipped += 1;
    continue;
  }
  const { width, quality, role } = settingsFor(source);
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true, fit: "inside" })
    .webp({ quality, alphaQuality: 82, effort: 5, smartSubsample: true })
    .toFile(output);
  const outputStat = await stat(output);
  optimizedBytes += outputStat.size;
  created += 1;
  console.log(`${role.padEnd(7)} ${source} -> ${path.relative(ROOT, output)} (${Math.round(outputStat.size / 1024)} KB)`);
}

const reduction = originalBytes ? Math.round((1 - optimizedBytes / originalBytes) * 100) : 0;
console.log(`Optimized ${created}, skipped ${skipped}, total ${assets.length}. ${reduction}% smaller (${(originalBytes / 1048576).toFixed(1)} MB -> ${(optimizedBytes / 1048576).toFixed(1)} MB).`);
