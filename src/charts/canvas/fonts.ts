import { registerFont } from "canvas";
import * as fs from "fs";
import * as path from "path";

export const defaultFont = "IBMPlexSans";
const fontFileExtensions = [".ttf", ".otf", ".woff", ".woff2"];

/**
 * Registers embedded fonts for use with `node-canvas`.
 *
 * Embedded fonts are fonts that we bundle together with the application.
 * They can be found in the [`/fonts` directory](../../../fonts).
 *
 * These fonts are available in addition to the system fonts.
 * We use embedded fonts instead of system fonts to ensure consistent, predictable rendering
 * across all environments (e.g., Docker, CI, Linux, macOS, Windows).
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
  for (const absFontPath of collectAbsFontPathsRecursively(absDirPath)) {
    const fileName = path.basename(absFontPath);
    const fontFace = parseFontFileName(fileName);

    registerFont(absFontPath, fontFace);
  }
}

/**
 * Recursively collects absolute path of all font files from a directory.
 */
function collectAbsFontPathsRecursively(absDirPath: string): string[] {
  return fs
    .readdirSync(absDirPath, {
      recursive: true,
      encoding: "utf8",
    })
    .map((fileName) => path.join(absDirPath, fileName))
    .filter((fileName) =>
      fontFileExtensions.some((ext) => fileName.endsWith(ext)),
    );
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

  const fontAttributes = fontStyleToFontAttributes[style];
  if (!fontAttributes) {
    throw new Error(
      `Font style "${style}" is not recognized. Supported font styles are: ${Object.keys(
        fontStyleToFontAttributes,
      ).join(", ")}`,
    );
  }

  return {
    family,
    ...fontAttributes,
  };
}

const fontStyleToFontAttributes: {
  [fontStyle: string]: Omit<FontFace, "family">;
} = {
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
};
