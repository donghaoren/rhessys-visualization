import * as React from "react";
import { Button, HTMLSelect } from "@blueprintjs/core";

import {
  RHESSysDatabase,
  RHESSysDataFilter,
  RHESSysGranularity,
  RHESSysVariable
} from "./database/abstract";
import { parseTime } from "./utils";
import { TimeseriesPlot } from "./visualizations/timeseries";
import { VariableSelect } from "./widgets/variable_select";
import { GroupsEditor, kOptions } from "./widgets/groups_editor";
import { Scatterplot } from "./visualizations/scatterplot";

export interface DashboardGroup {
  filter: RHESSysDataFilter;
  color: string;
}

export interface DashboardProps {
  db: RHESSysDatabase;
  table: string;
}

export interface DashboardState {
  timeStart: number;
  timeEnd: number;
  variableList: RHESSysVariable[];
  overviewVariables: string[];
  overviewGranularity: RHESSysGranularity;
  detailVariables: string[];
  detailGranularity: RHESSysGranularity;
  detailTimeStart: number;
  detailTimeEnd: number;
  groups: DashboardGroup[];
  visualizationWidth: number;
}

export class Dashboard extends React.Component<DashboardProps, DashboardState> {
  public container: HTMLDivElement;
  public state: DashboardState = {
    variableList: [],
    timeStart: parseTime("1970-01-01"),
    timeEnd: parseTime("2020-01-01"),
    overviewVariables: ["precip", "streamflow"],
    overviewGranularity: "month",
    detailVariables: ["streamflow", "streamflow_NO3", "root_depth"],
    detailGranularity: "day",
    detailTimeStart: parseTime("2000-01-01"),
    detailTimeEnd: parseTime("2005-01-01"),
    visualizationWidth: 900,
    groups: kOptions[0].groups
  };

  public componentDidMount() {
    this.updateVariableList();
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  public handleResize = () => {
    this.setState({
      visualizationWidth: this.container.getBoundingClientRect().width - 10
    });
  };

  public async updateVariableList() {
    let list = await this.props.db.listVariables(this.props.table);
    list = list
      .filter(x => x.type == "number")
      .sort((a, b) => {
        return a.name < b.name ? -1 : 1;
      });
    this.setState({ variableList: list });
  }

  public render() {
    return (
      <>
        <div className="app-header">
          <GroupsEditor
            groups={this.state.groups}
            onChange={g => this.setState({ groups: g })}
          />
        </div>
        <div className="app-main">
          <div className="dashboard" ref={e => (this.container = e)}>
            <div className="dashboard-section-header">
              <span className="el-caption">Overview</span>
              Granularity:{" "}
              <HTMLSelect
                value={this.state.overviewGranularity}
                onChange={e => {
                  this.setState({
                    overviewGranularity: e.target.value as RHESSysGranularity
                  });
                }}
              >
                <option value="year">Year</option>
                <option value="month">Month</option>
                <option value="week">Week</option>
                <option value="day">Day</option>
              </HTMLSelect>
            </div>
            {this.state.overviewVariables.map((variable, index) => (
              <div className="dashboard-timeline" key={variable}>
                <div className="dashboard-timeline-header">
                  <VariableSelect
                    list={this.state.variableList}
                    value={variable}
                    onChange={value => {
                      this.state.overviewVariables[index] = value;
                      this.forceUpdate();
                    }}
                  />
                  <div className="el-right">
                    <Button
                      icon="trash"
                      intent="danger"
                      onClick={() => {
                        this.state.overviewVariables.splice(index, 1);
                        this.forceUpdate();
                      }}
                    />
                  </div>
                </div>
                <div className="dashboard-timeline-content">
                  <DashboardTimeline
                    width={this.state.visualizationWidth}
                    height={200}
                    db={this.props.db}
                    table={this.props.table}
                    variable={variable}
                    granularity={this.state.overviewGranularity}
                    timeStart={this.state.timeStart}
                    timeEnd={this.state.timeEnd}
                    groups={this.state.groups}
                    brushMin={this.state.detailTimeStart}
                    brushMax={this.state.detailTimeEnd}
                    brushEnabled={true}
                    onBrush={(min, max) => {
                      this.setState({
                        detailTimeStart: min,
                        detailTimeEnd: max
                      });
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="dashboard-timeline">
              <div className="dashboard-timeline-header">
                <VariableSelect
                  list={this.state.variableList}
                  value={null}
                  placeholder="Add new variable"
                  onChange={value => {
                    this.state.overviewVariables.push(value);
                    this.forceUpdate();
                  }}
                />
              </div>
            </div>
            <div className="dashboard-section-header">
              <span className="el-caption">Details</span>
              Granularity:{" "}
              <HTMLSelect
                value={this.state.detailGranularity}
                onChange={e => {
                  this.setState({
                    detailGranularity: e.target.value as RHESSysGranularity
                  });
                }}
              >
                <option value="year">Year</option>
                <option value="month">Month</option>
                <option value="week">Week</option>
                <option value="day">Day</option>
              </HTMLSelect>
            </div>
            {this.state.detailVariables.map((variable, index) => (
              <div className="dashboard-timeline" key={variable}>
                <div className="dashboard-timeline-header">
                  <VariableSelect
                    list={this.state.variableList}
                    value={variable}
                    onChange={value => {
                      this.state.detailVariables[index] = value;
                      this.forceUpdate();
                    }}
                  />
                  <div className="el-right">
                    <Button
                      icon="trash"
                      intent="danger"
                      onClick={() => {
                        this.state.detailVariables.splice(index, 1);
                        this.forceUpdate();
                      }}
                    />
                  </div>
                </div>
                <div className="dashboard-timeline-content">
                  <DashboardTimeline
                    width={this.state.visualizationWidth}
                    height={200}
                    db={this.props.db}
                    table={this.props.table}
                    variable={variable}
                    granularity={this.state.detailGranularity}
                    timeStart={this.state.detailTimeStart}
                    timeEnd={this.state.detailTimeEnd}
                    groups={this.state.groups}
                  />
                </div>
              </div>
            ))}
            <div className="dashboard-timeline">
              <div className="dashboard-timeline-header">
                <VariableSelect
                  list={this.state.variableList}
                  value={null}
                  placeholder="Add new variable"
                  onChange={value => {
                    this.state.detailVariables.push(value);
                    this.forceUpdate();
                  }}
                />
              </div>
            </div>
            <Scatterplot
              width={500}
              height={500}
              db={this.props.db}
              table={this.props.table}
              xVariable={"streamflow_NO3"}
              yVariable={"streamflow"}
              timeStart={this.state.detailTimeStart}
              timeEnd={this.state.detailTimeEnd}
              xScale={{ domainMin: 0, domainMax: 0.001 }}
              yScale={{ domainMin: 0, domainMax: 10 }}
              granularity={"month"}
              groups={this.state.groups}
            />
          </div>
        </div>
      </>
    );
  }
}

export interface DashboardTimelineProps {
  width: number;
  height: number;
  db: RHESSysDatabase;
  table: string;
  variable: string;
  granularity: RHESSysGranularity;
  timeStart: number;
  timeEnd: number;
  groups: DashboardGroup[];
  brushEnabled?: boolean;
  brushMin?: number;
  brushMax?: number;
  onBrush?: (min: number, max: number) => void;
}

export interface DashboardTimelineState {
  ready: boolean;
  domainMin: number;
  domainMax: number;
  log: boolean;
}

export class DashboardTimeline extends React.Component<
  DashboardTimelineProps,
  DashboardTimelineState
> {
  public state = {
    ready: false,
    domainMin: 0,
    domainMax: 1,
    log: false
  };

  public async autoScale() {
    const stat = await this.props.db.queryValueStats(
      this.props.table,
      this.props.variable,
      "day"
    );
    if (stat.min < 0) {
      this.setState({
        domainMin: -stat.stdev * 5,
        domainMax: +stat.stdev * 5,
        log: false,
        ready: true
      });
    } else {
      if (stat.mean > stat.stdev * 10) {
        this.setState({
          domainMin: stat.mean - stat.stdev * 5,
          domainMax: stat.mean + stat.stdev * 5,
          log: false,
          ready: true
        });
      } else {
        this.setState({
          domainMin: 0,
          domainMax: stat.mean + stat.stdev * 5,
          log: false,
          ready: true
        });
      }
    }
  }

  public componentDidMount() {
    this.autoScale();
  }

  public componentDidUpdate(oldProps: DashboardTimelineProps) {
    if (
      oldProps.variable != this.props.variable ||
      oldProps.granularity != this.props.granularity
    ) {
      this.autoScale();
    }
  }

  public render() {
    return (
      <div
        style={{
          width: this.props.width + "px",
          height: this.props.height + "px"
        }}
      >
        <TimeseriesPlot
          db={this.props.db}
          table={this.props.table}
          timeStart={this.props.timeStart}
          timeEnd={this.props.timeEnd}
          brushEnabled={this.props.brushEnabled}
          brushMin={this.props.brushMin}
          brushMax={this.props.brushMax}
          onBrush={this.props.onBrush}
          granularity={this.props.granularity}
          width={this.props.width}
          height={this.props.height}
          scale={{
            domainMin: this.state.domainMin,
            domainMax: this.state.domainMax,
            log: this.state.log
          }}
          lines={this.props.groups.map(g => ({
            variable: this.props.variable,
            lineWidth: 1,
            opacity: 0.8,
            filter: g.filter,
            color: g.color
          }))}
        />
      </div>
    );
  }
}