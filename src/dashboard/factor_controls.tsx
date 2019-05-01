import {
  Button,
  HTMLSelect,
  Popover,
  PopoverInteractionKind,
  Position,
  Switch
} from "@blueprintjs/core";
import * as React from "react";
import { connect } from "react-redux";
import { RHESSysGranularity } from "../database/abstract";
import { createEnumSelect } from "../widgets/select";
import { DashboardAction, DashboardActionType } from "./actions";
import { DashboardConfig, DashboardState } from "./state";

const AggregationSelect = createEnumSelect<RHESSysGranularity>(
  ["month", "week", "day"],
  ["Month", "Week", "Day"]
);

export interface FactorControlsViewProps {
  aggregation: RHESSysGranularity;
  groups: DashboardState["groups"];
  groupsBy: DashboardState["groupsBy"];
  facetBy: DashboardState["facetBy"];
  facetLevels: DashboardState["facetLevels"];
  filter: DashboardState["filter"];
  config: DashboardConfig;
  dispatch?: (action: DashboardAction) => void;
}

export class FactorControlsView extends React.Component<
  FactorControlsViewProps,
  {}
> {
  public render() {
    return (
      <span className="factor-controls">
        <span className="group-editor">
          <span className="el-label">Color by</span>
          <HTMLSelect
            value={this.props.groupsBy ? this.props.groupsBy[0] : "none"}
            onChange={e => {
              const factorName = e.target.value;
              this.props.dispatch({
                type: DashboardActionType.SetGroupByWithFactor,
                factor: factorName
              });
            }}
          >
            <option value={"none"}>None</option>
            {this.props.config.factors.map(factor => (
              <option key={factor.name} value={factor.name}>
                {factor.name}
              </option>
            ))}
          </HTMLSelect>
          {this.props.groups.map((g, index) => (
            <span className="group-editor-group" key={index}>
              <span className="el-color" style={{ backgroundColor: g.color }} />
              <span className="el-filter">
                {this.props.groupsBy.length > 0
                  ? `${this.props.groupsBy.join(",")} = ${g.values.join(",")}`
                  : ""}
              </span>
            </span>
          ))}
        </span>
        <span className="el-sep" />
        <span className="el-label">Facet by</span>
        <HTMLSelect
          value={this.props.facetBy ? this.props.facetBy : "none"}
          onChange={e => {
            const factorName = e.target.value;
            this.props.dispatch({
              type: DashboardActionType.SetFacetWithFactor,
              factor: factorName
            });
          }}
        >
          <option value={"none"}>None</option>
          {this.props.config.factors.map(factor => (
            <option key={factor.name} value={factor.name}>
              {factor.name}
            </option>
          ))}
        </HTMLSelect>
        <span className="el-sep" />
        <Popover
          interactionKind={PopoverInteractionKind.CLICK}
          popoverClassName="bp3-popover-content-sizing"
          position={Position.BOTTOM}
        >
          <Button>Edit Filter...</Button>
          <div className="filter-editor">
            {this.props.config.factors.map(factor => (
              <div key={factor.name}>
                <h4>{factor.name}</h4>
                {factor.levels.map(level => (
                  <Switch
                    key={level}
                    checked={this.props.filter[factor.name].indexOf(level) >= 0}
                    label={level}
                    onChange={e => {
                      const checked = (e.target as any).checked;
                      this.props.dispatch({
                        type: DashboardActionType.SetFilterValue,
                        factor: factor.name,
                        level,
                        enabled: checked
                      });
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </Popover>
        <span className="el-sep" />
        <span className="el-label">Aggregate by</span>
        <AggregationSelect
          value={this.props.aggregation}
          onChange={value => {
            this.props.dispatch({
              type: DashboardActionType.SetAggregation,
              aggregation: value
            });
          }}
        />
      </span>
    );
  }
}

const mapStateToProps = (state: DashboardState): FactorControlsViewProps => {
  return {
    aggregation: state.aggregation,
    groups: state.groups,
    groupsBy: state.groupsBy,
    facetBy: state.facetBy,
    facetLevels: state.facetLevels,
    filter: state.filter,
    config: state.config
  };
};

const mapDispatchToProps = (dispatch: (action: DashboardAction) => void) => {
  return {
    dispatch
  };
};

export const FactorControls = connect(
  mapStateToProps,
  mapDispatchToProps
)(FactorControlsView);
