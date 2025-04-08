import Table from "cli-table";

type CrossTableRow = Record<string, string[]>;
export interface CrossTableData {
  head: ["", ...string[]];
  rows: CrossTableRow[];
}

export function createCrossTable(
  tableData: CrossTableData,
): Table<CrossTableRow> {
  const table = new Table<CrossTableRow>({
    head: tableData.head,
    colAligns: [...tableData.head.map(() => "right" as const)], // TODO: see if extra "right" is needed
    ...resetTableDecorations, // comment out to return default visuals
  });
  table.push(...tableData.rows);

  return table;
}

type VerticalTableRow = Record<string, string>;
export interface VerticalTableData {
  rows: VerticalTableRow[];
}

export function createVerticalTable({
  rows,
}: VerticalTableData): Table<VerticalTableRow> {
  const table = new Table<VerticalTableRow>({
    colAligns: [...rows.map(() => "right" as const)],
    ...resetTableDecorations, // comment out to return default visuals
  });
  table.push(...rows);

  return table;
}

type HorizontalTableRow = string[];
export type HorizontalTableData =
  | {
      head: string[];
      rows: HorizontalTableRow[];
    }
  | {
      rowsWithHeader: HorizontalTableRow[];
    };

export function createHorizontalTable(
  tableData: HorizontalTableData,
): Table<HorizontalTableRow> {
  if ("rowsWithHeader" in tableData) {
    return new Table<HorizontalTableRow>({
      rows: tableData.rowsWithHeader,
      colAligns: [...tableData.rowsWithHeader.map(() => "right" as const)],
      ...resetTableDecorations, // comment out to return default visuals
    });
  }

  const table = new Table<HorizontalTableRow>({
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
};
