import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const svgPath = path.join(publicDir, "logo.svg");

async function generateIcons() {
  console.log(`Reading SVG from: ${svgPath}`);
  const svgBuffer = await fs.readFile(svgPath);

  // 1. Standard 192x192
  console.log("Generating icon-192.png...");
  await sharp(svgBuffer)
    .resize(192, 192, { fit: "contain" })
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  // 2. Standard 512x512
  console.log("Generating icon-512.png...");
  await sharp(svgBuffer)
    .resize(512, 512, { fit: "contain" })
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  // 3. Maskable 512x512 (Safe-zone 80% inner circle on obsidian background #08080a)
  console.log("Generating icon-maskable.png...");
  const innerSize = Math.round(512 * 0.72); // ~368px
  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize, { fit: "contain" })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 8, g: 8, b: 10, alpha: 1 }, // #08080a
    },
  })
    .composite([
      {
        input: innerBuffer,
        top: Math.round((512 - innerSize) / 2),
        left: Math.round((512 - innerSize) / 2),
      },
    ])
    .png()
    .toFile(path.join(publicDir, "icon-maskable.png"));

  // 4. Apple Touch Icon 180x180 (solid dark obsidian background with padding)
  console.log("Generating apple-touch-icon.png...");
  const appleInnerSize = Math.round(180 * 0.75); // 135px
  const appleInnerBuffer = await sharp(svgBuffer)
    .resize(appleInnerSize, appleInnerSize, { fit: "contain" })
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 8, g: 8, b: 10, alpha: 1 },
    },
  })
    .composite([
      {
        input: appleInnerBuffer,
        top: Math.round((180 - appleInnerSize) / 2),
        left: Math.round((180 - appleInnerSize) / 2),
      },
    ])
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  // 5. Favicons
  console.log("Generating favicon-32x32.png & favicon-16x16.png...");
  await sharp(svgBuffer)
    .resize(32, 32, { fit: "contain" })
    .png()
    .toFile(path.join(publicDir, "favicon-32x32.png"));

  await sharp(svgBuffer)
    .resize(16, 16, { fit: "contain" })
    .png()
    .toFile(path.join(publicDir, "favicon-16x16.png"));

  console.log("Successfully generated all PWA icon assets in apps/web/public!");
}

generateIcons().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});

