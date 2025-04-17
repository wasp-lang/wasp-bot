import { Chart, ChartConfiguration } from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { ChartJSNodeCanvas, MimeType } from "chartjs-node-canvas";

// init
Chart.register(MatrixController, MatrixElement);

// NOTE:
// we want to reuse canvases because of memory management
// if we want different sizes we need to create multiple canvases

const canvasConfiguration = {
  width: 800,
  height: 600,
  backgroundColour: "white",
} as const;

const canvas = new ChartJSNodeCanvas(canvasConfiguration);

export function renderChart(
  configuration: ChartConfiguration,
  mimeType?: MimeType,
): Promise<Buffer> {
  return canvas.renderToBuffer(configuration, mimeType);
}
