import * as React from "react";
import { connect } from "react-redux";
import { RHESSysDataFilter, RHESSysGranularity } from "../database/abstract";
import { ErrorBoundary } from "../error_boundary";
import { createEnumSelect } from "../widgets/select";
import { DashboardAction, DashboardActionType } from "./actions";
import { FactorControls } from "./factor_controls";
import { DashboardState } from "./state";
import { AddVisualization, Visualization } from "./visualization";

const GranularitySelect = createEnumSelect<RHESSysGranularity>(
  ["year", "month", "week", "day"],
  ["Year", "Month", "Week", "Day"]
);

export interface DashboardViewProps extends DashboardState {
  dispatch: (action: DashboardAction) => void;
}

export interface DashboardViewState {
  visualizationWidth: number;
}

export class DashboardView extends React.Component<
  DashboardViewProps,
  DashboardViewState
> {
  public container: HTMLDivElement;
  public state: DashboardViewState = {
    visualizationWidth: 900
  };

  public componentDidMount() {
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  public handleResize = () => {
    this.setState({
      visualizationWidth: this.container.getBoundingClientRect().width - 5
    });
  };

  public render() {
    return (
      <div className="app-container">
        <div className="app-header">
          <FactorControls />
        </div>
        <div className="app-main">
          <div className="dashboard" ref={e => (this.container = e)}>
            <div className="dashboard-section-header">
              <span className="el-caption">Overview</span>
              <label
                className="bp3-label bp3-inline"
                style={{ display: "inline" }}
              >
                Granularity:
                <GranularitySelect
                  value={this.props.overviewGranularity}
                  onChange={value => {
                    this.props.dispatch({
                      type: DashboardActionType.SetOverviewGranularity,
                      granularity: value
                    });
                  }}
                />
              </label>
            </div>
            {this.props.overviewViews.map((visualization, index) => (
              <ErrorBoundary
                key={visualization.id}
                className="dashboard-visualization-error"
              >
                <Visualization
                  key={visualization.id}
                  role="overview"
                  visualization={visualization}
                  width={this.state.visualizationWidth}
                />
              </ErrorBoundary>
            ))}
            <AddVisualization role="overview" />
            <div className="dashboard-section-header">
              <span className="el-caption">Detail</span>
              <label
                className="bp3-label bp3-inline"
                style={{ display: "inline" }}
              >
                Granularity:
                <GranularitySelect
                  value={this.props.detailGranularity}
                  onChange={value => {
                    this.props.dispatch({
                      type: DashboardActionType.SetDetailGranularity,
                      granularity: value
                    });
                  }}
                />
              </label>
            </div>
            {this.props.detailViews.map((visualization, index) => (
              <ErrorBoundary
                key={visualization.id}
                className="dashboard-visualization-error"
              >
                <Visualization
                  key={visualization.id}
                  role="detail"
                  visualization={visualization}
                  width={this.state.visualizationWidth}
                />
              </ErrorBoundary>
            ))}
            <AddVisualization role="detail" />
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: DashboardState) => {
  return {
    ...state
  };
};

const mapDispatchToProps = (dispatch: (action: DashboardAction) => void) => {
  return {
    dispatch
  };
};

export const VisibleDashboard = connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardView);
