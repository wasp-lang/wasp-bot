import ImageCharts from "image-charts";

export interface ChartData {
  series: { [column: string]: number[] };
  periodEnds: string[];
}

/**
 * Builds a stacked vertical bar chart for user activity report.
 */
export function buildUserActivityReportChart(
  data: ChartData,
  title: string,
): ImageCharts {
  return createBaseChart(data, title).cht("bvs"); // Type - "bars vertical stacked"
}

/**
 * Creates a base chart configuration with common settings used across all chart types.
 * This establishes the default formatting, sizing, and data structure that all charts share.
 */
function createBaseChart(data: ChartData, title: string): ImageCharts {
  const chart = new ImageCharts()
    .chtt(title) // Title.
    .chd(
      "a:" +
        Object.values(data.series)
          .map((s) => s.join(","))
          .join("|"),
    ) // Data series.
    .chl(
      Object.values(data.series)
        .map((s) => s.map((v) => v ?? undefined).join("|"))
        .join("|"),
    ) // Value labels on bars.
    .chlps("font.size,12")
    .chdl(Object.keys(data.series).join("|")) // Legend (per series)
    .chdlp("b") // Position of legend. 'b' is for bottom.
    .chxl("0:|" + data.periodEnds.join("|")) // X axis labels.
    .chxs("0,s,min45max45") // On x-axis (0), skip some labels (s) and use 45 degress angle (min45max45).
    .chs("700x400") // Size.
    .chg("20,20") // Solid or dotted grid lines.
    .chma("0,50,50") // Margins.
    .chxt("x,y"); // Axes to show.
  return chart;
}
