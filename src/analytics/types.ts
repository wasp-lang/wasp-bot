import { Moment } from "moment";

export type PosthogEvent = {
  distinct_id: string;
  timestamp: Date;
  event?: string;
  properties?: {
    os?: string;
    is_build?: boolean;
    wasp_version?: string;
    project_hash?: string;
    deploy_cmd_args?: string;
    context?: string;
    $ip?: string;
  };
};

export type ExecutionPosthogEvent = PosthogEvent & {
  _executionEnv: string | null;
};

export type Period = [Moment, Moment];

export type PeriodName = "day" | "week" | "month";

export type WaspReport = {
  text: string[];
  chart?: string;
  csv?: (string | number)[][];
};

export type ChartData = {
  series: Record<string, number[]>;
  periodEnds: string[];
};
