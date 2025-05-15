import { registerFont } from "canvas";
import { Chart, ChartConfiguration } from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import {
  ChartJSNodeCanvas,
  ChartJSNodeCanvasOptions,
  MimeType,
} from "chartjs-node-canvas";
import * as fs from "fs";
import * as path from "path";

// Font registration.
// NOTE: Font family name is derived from the font file name
// by removing the ".ttf" extension and replacing underscores with spaces.
const fontDir = path.resolve(__dirname, "../../fonts");
const fontFiles = fs
  .readdirSync(fontDir)
  .filter((file) => file.endsWith(".ttf"));
for (const fontFile of fontFiles) {
  const fontPath = path.join(fontDir, fontFile);
  registerFont(fontPath, {
    family: fontPath.replace(/\.ttf$/, "").replace(/_/g, " "),
  });
}

// Chart.js initialization.
Chart.register(MatrixController, MatrixElement);

// NOTE:
// We reuse the same canvas instance for memory efficiency.
// If different chart sizes are needed, create multiple canvas instances.

const canvasConfiguration: ChartJSNodeCanvasOptions = {
  width: 800,
  height: 600,
  backgroundColour: "white",
};

const canvas = new ChartJSNodeCanvas(canvasConfiguration);

export function renderChart(
  configuration: ChartConfiguration,
  mimeType?: MimeType,
): Promise<Buffer> {
  if (!configuration.options) {
    configuration.options = {};
  }

  configuration.options.font = {
    family: "IBM Plex",
    ...(configuration.options.font || {}),
  };

  return canvas.renderToBuffer(configuration, mimeType);
}
