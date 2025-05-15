import { Chart, ChartConfiguration } from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import {
  ChartJSNodeCanvas,
  ChartJSNodeCanvasOptions,
  MimeType,
} from "chartjs-node-canvas";

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
  return canvas.renderToBuffer(configuration, mimeType);
}
