import {
  RHESSysDatabase,
  RHESSysDataFilter,
  RHESSysGranularity,
  RHESSysVariable
} from "../database/abstract";
import { parseTime } from "../utils";
import { ScaleNumerical, autoScale } from "../visualizations/scale";

export interface FactorDescription {
  name: string;
  levels: string[];
  kind: "nominal" | "ordinal";
}
export interface PaletteDescription {
  kind: "nominal" | "ordinal";
  colors: string[];
}
export interface DashboardConfig {
  factors: FactorDescription[];
  palettes: PaletteDescription[];
}

export interface VisualizationDescription {
  id: string;
  type: "timeseries" | "scatterplot";
  xVariable?: string;
  yVariable?: string;
  xScale?: ScaleNumerical;
  yScale?: ScaleNumerical;
  showPoints?: boolean;
  showLines?: boolean;
  opacity: number;
  lineWidth: number;
  pointSize: number;
  height: number;
}

export interface DashboardState {
  db: RHESSysDatabase;
  table: string;

  /** A list of variables and descriptions */
  variableList: RHESSysVariable[];

  /** The overall time range */
  timeStart: number;
  timeEnd: number;

  /** The detail view's time range */
  detailTimeStart: number;
  detailTimeEnd: number;

  /** Overview visualizations */
  overviewViews: VisualizationDescription[];
  /** The granularity for the overview timelines */
  overviewGranularity: RHESSysGranularity;

  /** Detail visualizations */
  detailViews: VisualizationDescription[];
  /** The granularity for the details timelines */
  detailGranularity: RHESSysGranularity;

  aggregation: RHESSysGranularity;

  /** The time cursor */
  currentTime: number;

  /** Groups for coloring */
  groupsBy: string[];
  groups: Array<{
    values: string[];
    color: string;
  }>;

  /** Facet */
  facetBy?: string;
  facetLevels?: string[];

  /** Global filter */
  filter: { [name: string]: string[] };

  /** The config data */
  config: DashboardConfig;
}

export function uniqueID() {
  return (
    "ID" +
    Math.random()
      .toString(36)
      .substr(2, 9)
  );
}

export function getFactor(config: DashboardConfig, name: string) {
  for (const f of config.factors) {
    if (f.name == name) {
      return f;
    }
  }
  return null;
}

export function getFactorColors(
  palettes: PaletteDescription[],
  factor: FactorDescription
) {
  for (const c of palettes) {
    if (c.kind == factor.kind) {
      if (factor.levels.length <= c.colors.length) {
        return c.colors;
      }
    }
  }
  return factor.levels.map(x => "#000000");
}

export function groupsFromFactor(
  palettes: PaletteDescription[],
  factor: FactorDescription
) {
  const colors = getFactorColors(palettes, factor);
  return {
    groupsBy: [factor.name],
    groups: factor.levels.map((x, index) => ({
      values: [x],
      color: colors[index]
    }))
  };
}

export function getDBFilter(state: DashboardState) {
  const dbFilter: RHESSysDataFilter = { attributes: {} };
  for (const factor of state.config.factors) {
    if (state.filter[factor.name].length != factor.levels.length) {
      dbFilter.attributes[factor.name] = { in: state.filter[factor.name] };
    }
  }
  return dbFilter;
}

export function createDefaultFilter(factors: FactorDescription[]) {
  const filter: { [name: string]: string[] } = {};
  for (const factor of factors) {
    filter[factor.name] = factor.levels.slice();
  }
  return filter;
}

export async function createDefaultTimeseries(
  db: RHESSysDatabase,
  table: string,
  variable: string
): Promise<VisualizationDescription> {
  return {
    id: uniqueID(),
    type: "timeseries",
    yVariable: variable,
    yScale: autoScale(await db.queryValueStats(table, variable)),
    height: 200,
    opacity: 0.6,
    lineWidth: 1,
    pointSize: 1
  };
}

export async function createDefaultScatterplot(
  db: RHESSysDatabase,
  table: string,
  xVariable: string,
  yVariable: string
): Promise<VisualizationDescription> {
  return {
    id: uniqueID(),
    type: "scatterplot",
    xVariable,
    yVariable,
    xScale: autoScale(await db.queryValueStats(table, xVariable)),
    yScale: autoScale(await db.queryValueStats(table, yVariable)),
    height: 300,
    opacity: 0.6,
    lineWidth: 1,
    pointSize: 2,
    showLines: false,
    showPoints: true
  };
}

export async function createDefaultDashboardState(
  db: RHESSysDatabase,
  table: string,
  config: DashboardConfig
): Promise<DashboardState> {
  return {
    db,
    table,
    variableList: await db.listVariables(table),
    timeStart: parseTime("1970-01-01"),
    timeEnd: parseTime("2020-01-01"),
    overviewViews: [await createDefaultTimeseries(db, table, "gpsn")],
    overviewGranularity: "month",
    detailViews: [await createDefaultTimeseries(db, table, "gpsn")],
    detailGranularity: "day",
    detailTimeStart: parseTime("2000-01-01"),
    detailTimeEnd: parseTime("2005-01-01"),
    aggregation: "month",
    currentTime: null,
    ...groupsFromFactor(config.palettes, config.factors[0]),
    facetBy: null,
    facetLevels: null,
    filter: createDefaultFilter(config.factors),
    config
  };
}
