import * as React from "react";
import * as d3 from "d3";
import {
  RHESSysDatabase,
  RHESSysGranularity,
  RHESSysDataFilter
} from "../database/abstract";
import { ScaleNumerical, getD3Scale } from "./scale";
import { D3Axis } from "./axis";
import { deepEquals } from "../utils";

export interface AggregatedTimeseriesProps {
  db: RHESSysDatabase;

  table: string;
  timeStart: number;
  timeEnd: number;

  scale: ScaleNumerical;

  width: number;
  height: number;

  timeCursor?: number;

  variable: string;

  title?: string;

  aggregation: RHESSysGranularity;
  filter?: RHESSysDataFilter;

  groupsBy: string[];
  groups: Array<{
    values: string[];
    color: string;
    lineWidth: number;
    opacity: number;
  }>;
}

export interface AggregatedTimeseriesState {
  data: Array<
    Array<{
      t: number;
      variables: { [name: string]: any };
    }>
  >;
}

export class AggregatedTimeseries extends React.Component<
  AggregatedTimeseriesProps,
  AggregatedTimeseriesState
> {
  public state: AggregatedTimeseriesState = { data: null };
  private clipPathID =
    "CLIP_" +
    Math.random()
      .toString(16)
      .substr(2);

  public async doFetchData() {
    const {
      table,
      variable,
      aggregation,
      timeStart,
      timeEnd,
      groupsBy,
      groups,
      filter
    } = this.props;
    const data = await this.props.db.queryAggregatedVariables(
      table,
      [variable],
      aggregation,
      {
        variables: groupsBy,
        groups: groups.map(x => x.values)
      },
      {
        ...filter,
        timeStart,
        timeEnd
      }
    );
    this.setState({
      data
    });
  }

  protected previousFetch: Promise<void> = null;
  protected shouldFetchAgain = false;
  public fetchData() {
    if (this.previousFetch) {
      this.shouldFetchAgain = true;
    } else {
      this.shouldFetchAgain = false;
      this.previousFetch = this.doFetchData().then(() => {
        this.previousFetch = null;
        if (this.shouldFetchAgain) {
          this.fetchData();
        }
      });
    }
  }

  public componentDidMount() {
    this.fetchData();
  }

  public componentDidUpdate(oldProps: AggregatedTimeseriesProps) {
    const props = this.props;
    if (
      !deepEquals(
        [
          props.variable,
          props.groups,
          props.groupsBy,
          props.timeStart,
          props.timeEnd,
          props.aggregation,
          props.filter
        ],
        [
          oldProps.variable,
          oldProps.groups,
          oldProps.groupsBy,
          oldProps.timeStart,
          oldProps.timeEnd,
          oldProps.aggregation,
          oldProps.filter
        ]
      )
    ) {
      this.fetchData();
    }
  }

  public render() {
    const marginLeft = 10;
    const marginBottom = 30;
    const marginTop = 20;
    const marginRight = 20;
    const xScale = d3.scaleLinear();
    switch (this.props.aggregation) {
      case "day":
        xScale.domain([1, 366]);
        break;
      case "week":
        xScale.domain([1, 53]);
        break;
      case "month":
        xScale.domain([1, 12]);
        break;
    }
    xScale.range([marginLeft, this.props.width - marginRight]);

    const yScale = getD3Scale(this.props.scale).range([
      this.props.height - marginBottom,
      marginTop
    ]);

    return (
      <svg width={this.props.width} height={this.props.height}>
        <defs>
          <clipPath id={this.clipPathID}>
            <rect
              x={marginLeft}
              y={marginTop}
              width={this.props.width - marginLeft - marginRight}
              height={this.props.height - marginBottom - marginTop}
            />
          </clipPath>
        </defs>
        <D3Axis
          grid={true}
          width={this.props.width - marginLeft - marginRight}
          scale={yScale}
          orient="left"
          title={this.props.variable}
          x={marginLeft}
          y={0}
          hideTicks={true}
        />
        <D3Axis
          scale={xScale}
          orient="bottom"
          x={0}
          y={this.props.height - marginBottom}
        />
        {this.props.title ? (
          <text x={marginLeft} y={marginTop - 5} style={{ fontSize: 12 }}>
            {this.props.title}
          </text>
        ) : null}
        {this.props.groups.map((g, index) => {
          if (this.state.data && this.state.data[index]) {
            const data = this.state.data[index];
            if (data[0] && data[0].variables[this.props.variable]) {
              const path: string[] = [];
              const pathEnvelop: string[] = [];
              for (const datum of data) {
                const x = xScale(datum.t);
                const y = yScale(datum.variables[this.props.variable].mean);
                if (isFinite(x) && isFinite(y)) {
                  path.push(`${x.toFixed(5)},${y.toFixed(5)}`);
                }
              }
              if (!this.props.scale.log) {
                for (let i = 0; i < data.length; i++) {
                  const datum = data[i];
                  const x = xScale(datum.t);
                  const y = yScale(
                    datum.variables[this.props.variable].mean +
                      datum.variables[this.props.variable].stdev
                  );
                  if (isFinite(x) && isFinite(y)) {
                    pathEnvelop.push(`${x.toFixed(5)},${y.toFixed(5)}`);
                  }
                }
                for (let i = data.length - 1; i >= 0; i--) {
                  const datum = data[i];
                  const x = xScale(datum.t);
                  const y = yScale(
                    datum.variables[this.props.variable].mean -
                      datum.variables[this.props.variable].stdev
                  );
                  if (isFinite(x) && isFinite(y)) {
                    pathEnvelop.push(`${x.toFixed(5)},${y.toFixed(5)}`);
                  }
                }
              }
              return (
                <g key={index} clipPath={`url(#${this.clipPathID})`}>
                  <path
                    d={"M" + pathEnvelop.join("L")}
                    style={{
                      stroke: "none",
                      fill: g.color,
                      opacity: 0.1
                    }}
                  />
                  <path
                    d={"M" + path.join("L")}
                    style={{
                      stroke: g.color,
                      strokeWidth: g.lineWidth,
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      fill: "none"
                    }}
                  />
                </g>
              );
            }
          }
          return null;
        })}
      </svg>
    );
  }
}
