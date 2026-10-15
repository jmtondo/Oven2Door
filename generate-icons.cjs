const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "src/assets/oven2doorlogo.png");
const output = path.join(__dirname, "public/icons");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  fs.mkdirSync(output, { recursive: true });

  for (const size of sizes) {
    await sharp(source)
      .resize(size, size, {
        fit: "contain",
        background: "#ffffff",
      })
      .png()
      .toFile(path.join(output, `icon-${size}x${size}.png`));

    console.log(`Generated ${size}x${size} icon`);
  }

  console.log("Oven2Door PWA icons generated!");
}

generateIcons().catch(console.error);
