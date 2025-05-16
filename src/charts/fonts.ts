import { registerFont } from "canvas";
import * as fs from "fs";
import * as path from "path";

export const defaultFont = "IBMPlexSans";

export function registerFonts(): void {
  const fontDir = path.resolve(__dirname, "../../fonts");
  registerFontsFromDir(fontDir);
}

function registerFontsFromDir(absDirPath: string): void {
  const fontFiles = fs
    .readdirSync(absDirPath)
    .filter((file) => file.endsWith(".ttf"));
  for (const fontFile of fontFiles) {
    registerStaticFont(fontFile, absDirPath);
  }
}

function registerStaticFont(fileName: string, absDirPath: string): void {
  const fontPath = path.join(absDirPath, fileName);
  const fontFace = parseFontFileName(fileName);

  registerFont(fontPath, fontFace);
}

function parseFontFileName(fileName: string): {
  family: string;
  weight: string;
  style: string;
} {
  const stem = fileName.split(".")[0];
  const [familyName, styleName] = stem.split("-");

  if (!isStyleName(styleName)) {
    throw new Error(
      `Font style name "${styleName}" is not recognized. Supported styles are: ${Object.keys(
        fontStyleNameMap,
      ).join(", ")}`,
    );
  }

  const { weight, style } = fontStyleNameMap[styleName];

  return {
    family: familyName,
    weight,
    style,
  };
}

function isStyleName(
  styleName: string,
): styleName is keyof typeof fontStyleNameMap {
  return Object.keys(fontStyleNameMap).includes(styleName);
}

const fontStyleNameMap = {
  Thin: { weight: "100", style: "normal" },
  ThinItalic: { weight: "100", style: "italic" },
  ExtraLight: { weight: "200", style: "normal" },
  ExtraLightItalic: { weight: "200", style: "italic" },
  Light: { weight: "300", style: "normal" },
  LightItalic: { weight: "300", style: "italic" },
  Regular: { weight: "normal", style: "normal" },
  Italic: { weight: "normal", style: "italic" },
  Medium: { weight: "500", style: "normal" },
  MediumItalic: { weight: "500", style: "italic" },
  SemiBold: { weight: "600", style: "normal" },
  SemiBoldItalic: { weight: "600", style: "italic" },
  Bold: { weight: "bold", style: "normal" },
  BoldItalic: { weight: "bold", style: "italic" },
  ExtraBold: { weight: "800", style: "normal" },
  ExtraBoldItalic: { weight: "800", style: "italic" },
  Black: { weight: "900", style: "normal" },
  BlackItalic: { weight: "900", style: "italic" },
} as const;
