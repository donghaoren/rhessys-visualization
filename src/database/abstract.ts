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

export interface RHESSysVariable {
  name: string;
  type: "number" | "string";
  description: string;
  unit: string;
}

export interface RHESSysDatabase {
  /**
   * Query the timeseries for a set of variables
   * @param variables - A list of variables to query, optionally with /aggregation_function
   */
  queryTimeSeries(
    table: string,
    granularity: RHESSysGranularity,
    variables: string[],
    filter?: RHESSysDataFilter
  ): Promise<
    Array<{
      /** The unix timestamp of the data item */
      ts: number;
      [name: string]: any;
    }>
  >;

  queryScatterplot(
    table: string,
    granularity: RHESSysGranularity,
    variable1: string,
    variable2: string,
    filter?: RHESSysDataFilter
  ): Promise<
    Array<{
      ts: number;
      x: number;
      y: number;
    }>
  >;

  /** Query distinct values of a string variable */
  queryDistinctValues(table: string, variable: string): Promise<string[]>;

  /** Query the statistics of a numerical variable */
  queryValueStats(
    table: string,
    variable: string,
    granularity?: RHESSysGranularity
  ): Promise<{ min: number; max: number; stdev: number; mean: number }>;

  /** Query tables */
  listTables(): Promise<string[]>;

  /** List variables from a table */
  listVariables(name: string): Promise<RHESSysVariable[]>;
}
