import Table from "cli-table";

export interface CrossTableData {
  head: ["", ...string[]];
  rows: Record<string, string[]>[];
}

export function createCrossTable(tableData: CrossTableData) {
  const table = new Table({
    head: tableData.head,
    colAligns: [...tableData.head.map(() => "right" as const)], // TODO: see if extra "right" is needed
    ...resetTableDecorations, // comment out to return default visuals
  });
  table.push(...tableData.rows);

  return table;
}

export interface VerticalTableData {
  rows: Record<string, string>[];
}

export function createVerticalTable({ rows }: VerticalTableData) {
  const table = new Table({
    colAligns: [...rows.map(() => "right" as const)],
    ...resetTableDecorations, // comment out to return default visuals
  });
  table.push(...rows);

  return table;
}

export type HorizontalTableData =
  | {
      head: string[];
      rows: string[][];
    }
  | {
      rowsWithHeader: string[][];
    };

export function createHorizontalTable(tableData: HorizontalTableData) {
  if ("rowsWithHeader" in tableData) {
    return new Table({
      rows: tableData.rowsWithHeader,
      colAligns: [...tableData.rowsWithHeader.map(() => "right" as const)],
      ...resetTableDecorations, // comment out to return default visuals
    });
  }

  const table = new Table({
    head: tableData.head,
    colAligns: [...tableData.head.map(() => "right" as const)],
    ...resetTableDecorations, // comment out to return default visuals
  });
  table.push(...tableData.rows);

  return table;
}

/**
 * Options to remove all decorations and colors from the table.
 * This makes the table easier to print to Discord by simplifying its appearance.
 */
const resetTableDecorations: Pick<
  ConstructorParameters<typeof Table>[0],
  "chars" | "colors" | "style"
> = {
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
} as const;
