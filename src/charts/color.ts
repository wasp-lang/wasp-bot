// Palettes source https://mk.bcgsc.ca/brewer/swatches/brewer.txt
export const SEQUENTIAL_BLUE_PALETTE = [
  "rgb(239, 243, 255)",
  "rgb(198, 219, 239)",
  "rgb(158, 202, 225)",
  "rgb(107, 174, 214)",
  "rgb(66, 146, 198)",
  "rgb(33, 113, 181)",
  "rgb(8, 69, 148)",
];

export const SEQUENTIAL_GREEN_PALETTE = [
  "rgb(237, 248, 233)",
  "rgb(199, 233, 192)",
  "rgb(161, 217, 155)",
  "rgb(116, 196, 118)",
  "rgb(65, 171, 93)",
  "rgb(35, 139, 69)",
  "rgb(0, 90, 50)",
];

export function getFontColorForBackgroundColor(
  backgroundColor: string,
): string {
  return isDarkColor(backgroundColor) ? "white" : "black";
}

export function isDarkColor(color: string): boolean {
  const luminance = calculateLuminance(color);
  return luminance < 0.35;
}

/**
 * Calculates the luminance of an RGB color.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function calculateLuminance(color: string): number {
  const rgb = colorToRgb(color);
  const a = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Creates a color interpolator function.
 * @param colors - Array of hex color codes to interpolate between
 * @returns A function that accepts a value from 0 to 1
 * (where 0 is the start color and 1 is the end color)
 * and returns the interpolated color.
 */
export function createColorInterpolator(
  colors: string[],
): (value: number) => string {
  if (colors.length === 0) {
    throw new Error("At least one color must be provided.");
  }

  if (colors.length === 1) {
    const color = colors[0];
    return () => color;
  }

  if (colors.length === 2) {
    return createTwoColorInterpolator(colors[0], colors[1]);
  }

  // Multiple colors interpolation
  const segmentCount = colors.length - 1;
  return (value: number) => {
    if (value <= 0) return colors[0];
    if (value >= 1) return colors[colors.length - 1];

    const segment = Math.floor(value * segmentCount);
    const segmentValue = (value * segmentCount) % 1;

    return createTwoColorInterpolator(
      colors[segment],
      colors[segment + 1],
    )(segmentValue);
  };
}

/**
 * Creates a color interpolator function between two colors.
 * @param color1 - Starting hex color code
 * @param color2 - Ending hex color code
 * @returns A function that accepts a value from 0 to 1
 * (where 0 is the start color and 1 is the end color)
 * and returns the interpolated color.
 */
function createTwoColorInterpolator(
  color1: string,
  color2: string,
): (value: number) => string {
  const [r1, g1, b1] = colorToRgb(color1);
  const [r2, g2, b2] = colorToRgb(color2);

  return (value: number) => {
    const r = r1 + (r2 - r1) * value;
    const g = g1 + (g2 - g1) * value;
    const b = b1 + (b2 - b1) * value;

    return rgbToHex(r, g, b);
  };
}

/**
 * Converts a color string (hex or rgb) to RGB components
 * @param color - Color code (hex or rgb)
 * @returns RGB values as numbers
 */
function colorToRgb(color: string): [number, number, number] {
  if (typeof color !== "string") {
    throw new Error(`Expected a string, but received: ${typeof color}`);
  }

  if (color.startsWith("#")) {
    return hexToRgb(color);
  } else if (color.startsWith("rgb")) {
    return rgbStringToRgb(color);
  } else {
    throw new Error(`Unsupported color format: ${color}`);
  }
}

/**
 * Converts a hex color string to RGB components
 * @param hex - Hex color code (with or without # prefix)
 * @returns RGB values as numbers
 */
function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;

  // Parse hex values to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return [r, g, b];
}

/**
 * Converts an rgb color string to RGB components
 * @param rgb - rgb color code
 * @returns RGB values as numbers
 */
function rgbStringToRgb(rgb: string): [number, number, number] {
  const cleanRgb = rgb.substring(4, rgb.length - 1);
  const [r, g, b] = cleanRgb.split(",").map(Number);

  return [r, g, b];
}

/**
 * Converts RGB components to a hex color string
 * @param  r - Red component (0-255)
 * @param  g - Green component (0-255)
 * @param  b - Blue component (0-255)
 * @returns Hex color code with # prefix
 */
function rgbToHex(r: number, g: number, b: number): string {
  const roundedR = Math.round(r);
  const roundedG = Math.round(g);
  const roundedB = Math.round(b);

  return (
    "#" +
    roundedR.toString(16).padStart(2, "0") +
    roundedG.toString(16).padStart(2, "0") +
    roundedB.toString(16).padStart(2, "0")
  );
}
