/**
 * Creates a color interpolator function.
 * @param colors - Array of hex color codes to interpolate between
 * @returns A function that accepts a percentage (0-1) and returns the interpolated color.
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
 * @returns A function that accepts a percentage (0-1) and returns the interpolated color.
 */
function createTwoColorInterpolator(
  color1: string,
  color2: string,
): (value: number) => string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);

  return (value: number) => {
    const r = r1 + (r2 - r1) * value;
    const g = g1 + (g2 - g1) * value;
    const b = b1 + (b2 - b1) * value;

    return rgbToHex(r, g, b);
  };
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
