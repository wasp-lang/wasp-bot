import ImageCharts from "image-charts";
import { interpolateColors } from "./reports/colors";
import { ChartData } from "./types";

export function buildUserActivityChartImageUrl(data: ChartData, title: string) {
  const chart = buildChartBase(data, title).cht("bvs");
  return chart.toURL();
}

export function buildCohortRetentionChartImageUrl(
  data: ChartData,
  title: string,
) {
  const chart = buildChartBase(data, title)
    .cht("bvs") // Type: lines or vertical bars? Could also be other things.
    .chco(
      interpolateColors(
        ["#d6315a", "#d18f32", "#3dbf60"],
        data.periodEnds.length,
      )
        .map((hex) => hex.slice(1))
        .join(","),
    );
  return chart.toURL();
}

export function buildChartBase(data: ChartData, title: string) {
  return new ImageCharts()
    .chtt(title)
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
}
