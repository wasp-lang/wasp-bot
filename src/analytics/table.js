import * as Table from "cli-table";

export function newSimpleTable({ head, rows }) {
  const table = new Table({
    head,
    colAligns: ["right", ...head.map(() => "right")],

    // Options below remove all the decorations and colors from the table,
    // which makes it easier for us to print it to Discord later.
    // If you want some nicer visuals, comment out options below (.chars and .style).
    chars: {
      top: "",
      "top-mid": "",
      "top-left": "",
      "top-right": "",
      bottom: "",
      "bottom-mid": "",
      "bottom-left": "",
      "bottom-right": "",
      left: "",
      "left-mid": "",
      mid: "",
      "mid-mid": "",
      right: "",
      "right-mid": "",
      middle: " ",
    },
    colors: false,
    style: { head: [], border: [] },
  });
  table.push(...rows);
  return table;
}
