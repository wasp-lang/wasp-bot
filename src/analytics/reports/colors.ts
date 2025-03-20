/**
 * Interpolates between multiple colors, returning an array of evenly spaced colors
 * @param {string[]} colors - Array of hex color codes to interpolate between
 * @param {number} steps - Total number of colors to return
 * @returns {string[]} Array of hex color codes
 */
export function interpolateColors(colors: string[], steps: number): string[] {
  if (steps <= 1) return [colors[0]];
  if (colors.length === 0) return [];
  if (colors.length === 1) return Array(steps).fill(colors[0]);
  if (steps === colors.length) return colors;

  const result: string[] = [];

  if (colors.length === 2) {
    return interpolateTwoColors(colors[0], colors[1], steps);
  }

  // For multiple colors, determine segments
  const segmentCount = colors.length - 1;
  const stepsPerSegment = Math.floor(steps / segmentCount);
  const extraSteps = steps - stepsPerSegment * segmentCount;

  // Distribute steps across segments
  const segmentSteps: number[] = Array(segmentCount).fill(stepsPerSegment);
  for (let i = 0; i < extraSteps; i++) {
    segmentSteps[i % segmentCount]++;
  }

  for (let i = 0; i < segmentCount; i++) {
    const segmentColors = interpolateTwoColors(
      colors[i],
      colors[i + 1],
      segmentSteps[i] + (i < segmentCount - 1 ? 1 : 0),
    );

    // Add all colors except the last one (to avoid duplicates)
    // except for the final segment
    if (i < segmentCount - 1) {
      result.push(...segmentColors.slice(0, -1));
    } else {
      result.push(...segmentColors);
    }
  }

  return result;
}
/**
 * Interpolates between two colors, returning an array of evenly spaced colors
 * @param {string} color1 - Starting hex color code
 * @param {string} color2 - Ending hex color code
 * @param {number} steps - Number of colors to return (including start and end colors)
 * @returns {string[]} Array of hex color codes
 */
function interpolateTwoColors(
  color1: string,
  color2: string,
  steps: number,
): string[] {
  // Handle edge cases
  if (steps <= 1) return [color1];
  if (steps === 2) return [color1, color2];

  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);

  const result: string[] = [];

  // Calculate step sizes for each component
  const stepR = (r2 - r1) / (steps - 1);
  const stepG = (g2 - g1) / (steps - 1);
  const stepB = (b2 - b1) / (steps - 1);

  // Generate each color in the gradient
  for (let i = 0; i < steps; i++) {
    const r = r1 + stepR * i;
    const g = g1 + stepG * i;
    const b = b1 + stepB * i;

    result.push(rgbToHex(r, g, b));
  }

  return result;
}
/**
 * Converts a hex color string to RGB components
 * @param {string} hex - Hex color code (with or without # prefix)
 * @returns {[number, number, number]} RGB values as numbers
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
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} Hex color code with # prefix
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    Math.round(r).toString(16).padStart(2, "0") +
    Math.round(g).toString(16).padStart(2, "0") +
    Math.round(b).toString(16).padStart(2, "0")
  );
}
