import {
  Button,
  Switch,
  Popover,
  PopoverInteractionKind,
  Position,
  Slider
} from "@blueprintjs/core";
import * as React from "react";
import * as d3 from "d3";
import { connect } from "react-redux";
import { RHESSysDataFilter } from "../database/abstract";
import { AggregatedTimeseries } from "../visualizations/aggregated_timeseries";
import { autoScale, autoScaleConservative } from "../visualizations/scale";
import { Scatterplot } from "../visualizations/scatterplot";
import { TimeseriesPlot } from "../visualizations/timeseries";
import { VariableSelect } from "../widgets/variable_select";
import { DashboardAction, DashboardActionType } from "./actions";
import {
  DashboardState,
  getDBFilter,
  VisualizationDescription,
  uniqueID,
  createDefaultScatterplot,
  createDefaultTimeseries
} from "./state";
import { createEnumSelect } from "../widgets/select";
import { ScaleEditor } from "./scale_editor";

function getFacetFilter(variable: string, level: string) {
  const a: any = {};
  a[variable] = { in: [level] };
  return { attributes: a };
}

function isInFilter(factor: string, level: string, filter: RHESSysDataFilter) {
  if (
    filter &&
    filter.attributes &&
    filter.attributes[factor] &&
    filter.attributes[factor].in &&
    filter.attributes[factor].in.indexOf(level) < 0
  ) {
    return false;
  } else {
    return true;
  }
}

function mergeFilter(...filters: RHESSysDataFilter[]) {
  const result: RHESSysDataFilter = { attributes: {} };
  const tStarts = [];
  const tEnds = [];
  for (const filter of filters) {
    if (filter.timeStart != null) {
      tStarts.push(filter.timeStart);
    }
    if (filter.timeEnd != null) {
      tEnds.push(filter.timeEnd);
    }
    if (filter.attributes) {
      for (const attr of Object.keys(filter.attributes)) {
        if (result.attributes[attr]) {
          result.attributes[attr].in = result.attributes[attr].in.filter(
            x => filter.attributes[attr].in.indexOf(x) >= 0
          );
        } else {
          result.attributes[attr] = { in: filter.attributes[attr].in.slice() };
        }
      }
    }
  }
  if (tStarts.length > 0) {
    result.timeStart = Math.max(...tStarts);
  }
  if (tEnds.length > 0) {
    result.timeEnd = Math.max(...tEnds);
  }
  return result;
}

export interface VisualizationViewProps extends DashboardState {
  role: "overview" | "detail";
  visualization: VisualizationDescription;
  width: number;
  dispatch?: (action: DashboardAction) => void;
}

const aggregateWidth = 300;
const margin1 = 10;
const marginN = 80;

export class VisualizationView extends React.Component<
  VisualizationViewProps,
  {}
> {
  public plotRefs = new Map<string, TimeseriesPlot | Scatterplot>();
  public fplotRefs = (level: string, e: TimeseriesPlot | Scatterplot) => {
    if (e) {
      this.plotRefs.set(level, e);
    } else {
      this.plotRefs.delete(level);
    }
  };

  public renderToolbar() {
    const canUp =
      this.props.role == "overview"
        ? this.props.overviewViews.indexOf(this.props.visualization) != 0
        : this.props.detailViews.indexOf(this.props.visualization) != 0;
    const canDown =
      this.props.role == "overview"
        ? this.props.overviewViews.indexOf(this.props.visualization) !=
          this.props.overviewViews.length - 1
        : this.props.detailViews.indexOf(this.props.visualization) !=
          this.props.detailViews.length - 1;
    return (
      <div className="dashboard-visualization-header">
        <div className="el-row">
          <div className="el-right">
            <Button
              icon={
                this.props.role == "overview"
                  ? "circle-arrow-down"
                  : "circle-arrow-up"
              }
              text={
                this.props.role == "overview"
                  ? "Move to Detail"
                  : "Move to Overview"
              }
              onClick={() => {
                this.props.dispatch({
                  type:
                    this.props.role == "overview"
                      ? DashboardActionType.MoveVisualizationToDetail
                      : DashboardActionType.MoveVisualizationToOverview,
                  visualizationID: this.props.visualization.id
                });
              }}
            />{" "}
            <Button
              icon="arrow-up"
              onClick={() => {
                this.props.dispatch({
                  type: DashboardActionType.MoveVisualizationUp,
                  visualizationID: this.props.visualization.id
                });
              }}
              disabled={!canUp}
            />{" "}
            <Button
              icon="arrow-down"
              onClick={() => {
                this.props.dispatch({
                  type: DashboardActionType.MoveVisualizationDown,
                  visualizationID: this.props.visualization.id
                });
              }}
              disabled={!canDown}
            />{" "}
            <Button
              icon="trash"
              intent="danger"
              onClick={() => {
                this.props.dispatch({
                  type: DashboardActionType.RemoveVisualization,
                  visualizationID: this.props.visualization.id
                });
              }}
            />
          </div>
          <span className="el-small-controls">{this.renderControls()}</span>
        </div>
        <div className="el-row">{this.renderSmallControls()}</div>
      </div>
    );
  }

  public getCommonProps(facetLevel?: string) {
    const granularity =
      this.props.role == "overview"
        ? this.props.overviewGranularity
        : this.props.detailGranularity;
    const timeStart =
      this.props.role == "overview"
        ? this.props.timeStart
        : this.props.detailTimeStart;
    const timeEnd =
      this.props.role == "overview"
        ? this.props.timeEnd
        : this.props.detailTimeEnd;

    return {
      granularity,
      timeStart,
      timeEnd,
      db: this.props.db,
      table: this.props.table,
      groupsBy: this.props.groupsBy,
      filter:
        facetLevel != null
          ? mergeFilter(
              getFacetFilter(this.props.facetBy, facetLevel),
              getDBFilter(this.props)
            )
          : getDBFilter(this.props),
      title: facetLevel ? this.props.facetBy + " = " + facetLevel : undefined
    };
  }

  public renderVisualization(
    facetLevel?: string,
    index?: number,
    validFacetLevels?: string[]
  ) {
    const commonProps = this.getCommonProps(facetLevel);
    switch (this.props.visualization.type) {
      case "scatterplot": {
        return (
          <Scatterplot
            ref={this.fplotRefs.bind(this, facetLevel || "__all__")}
            key={facetLevel || "__all__"}
            {...commonProps}
            width={
              facetLevel != null
                ? Math.min(
                    Math.floor(this.props.width / validFacetLevels.length),
                    this.props.visualization.height
                  )
                : Math.min(this.props.width, this.props.visualization.height)
            }
            height={this.props.visualization.height}
            xScale={this.props.visualization.xScale}
            yScale={this.props.visualization.yScale}
            xVariable={this.props.visualization.xVariable}
            yVariable={this.props.visualization.yVariable}
            points={this.props.visualization.showPoints}
            lines={this.props.visualization.showLines}
            groups={this.props.groups.map(x => ({
              opacity: this.props.visualization.opacity,
              lineWidth: this.props.visualization.lineWidth,
              pointSize: this.props.visualization.pointSize,
              ...x
            }))}
          />
        );
      }
      case "timeseries": {
        return (
          <TimeseriesPlot
            key={facetLevel || "__all__"}
            ref={this.fplotRefs.bind(this, facetLevel || "__all__")}
            {...commonProps}
            {...(this.props.role == "overview"
              ? {
                  brushMin: this.props.detailTimeStart,
                  brushMax: this.props.detailTimeEnd,
                  brushEnabled: true,
                  onTimeCursor: t => {
                    this.props.dispatch({
                      type: DashboardActionType.SetCurrentTime,
                      time: t
                    });
                  },
                  onBrush: (min, max) => {
                    this.props.dispatch({
                      type: DashboardActionType.SetDetailTimeRange,
                      range: [min, max]
                    });
                  }
                }
              : {
                  onTimeCursor: t => {
                    this.props.dispatch({
                      type: DashboardActionType.SetCurrentTime,
                      time: t
                    });
                  },
                  panEnabled: true,
                  onPan: (min, max) => {
                    this.props.dispatch({
                      type: DashboardActionType.SetDetailTimeRange,
                      range: [min, max]
                    });
                  }
                })}
            width={
              facetLevel != null
                ? Math.floor(
                    (this.props.width - aggregateWidth - marginN - margin1) /
                      validFacetLevels.length +
                      (index > 0 ? 0 : marginN - margin1)
                  )
                : this.props.width - aggregateWidth
            }
            height={this.props.visualization.height}
            timeCursor={this.props.currentTime}
            hideYTicks={facetLevel != null && index > 0}
            marginLeft={facetLevel != null && index > 0 ? margin1 : marginN}
            scale={this.props.visualization.yScale}
            variable={this.props.visualization.yVariable}
            groups={this.props.groups.map(x => ({
              opacity: this.props.visualization.opacity,
              lineWidth: this.props.visualization.lineWidth,
              ...x
            }))}
          />
        );
      }
    }
  }

  public renderVisualizations() {
    const validFacetLevels = this.props.facetBy
      ? this.props.facetLevels.filter(level =>
          isInFilter(this.props.facetBy, level, getDBFilter(this.props))
        )
      : [];

    const items = this.props.facetBy
      ? validFacetLevels.map((level, index) =>
          this.renderVisualization(level, index, validFacetLevels)
        )
      : this.renderVisualization();

    switch (this.props.visualization.type) {
      case "scatterplot": {
        return items;
      }
      case "timeseries": {
        return (
          <div>
            {items}
            <AggregatedTimeseries
              {...this.getCommonProps()}
              width={aggregateWidth}
              timeCursor={this.props.currentTime}
              aggregation={this.props.aggregation}
              variable={this.props.visualization.yVariable}
              scale={this.props.visualization.yScale}
              height={this.props.visualization.height}
              title={"Aggregate by " + this.props.aggregation + " of year"}
              groups={this.props.groups.map(x => ({
                opacity: 0.6,
                lineWidth: 1,
                ...x
              }))}
            />
          </div>
        );
      }
    }
  }

  public handleAutoScale = () => {
    const xStats = [];
    const yStats = [];
    for (const plot of this.plotRefs.values()) {
      if (plot instanceof Scatterplot) {
        const [xStat, yStat] = plot.getCurrentViewStats();
        xStats.push(xStat);
        yStats.push(yStat);
      }
      if (plot instanceof TimeseriesPlot) {
        const yStat = plot.getCurrentViewStats();
        yStats.push(yStat);
      }
    }
    const mergeStats = (
      stats: Array<{
        min: number;
        max: number;
        stdev: number;
        mean: number;
      }>
    ) => {
      return {
        min: Math.min(...stats.map(x => x.min)),
        max: Math.max(...stats.map(x => x.max)),
        stdev: d3.mean(stats.map(x => x.stdev)),
        mean: d3.mean(stats.map(x => x.mean))
      };
    };
    const update: Partial<VisualizationDescription> = {};
    if (xStats.length > 0) {
      update.xScale = autoScaleConservative(mergeStats(xStats));
    }
    if (yStats.length > 0) {
      update.yScale = autoScaleConservative(mergeStats(yStats));
    }
    this.dispatchUpdate(update);
  };

  public renderSmallControls() {
    const vis = this.props.visualization;
    switch (vis.type) {
      case "timeseries": {
        return (
          <span className="el-small-controls">
            <Button text="Auto Scale" onClick={this.handleAutoScale} />
            <span className="el-sep" />
            <Popover
              interactionKind={PopoverInteractionKind.CLICK}
              popoverClassName="bp3-popover-content-sizing"
              position={Position.BOTTOM}
            >
              <Button>Edit Scale...</Button>
              <ScaleEditor
                defaultScale={vis.yScale}
                onChange={newScale => {
                  this.dispatchUpdate({
                    yScale: newScale
                  });
                }}
              />
            </Popover>
            <span className="el-sep" />
            <HeightButtons
              value={this.props.visualization.height}
              steps={[200, 500]}
              onChange={value => {
                this.dispatchUpdate({
                  height: value
                });
              }}
            />
            <span className="el-sep el-sep-visible" />
            <span className="el-label">Opacity:</span>
            <span className="el-slider">
              <Slider
                value={vis.opacity * 100}
                min={0}
                max={100}
                labelRenderer={false}
                onChange={value => {
                  this.dispatchUpdate({ opacity: value / 100 });
                }}
              />
            </span>
            <span className="el-sep" />
            <span className="el-label">Line Width:</span>
            <span className="el-slider">
              <Slider
                value={vis.lineWidth * 100}
                min={0}
                max={400}
                labelRenderer={false}
                onChange={value => {
                  this.dispatchUpdate({ lineWidth: value / 100 });
                }}
              />
            </span>
          </span>
        );
      }
      case "scatterplot": {
        return (
          <span className="el-small-controls">
            <Button text="Auto Scale" onClick={this.handleAutoScale} />
            <span className="el-sep" />
            <Popover
              interactionKind={PopoverInteractionKind.CLICK}
              popoverClassName="bp3-popover-content-sizing"
              position={Position.BOTTOM}
            >
              <Button>Edit X Scale...</Button>
              <ScaleEditor
                defaultScale={vis.xScale}
                onChange={newScale => {
                  this.dispatchUpdate({
                    xScale: newScale
                  });
                }}
              />
            </Popover>
            <span className="el-sep" />
            <Popover
              interactionKind={PopoverInteractionKind.CLICK}
              popoverClassName="bp3-popover-content-sizing"
              position={Position.BOTTOM}
            >
              <Button>Edit Y Scale...</Button>
              <ScaleEditor
                defaultScale={vis.yScale}
                onChange={newScale => {
                  this.dispatchUpdate({
                    yScale: newScale
                  });
                }}
              />
            </Popover>
            <span className="el-sep" />
            <Switch
              checked={vis.showLines}
              label="Lines"
              inline={true}
              onChange={e => {
                this.dispatchUpdate({ showLines: (e.target as any).checked });
              }}
            />{" "}
            <Switch
              checked={vis.showPoints}
              label="Points"
              inline={true}
              onChange={e => {
                this.dispatchUpdate({ showPoints: (e.target as any).checked });
              }}
            />
            <span className="el-sep" />
            <HeightButtons
              value={this.props.visualization.height}
              steps={[300, 500]}
              onChange={value => {
                this.dispatchUpdate({
                  height: value
                });
              }}
            />
            <span className="el-sep el-sep-visible" />
            <span className="el-label">Opacity:</span>
            <span className="el-slider">
              <Slider
                value={vis.opacity * 100}
                min={0}
                max={100}
                labelRenderer={false}
                onChange={value => {
                  this.dispatchUpdate({ opacity: value / 100 });
                }}
              />
            </span>
            {vis.showLines ? (
              <>
                <span className="el-sep" />
                <span className="el-label">Line Width:</span>
                <span className="el-slider">
                  <Slider
                    value={vis.lineWidth * 100}
                    min={0}
                    max={400}
                    labelRenderer={false}
                    onChange={value => {
                      this.dispatchUpdate({ lineWidth: value / 100 });
                    }}
                  />
                </span>
              </>
            ) : null}
            {vis.showPoints ? (
              <>
                <span className="el-sep" />
                <span className="el-label">Point Size:</span>
                <span className="el-slider">
                  <Slider
                    value={vis.pointSize * 100}
                    min={0}
                    max={1000}
                    labelRenderer={false}
                    onChange={value => {
                      this.dispatchUpdate({ pointSize: value / 100 });
                    }}
                  />
                </span>
              </>
            ) : null}
          </span>
        );
      }
    }
  }

  public renderControls() {
    const vis = this.props.visualization;
    switch (vis.type) {
      case "timeseries": {
        return (
          <>
            <VariableSelect
              list={this.props.variableList}
              value={vis.yVariable}
              onChange={value => {
                this.dispatchUpdate({
                  yVariable: value
                });
              }}
            />
          </>
        );
      }
      case "scatterplot": {
        return (
          <>
            <span className="el-label">X:</span>
            <VariableSelect
              list={this.props.variableList}
              value={vis.xVariable}
              onChange={value => {
                console.log("Variable selected");
                this.dispatchUpdate({
                  xVariable: value
                });
              }}
            />
            <span className="el-label">Y:</span>
            <VariableSelect
              list={this.props.variableList}
              value={vis.yVariable}
              onChange={value => {
                this.dispatchUpdate({
                  yVariable: value
                });
              }}
            />
          </>
        );
      }
    }
    return null;
  }

  public async dispatchUpdate(updates: Partial<VisualizationDescription>) {
    if (updates.xVariable) {
      updates.xScale = autoScale(
        await this.props.db.queryValueStats(this.props.table, updates.xVariable)
      );
    }
    if (updates.yVariable) {
      updates.yScale = autoScale(
        await this.props.db.queryValueStats(this.props.table, updates.yVariable)
      );
    }
    this.props.dispatch({
      type: DashboardActionType.UpdateVisualization,
      visualizationID: this.props.visualization.id,
      visualizationUpdates: updates
    });
  }

  public render() {
    return (
      <div className="dashboard-visualization">
        {this.renderToolbar()}
        {this.renderVisualizations()}
      </div>
    );
  }
}

export interface AddVisualizationViewProps extends DashboardState {
  role: "overview" | "detail";
  dispatch?: (action: DashboardAction) => void;
}
export interface AddVisualizationViewState {
  type: "timeseries" | "scatterplot";
  xVariable: string;
  yVariable: string;
}

const VisualizationTypeSelect = createEnumSelect<
  AddVisualizationViewState["type"]
>(["timeseries", "scatterplot"], ["Timeseries", "Scatterplot"]);

export class AddVisualizationView extends React.Component<
  AddVisualizationViewProps,
  AddVisualizationViewState
> {
  public state: AddVisualizationViewState = {
    type: "timeseries",
    xVariable: null,
    yVariable: null
  };
  public render() {
    return (
      <div className="dashboard-visualization dashboard-visualization-add">
        <div className="dashboard-visualization-header">
          <div className="el-row">
            <span className="el-small-controls">
              <span className="el-label">Add:</span>
              <VisualizationTypeSelect
                value={this.state.type}
                onChange={value => this.setState({ type: value })}
              />
              <span className="el-sep" />
              {this.state.type == "timeseries" ? (
                <VariableSelect
                  value={null}
                  list={this.props.variableList}
                  onChange={async variable => {
                    this.doAdd(
                      await createDefaultTimeseries(
                        this.props.db,
                        this.props.table,
                        variable
                      )
                    );
                  }}
                />
              ) : null}
              {this.state.type == "scatterplot" ? (
                <>
                  <VariableSelect
                    value={this.state.xVariable}
                    list={this.props.variableList}
                    onChange={async variable => {
                      this.setState({ xVariable: variable });
                    }}
                  />
                  <span className="el-sep" />
                  <VariableSelect
                    value={this.state.yVariable}
                    list={this.props.variableList}
                    onChange={async variable => {
                      this.setState({ yVariable: variable });
                    }}
                  />
                  <span className="el-sep" />
                  <Button
                    text="Add Scatterplot"
                    onClick={async () => {
                      if (this.state.xVariable && this.state.yVariable) {
                        this.doAdd(
                          await createDefaultScatterplot(
                            this.props.db,
                            this.props.table,
                            this.state.xVariable,
                            this.state.yVariable
                          )
                        );
                        this.setState({
                          xVariable: null,
                          yVariable: null
                        });
                      }
                    }}
                  />
                </>
              ) : null}
            </span>
          </div>
        </div>
      </div>
    );
  }

  public doAdd(vis: VisualizationDescription) {
    vis.id = uniqueID();
    this.props.dispatch({
      type: DashboardActionType.AddVisualization,
      role: this.props.role,
      visualization: vis
    });
  }
}

class HeightButtons extends React.Component<
  { value: number; steps: number[]; onChange: (value: number) => void },
  {}
> {
  public render() {
    return (
      <Switch
        label="Expanded"
        checked={this.props.value > this.props.steps[0]}
        onChange={e => {
          const checked = (e.target as any).checked;
          if (checked) {
            this.props.onChange(this.props.steps[1]);
          } else {
            this.props.onChange(this.props.steps[0]);
          }
        }}
      />
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

export const Visualization = connect(
  mapStateToProps,
  mapDispatchToProps
)(VisualizationView);

export const AddVisualization = connect(
  mapStateToProps,
  mapDispatchToProps
)(AddVisualizationView);
