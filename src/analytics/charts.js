const ImageCharts = require("image-charts");

// Expects data to be:
//   data = { series: { name: [number] }, periodEnds: [string] }
// Returns a string, URL leading to image-charts.com that contains query with exact
// instructions how to display this chart via image.
function buildChartImageUrl(data, title, type = "line") {
    const chart = ImageCharts()
        .cht(type === "line" ? "ls" : "bvs") // Type: lines or vertical bars? Could also be other things.
        .chtt(title) // Title.
        .chd(
            "a:" +
                Object.values(data.series)
                    .map((s) => s.join(","))
                    .join("|")
        ) // Data series.
        .chl(
            Object.values(data.series)
                .map((s) => s.map((v) => v || undefined).join("|"))
                .join("|")
        ) // Value labels on bars.
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

module.exports = {
    buildChartImageUrl
};
