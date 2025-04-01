import ImageCharts from "image-charts";

export interface TextReport {
  text: string[];
}

export interface CsvReport {
  csv: (number | string)[][];
}

export interface ChartReport {
  chart: ImageCharts;
}

export type CohortRetentionReport = TextReport;
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
