import ImageCharts from "image-charts";

export interface TextReport {
  text: readonly string[];
}

type CsvReportRow = readonly (number | string | null)[];
export interface CsvReport {
  csv: readonly CsvReportRow[];
}

export interface ChartReport {
  chart: ImageCharts;
}

export interface LocalChartReport {
  localChart: Buffer;
}

export type CohortRetentionReport = TextReport & LocalChartReport;
export type ProjectsReport = TextReport & CsvReport;
export type UserActivityReport = TextReport & CsvReport & ChartReport;
export type TotalUniqueReport = TextReport;

export type AllTimePeriodReport = {
  userActivityReport: UserActivityReport;
  projectsReport: ProjectsReport;
};

export type PeriodReport = {
  userActivityReport: UserActivityReport;
  projectsReport: ProjectsReport;
  cohortRetentionReport: CohortRetentionReport;
};

export type TotalReport = { totalUniqueReport: TotalUniqueReport };
