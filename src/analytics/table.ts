import CliTable from "cli-table";

type CrossTableRow = Record<string, string[]>;
export interface CrossTableData {
  head: ["", ...string[]];
  rows: CrossTableRow[];
}

type VerticalTableRow = Record<string, string>;
export interface VerticalTableData {
  rows: VerticalTableRow[];
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

export class Table<
  T extends CrossTableRow | HorizontalTableRow | VerticalTableRow,
> {
  #cliTable: CliTable<T>;

  private constructor(table: CliTable<T>) {
    this.#cliTable = table;
  }

  /**
   * A cross table is a table that has both column and row headers,
   * allowing for the intersection of data to be displayed.
   */
  public static createCrossTable(
    tableData: CrossTableData,
  ): Table<CrossTableRow> {
    const cliTable = new CliTable<CrossTableRow>({
      head: tableData.head,
      colAligns: tableData.head.map(() => "right" as const),
      ...resetTableDecorations,
    });
    cliTable.push(...tableData.rows);

    return new Table(cliTable);
  }

  public static createVerticalTable(
    tableData: VerticalTableData,
  ): Table<VerticalTableRow> {
    const cliTable = new CliTable<VerticalTableRow>({
      colAligns: tableData.rows.map(() => "right" as const),
      ...resetTableDecorations,
    });
    cliTable.push(...tableData.rows);

    return new Table(cliTable);
  }

  public static createHorizontalTable(
    tableData: HorizontalTableData,
  ): Table<HorizontalTableRow> {
    if ("rowsWithHeader" in tableData) {
      const cliTable = new CliTable<HorizontalTableRow>({
        rows: tableData.rowsWithHeader,
        colAligns: tableData.rowsWithHeader.map(() => "right" as const),
        ...resetTableDecorations,
      });

      return new Table(cliTable);
    }

    const cliTable = new CliTable<HorizontalTableRow>({
      head: tableData.head,
      colAligns: tableData.head.map(() => "right" as const),
      ...resetTableDecorations,
    });
    cliTable.push(...tableData.rows);

    return new Table(cliTable);
  }

  public toMarkdown(): string {
    const markdownCodeBlock = "```";
    return [
      markdownCodeBlock,
      this.#cliTable.toString(),
      markdownCodeBlock,
    ].join("\n");
  }
}

/**
 * Options to remove all decorations and colors from the table.
 * This makes the table easier to print to Discord by simplifying its appearance.
 */
const resetTableDecorations: Pick<
  ConstructorParameters<typeof CliTable>[0],
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
