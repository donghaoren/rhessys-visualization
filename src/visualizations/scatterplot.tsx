import * as React from "react";
import * as d3 from "d3";
import {
  RHESSysDatabase,
  RHESSysGranularity,
  RHESSysDataFilter
} from "../database/abstract";
import { ScaleNumerical, getD3Scale } from "./scale";
import { D3Axis } from "./axis";

export interface ScatterplotProps {
  db: RHESSysDatabase;

  table: string;
  timeStart: number;
  timeEnd: number;
  granularity: RHESSysGranularity;

  width: number;
  height: number;

  xVariable: string;
  xScale: ScaleNumerical;

  yVariable: string;
  yScale: ScaleNumerical;

  groups: Array<{
    filter: RHESSysDataFilter;
    color: string;
  }>;
}

export interface ScatterplotState {
  data?: any[][];
}

export class Scatterplot extends React.Component<
  ScatterplotProps,
  ScatterplotState
> {
  public state: ScatterplotState = {};

  public onAfterLoading: () => void = null;
  public isLoading = false;

  private async fetchData() {
    const data = await Promise.all(
      this.props.groups.map(g =>
        this.props.db.queryScatterplot(
          this.props.table,
          this.props.granularity,
          this.props.xVariable,
          this.props.yVariable,
          {
            ...g.filter,
            timeStart: this.props.timeStart,
            timeEnd: this.props.timeEnd
          }
        )
      )
    );
    this.setState({
      data: data.map(item =>
        item.map(p => ({
          ts: p.ts,
          x: p[this.props.xVariable],
          y: p[this.props.yVariable]
        }))
      )
    });
  }

  public currentFetchData: Promise<void> = null;

  public scheduleFetchData() {
    if (this.currentFetchData) {
    } else {
    }
  }

  public componentDidMount() {
    this.scheduleFetchData();
  }

  public componentDidUpdate() {
    this.scheduleFetchData();
  }

  public render() {
    const { width, height } = this.props;
    const marginLeft = 80;
    const marginBottom = 30;
    const marginTop = 20;
    const marginRight = 40;
    const xScale = getD3Scale(this.props.xScale).range([
      marginLeft,
      width - marginRight
    ]);
    const yScale = getD3Scale(this.props.yScale).range([
      height - marginBottom,
      marginTop
    ]);
    return (
      <svg width={this.props.width} height={this.props.height}>
        <D3Axis
          scale={xScale}
          orient="bottom"
          y={height - marginBottom}
          x={0}
        />
        <D3Axis scale={yScale} orient="left" x={marginLeft} y={0} />
        {this.props.groups.map((g, index) => {
          if (this.state.data && this.state.data[index]) {
            const data = this.state.data[index];
            return (
              <g key={index}>
                {data.map((item, index2) => {
                  const x = item.x;
                  const y = item.y;
                  return (
                    <circle
                      key={index2}
                      cx={xScale(x)}
                      cy={yScale(y)}
                      r={5}
                      style={{ fill: g.color, stroke: "none" }}
                    />
                  );
                })}
              </g>
            );
          }
        })}
      </svg>
    );
  }
}

// export class ScatterplotChunk extends React.Component<> {
// }
