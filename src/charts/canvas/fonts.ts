import { registerFont } from "canvas";
import * as fs from "fs";
import * as path from "path";

export const defaultFont = "IBMPlexSans";
const fontFileExtensions = [".ttf", ".otf", ".woff", ".woff2"];

/**
 * Registers embedded fonts for use with `node-canvas`.
 *
 * Uses embedded fonts instead of system fonts to ensure consistent, predictable rendering
 * across all environments (e.g., Docker, CI, Linux, macOS, Windows).
 *
 * Benefits of using embedded fonts:
 * - Ensures charts and text render the same regardless of OS or available system fonts. No issues due to missing or substituted fonts.
 * - Avoids reliance on external font packages in Docker or CI environments
 * - Allows use of fonts specifically chosen for charts and data visualization
 */
export function registerEmbeddedFonts(): void {
  const fontsDir = path.resolve(__dirname, "../../../fonts");
  registerFontsFromDir(fontsDir);
}

/**
 * Registers all supported font files from a given absolute directory path
 * for use with `node-canvas`.
 *
 * Only static fonts are supported. Variable fonts (e.g., `.ttf` files with multiple weight/width axes)
 * are not usable with `node-canvas` and will be ignored or may cause unexpected behavior.
 */
function registerFontsFromDir(absDirPath: string): void {
  const absFontPaths = collectAbsFontPathsRecursively(absDirPath);
  for (const absFontPath of absFontPaths) {
    const fileName = path.basename(absFontPath);
    const fontFace = parseFontFileName(fileName);

    registerFont(absFontPath, fontFace);
  }
}

/**
 * Recursively collects absolute path of all font files from a directory.
 */
function collectAbsFontPathsRecursively(absDirPath: string): string[] {
  let absFontPaths: string[] = [];

  const fileNames = fs.readdirSync(absDirPath);
  for (const fileName of fileNames) {
    const absFontPath = path.join(absDirPath, fileName);
    const stat = fs.statSync(absFontPath);

    if (stat.isDirectory()) {
      absFontPaths = absFontPaths.concat(
        collectAbsFontPathsRecursively(absFontPath),
      );
    } else if (fontFileExtensions.some((ext) => absFontPath.endsWith(ext))) {
      absFontPaths.push(absFontPath);
    }
  }

  return absFontPaths;
}

interface FontFace {
  family: string;
  weight: string;
  style: string;
}

/**
 * Parses a font file name to extract the font face information.
 *
 * The expected format is: `FontFamily-FontStyle.ext`
 * For example: `IBMPlexSans-Regular.ttf` or `IBMPlexSans-BoldItalic.otf`.
 *
 * This format is known as the "Weight-Stretch-Slope" (WWS) naming model.
 * It is also known as "Weight-Width-Slope" format.
 * However, the format is not universal, but widely accepted standard.
 *
 * Currently as `node-canvas` doesn't support stretch,
 * so we also don't include it in the parsing.
 *
 * @throws {Error} If the font style is not recognized.
 */
function parseFontFileName(fileName: string): FontFace {
  const stem = fileName.split(".")[0];
  const [family, style] = stem.split("-");
  const fontAttributes = parseFontStyle(style);

  return {
    family,
    ...fontAttributes,
  };
}

function parseFontStyle(fontStyle: string): Omit<FontFace, "family"> {
  if (!isValidFontStyle(fontStyle)) {
    throw new Error(
      `Font style "${fontStyle}" is not recognized. Supported font styles are: ${Object.keys(
        fontStyleToFontAttributes,
      ).join(", ")}`,
    );
  }

  return fontStyleToFontAttributes[fontStyle];
}

function isValidFontStyle(
  styleName: string,
): styleName is keyof typeof fontStyleToFontAttributes {
  return Object.keys(fontStyleToFontAttributes).includes(styleName);
}

const fontStyleToFontAttributes = {
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
