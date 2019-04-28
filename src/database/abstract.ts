export type RHESSysGranularity = "year" | "month" | "week" | "day";

export interface RHESSysDataFilter {
  /** Start time in yyyy-mm-dd (inclusive) */
  timeStart?: number;
  /** End time in yyyy-mm-dd (inclusive) */
  timeEnd?: number;

  attributes?: {
    [variable: string]: {
      /** value in `in` */
      in?: any[];
      /** value >= `min` and value <= `max` */
      within?: { min?: number; max?: number };
    };
  };
}

export interface RHESSysDataGroups {
  /** Group by these variables */
  variables: string[];
  /** For each group, give the values of the variables respectively */
  groups: string[][];
}

export interface RHESSysVariable {
  name: string;
  type: "number" | "string";
  description: string;
  unit: string;
}

export interface RHESSysStats {
  count: number;
  mean: number;
  stdev: number;
  min: number;
  max: number;
}

export interface RHESSysDatabase {
  /** Query data from the database */
  queryVariables(
    table: string,
    granularity: RHESSysGranularity,
    variables: string[],
    groups?: RHESSysDataGroups,
    filter?: RHESSysDataFilter
  ): Promise<
    Array<
      Array<{
        /** The unix timestamp of the data item */
        t: number;
        [name: string]: any;
      }>
    >
  >;

  queryAggregatedVariables(
    table: string,
    variables: string[],
    aggregation: RHESSysGranularity,
    groups?: RHESSysDataGroups,
    filter?: RHESSysDataFilter
  ): Promise<
    Array<
      Array<{
        t: number;
        variables: {
          [name: string]: RHESSysStats;
        };
      }>
    >
  >;

  /** Query distinct values of a string variable */
  queryDistinctValues(table: string, variable: string): Promise<string[]>;

  /** Query the statistics of a numerical variable */
  queryValueStats(
    table: string,
    variable: string,
    granularity?: RHESSysGranularity
  ): Promise<RHESSysStats>;

  /** Query tables */
  listTables(): Promise<string[]>;

  /** List variables from a table */
  listVariables(name: string): Promise<RHESSysVariable[]>;
}
