import { RHESSysGranularity } from "../database/abstract";
import { VisualizationDescription } from "./state";

export enum DashboardActionType {
  SetOverviewGranularity = "SetOverviewGranularity",

  SetDetailTimeRange = "SetDetailTimeRange",
  SetDetailGranularity = "SetDetailGranularity",

  SetCurrentTime = "SetCurrentTime",

  SetAggregation = "SetAggregation",

  SetGroupByWithFactor = "SetGroupByWithFactor",
  SetFacetWithFactor = "SetFacetWithFactor",

  SetFilterValue = "SetFilterValue",

  RemoveVisualization = "RemoveVisualization",
  AddVisualization = "AddVisualization",
  UpdateVisualization = "UpdateVisualization",
  MoveVisualizationUp = "MoveVisualizationUp",
  MoveVisualizationDown = "MoveVisualizationDown",
  MoveVisualizationToOverview = "MoveVisualizationToOverview",
  MoveVisualizationToDetail = "MoveVisualizationToDetail"
}

export interface DashboardAction {
  type: string;

  granularity?: RHESSysGranularity;
  aggregation?: RHESSysGranularity;
  range?: [number, number];
  time?: number;
  index?: number;
  variable?: string;
  xVariable?: string;
  yVariable?: string;
  factor?: string;
  level?: string;
  enabled?: boolean;
  visualizationID?: string;
  visualization?: VisualizationDescription;
  visualizationUpdates?: Partial<VisualizationDescription>;
  role?: string;
}
