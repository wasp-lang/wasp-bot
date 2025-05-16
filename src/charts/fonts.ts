import { registerFont } from "canvas";
import * as fs from "fs";
import * as path from "path";

export const defaultFont = "IBMPlexSans";

export function registerFonts(): void {
  const fontDir = path.resolve(__dirname, "../../fonts");
  registerFontsFromDir(fontDir);
}

function registerFontsFromDir(dir: string): void {
  const fontFiles = fs.readdirSync(dir).filter((file) => file.endsWith(".ttf"));
  for (const fontFile of fontFiles) {
    registerStaticFont(fontFile, dir);
  }
}

function registerStaticFont(fileName: string, dir: string): void {
  const fontPath = path.join(dir, fileName);
  const fontFace = parseFontFileName(fileName);

  registerFont(fontPath, fontFace);
}

function parseFontFileName(fileName: string): {
  family: string;
  weight?: string;
  style?: string;
} {
  const [family, other] = fileName.split("-");
  let weight = "normal";
  let style = "normal";

  if (other.includes("Italic")) {
    style = "italic";
  }

  if (other.includes("Thin")) {
    weight = "100";
  }
  if (other.includes("ExtraLight")) {
    weight = "200";
  }
  if (other.includes("Light")) {
    weight = "light";
  }
  if (other.includes("Medium")) {
    weight = "500";
  }
  if (other.includes("SemiBold")) {
    weight = "600";
  }
  if (other.includes("Bold")) {
    weight = "bold";
  }

  return {
    family,
    weight,
    style,
  };
}
