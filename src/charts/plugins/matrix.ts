import { Plugin } from "chart.js";

/**
 * @name matrixAutoScaleCellSize
 * @description A Chart.js plugin that dynamically adjusts the size of matrix cells to fit the chart area.
 *
 * This plugin calculates the optimal width and height for matrix cells based on the chart's available
 * area and the maximum x and y values in the dataset. It ensures that cells scale proportionally
 * with the chart's dimensions, preventing overlaps and maintaining a visually appealing layout.
 *
 * The plugin operates during the `afterLayout` lifecycle hook, which guarantees that the chart area
 * has been properly calculated before cell size adjustments are made.
 */
export const matrixAutoScaleCellSize: Plugin<"matrix"> = {
  id: "matrix-cell-size",
  afterLayout: (chart) => {
    const chartArea = chart.chartArea;

    for (const dataset of chart.data.datasets) {
      const maxX = Math.max(...dataset.data.map((point) => point.x));
      const maxY = Math.max(...dataset.data.map((point) => point.y));

      const xLength = maxX + 1;
      const yLength = maxY + 1;

      const cellWidth = chartArea.width / xLength;
      const cellHeight = chartArea.height / yLength;

      // -1 stops overlaps
      dataset.width = () => cellWidth - 1;
      dataset.height = () => cellHeight - 1;
    }
  },
};
