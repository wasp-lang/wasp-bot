import { Chart, ChartConfiguration } from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { ChartJSNodeCanvas, MimeType } from "chartjs-node-canvas";
import _ from "lodash";
import { defaultFont, registerEmbeddedFonts } from "./fonts";

// `node-canvas` init.
registerEmbeddedFonts();

// `chart.js` init.
Chart.register(MatrixController, MatrixElement);

// NOTE:
// We reuse the same canvas instance for memory efficiency.
// If different chart sizes are needed, create multiple canvas instances.
const canvas = new ChartJSNodeCanvas({
  width: 800,
  height: 600,
  backgroundColour: "white",
});

export function renderChart(
  configuration: ChartConfiguration,
  mimeType?: MimeType,
): Promise<Buffer> {
  _.set(
    configuration,
    "options.font.family",
    _.get(configuration, "options.font.family") ?? defaultFont,
  );

  return canvas.renderToBuffer(configuration, mimeType);
}
