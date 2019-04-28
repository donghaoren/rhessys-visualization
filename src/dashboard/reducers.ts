import { DashboardAction, DashboardActionType } from "./actions";
import { DashboardState, getFactor, groupsFromFactor } from "./state";

export function arraySetAt<T>(array: T[], index: number, value: T) {
  array = Array.from(array);
  array[index] = value;
  return array;
}

export function arrayRemoveAt<T>(array: T[], index: number) {
  array = Array.from(array);
  array.splice(index, 1);
  return array;
}

export function arrayMoveUp<T>(array: T[], i: number) {
  array = Array.from(array);
  if (i >= 1 && i < array.length) {
    const tmp = array[i];
    array[i] = array[i - 1];
    array[i - 1] = tmp;
  }
  return array;
}

export function arrayMoveDown<T>(array: T[], i: number) {
  array = Array.from(array);
  if (i < array.length - 1 && i >= 0) {
    const tmp = array[i];
    array[i] = array[i + 1];
    array[i + 1] = tmp;
  }
  return array;
}

export function arrayAppend<T>(array: T[], value: T) {
  array = Array.from(array);
  array.push(value);
  return array;
}

export function applyUpdates<T>(obj: T, updates: Partial<T>) {
  return { ...obj, ...updates };
}

export function reducer(
  state: DashboardState = {} as any,
  action: DashboardAction
) {
  const newState = { ...state };
  switch (action.type) {
    case DashboardActionType.SetOverviewGranularity:
      {
        newState.overviewGranularity = action.granularity;
      }
      break;
    case DashboardActionType.SetDetailTimeRange:
      {
        newState.detailTimeStart = action.range[0];
        newState.detailTimeEnd = action.range[1];
      }
      break;
    case DashboardActionType.SetDetailGranularity:
      {
        newState.detailGranularity = action.granularity;
      }
      break;
    case DashboardActionType.SetCurrentTime:
      {
        newState.currentTime = action.time;
      }
      break;
    case DashboardActionType.SetGroupByWithFactor:
      {
        const factor = getFactor(state.config, action.factor);
        if (factor) {
          const g = groupsFromFactor(state.config.palettes, factor);
          newState.groupsBy = g.groupsBy;
          newState.groups = g.groups;
        } else {
          newState.groupsBy = [];
          newState.groups = [{ values: [], color: "#000000" }];
        }
      }
      break;
    case DashboardActionType.SetFacetWithFactor:
      {
        const factor = getFactor(state.config, action.factor);
        if (factor) {
          newState.facetBy = factor.name;
          newState.facetLevels = factor.levels;
        } else {
          newState.facetBy = null;
          newState.facetLevels = null;
        }
      }
      break;
    case DashboardActionType.SetAggregation:
      {
        newState.aggregation = action.aggregation;
      }
      break;
    case DashboardActionType.SetFilterValue:
      {
        newState.filter = JSON.parse(JSON.stringify(newState.filter));
        if (action.enabled) {
          if (newState.filter[action.factor].indexOf(action.level) < 0) {
            newState.filter[action.factor].push(action.level);
          }
        } else {
          const idx = newState.filter[action.factor].indexOf(action.level);
          if (idx >= 0) {
            newState.filter[action.factor].splice(idx, 1);
          }
        }
      }
      break;
    case DashboardActionType.AddVisualization:
      {
        if (action.role == "overview") {
          newState.overviewViews = arrayAppend(
            newState.overviewViews,
            action.visualization
          );
        }
        if (action.role == "detail") {
          newState.detailViews = arrayAppend(
            newState.detailViews,
            action.visualization
          );
        }
      }
      break;
    case DashboardActionType.MoveVisualizationUp:
      {
        for (let i = 0; i < newState.overviewViews.length; i++) {
          if (newState.overviewViews[i].id == action.visualizationID) {
            newState.overviewViews = arrayMoveUp(newState.overviewViews, i);
            break;
          }
        }
        for (let i = 0; i < newState.detailViews.length; i++) {
          if (newState.detailViews[i].id == action.visualizationID) {
            newState.detailViews = arrayMoveUp(newState.detailViews, i);
            break;
          }
        }
      }
      break;
    case DashboardActionType.MoveVisualizationDown:
      {
        for (let i = 0; i < newState.overviewViews.length; i++) {
          if (newState.overviewViews[i].id == action.visualizationID) {
            newState.overviewViews = arrayMoveDown(newState.overviewViews, i);
            break;
          }
        }
        for (let i = 0; i < newState.detailViews.length; i++) {
          if (newState.detailViews[i].id == action.visualizationID) {
            newState.detailViews = arrayMoveDown(newState.detailViews, i);
            break;
          }
        }
      }
      break;
    case DashboardActionType.RemoveVisualization:
      {
        for (let i = 0; i < newState.overviewViews.length; i++) {
          if (newState.overviewViews[i].id == action.visualizationID) {
            newState.overviewViews = arrayRemoveAt(newState.overviewViews, i);
            break;
          }
        }
        for (let i = 0; i < newState.detailViews.length; i++) {
          if (newState.detailViews[i].id == action.visualizationID) {
            newState.detailViews = arrayRemoveAt(newState.detailViews, i);
            break;
          }
        }
      }
      break;
    case DashboardActionType.UpdateVisualization:
      {
        for (let i = 0; i < newState.overviewViews.length; i++) {
          if (newState.overviewViews[i].id == action.visualizationID) {
            newState.overviewViews = arraySetAt(
              newState.overviewViews,
              i,
              applyUpdates(
                newState.overviewViews[i],
                action.visualizationUpdates
              )
            );
            break;
          }
        }
        for (let i = 0; i < newState.detailViews.length; i++) {
          if (newState.detailViews[i].id == action.visualizationID) {
            newState.detailViews = arraySetAt(
              newState.detailViews,
              i,
              applyUpdates(newState.detailViews[i], action.visualizationUpdates)
            );
            break;
          }
        }
      }
      break;
  }
  return newState;
}
