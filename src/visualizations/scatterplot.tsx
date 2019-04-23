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
    opacity: number;
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

  public chunkCache = new Map<
    string,
    {
      id: string;
      timeStart: number;
      timeEnd: number;
      data: Float64Array[][];
    }
  >();
  private chunkGeneration = 0;

  public async fetchChunk(timeStart: number, timeEnd: number) {
    if (this.chunkCache.has(timeStart + "::" + timeEnd)) {
      return false;
    }
    const { xVariable, yVariable } = this.props;
    const gen = this.chunkGeneration;
    const data = await Promise.all(
      this.props.groups.map(g =>
        this.props.db.queryTimeSeries(
          this.props.table,
          this.props.granularity,
          [xVariable, yVariable],
          {
            ...g.filter,
            timeStart,
            timeEnd
          }
        )
      )
    );
    if (this.chunkGeneration != gen) {
      return false;
    }
    const arrays = this.props.groups.map((x, i) => [
      new Float64Array(data[i].map(t => t.t)),
      new Float64Array(data[i].map(t => t[xVariable])),
      new Float64Array(data[i].map(t => t[yVariable]))
    ]);
    this.chunkCache.set(timeStart + "::" + timeEnd, {
      id: timeStart + "::" + timeEnd,
      timeStart,
      timeEnd,
      data: arrays
    });
    return true;
  }

  public async fetchChunks() {
    let rangeSize = 86400 * 365;
    if (this.props.granularity == "year") {
      rangeSize = 86400 * 365 * 2000;
    }
    if (this.props.granularity == "month") {
      rangeSize = 86400 * 30 * 2000;
    }
    if (this.props.granularity == "week") {
      rangeSize = 86400 * 7 * 2000;
    }
    if (this.props.granularity == "day") {
      rangeSize = 86400 * 2000;
    }
    const range1 = Math.floor(this.props.timeStart / rangeSize);
    const range2 = Math.ceil(this.props.timeEnd / rangeSize);
    let shouldUpdate = false;
    for (let i = range1; i <= range2; i++) {
      shouldUpdate =
        shouldUpdate ||
        (await this.fetchChunk(i * rangeSize, i * rangeSize + rangeSize));
    }
    if (shouldUpdate) {
      this.forceUpdate();
    }
  }

  public componentDidMount() {
    this.fetchChunks();
  }

  public componentDidUpdate(oldProps: ScatterplotProps) {
    if (
      JSON.stringify(oldProps.groups) != JSON.stringify(this.props.groups) ||
      oldProps.granularity != this.props.granularity
    ) {
      this.chunkCache.clear();
      this.chunkGeneration += 1;
      this.forceUpdate();
    }
    this.fetchChunks();
  }

  public render() {
    const { width, height } = this.props;
    const marginLeft = 80;
    const marginBottom = 80;
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
    const chunks = Array.from(this.chunkCache.values()).filter(
      x =>
        !(
          x.timeStart > this.props.timeEnd || x.timeEnd < this.props.timeStart
        ) && x.data.length == this.props.groups.length
    );
    return (
      <div
        style={{
          width: this.props.width + "px",
          height: this.props.height + "px",
          position: "relative"
        }}
      >
        <svg
          width={this.props.width}
          height={this.props.height}
          style={{ left: 0, top: 0, position: "absolute" }}
        >
          <D3Axis
            scale={xScale}
            orient="bottom"
            rotateLabels={45}
            y={height - marginBottom}
            x={0}
          />
          <D3Axis scale={yScale} orient="left" x={marginLeft} y={0} />
        </svg>
        {this.props.groups.map((g, gIndex) => (
          <div key={gIndex}>
            {chunks.map(chunk => (
              <ScatterplotChunkCanvas
                key={chunk.id}
                width={this.props.width}
                height={this.props.height}
                chunk={chunk.data[gIndex]}
                color={g.color}
                opacity={g.opacity}
                timeStart={this.props.timeStart}
                timeEnd={this.props.timeEnd}
                kX={xScale(1) - xScale(0)}
                kY={yScale(1) - yScale(0)}
                bX={xScale(0)}
                bY={yScale(0)}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
}

export interface ScatterplotChunkProps {
  width: number;
  height: number;
  chunk: Array<ArrayLike<number>>;
  color: string;
  opacity: number;
  timeStart: number;
  timeEnd: number;
  kX: number;
  bX: number;
  kY: number;
  bY: number;
}
export class ScatterplotChunk extends React.PureComponent<
  ScatterplotChunkProps
> {
  public render() {
    const {
      chunk,
      color,
      opacity,
      timeStart,
      timeEnd,
      kX,
      kY,
      bX,
      bY
    } = this.props;
    const ids: number[] = [];
    for (let i = 0; i < chunk[0].length; i++) {
      if (chunk[0][i] >= timeStart && chunk[0][i] <= timeEnd) {
        ids.push(i);
      }
    }
    return (
      <g style={{ opacity }}>
        {ids.map(id => (
          <circle
            key={id}
            cx={kX * chunk[1][id] + bX}
            cy={kY * chunk[2][id] + bY}
            r={2}
            style={{ fill: color }}
          />
        ))}
      </g>
    );
  }
}

export class ScatterplotChunkCanvas extends React.PureComponent<
  ScatterplotChunkProps
> {
  public canvas: HTMLCanvasElement;
  public draw() {
    if (!this.canvas) {
      return;
    }
    const ctx = this.canvas.getContext("2d");
    ctx.resetTransform();
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, this.props.width, this.props.height);
    const {
      chunk,
      color,
      opacity,
      timeStart,
      timeEnd,
      kX,
      kY,
      bX,
      bY
    } = this.props;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    for (let i = 0; i < chunk[0].length; i++) {
      if (chunk[0][i] >= timeStart && chunk[0][i] <= timeEnd) {
        ctx.beginPath();
        ctx.arc(
          kX * chunk[1][i] + bX,
          kY * chunk[2][i] + bY,
          2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  public request: any;
  public scheduleDraw() {
    if (this.request) {
      cancelAnimationFrame(this.request);
    }
    this.request = requestAnimationFrame(() => {
      this.request = null;
      this.draw();
    });
  }
  public componentDidMount() {
    this.scheduleDraw();
  }
  public componentDidUpdate() {
    this.scheduleDraw();
  }
  public render() {
    return (
      <canvas
        style={{
          position: "absolute",
          width: this.props.width + "px",
          height: this.props.height + "px",
          left: 0,
          top: 0
        }}
        ref={e => (this.canvas = e)}
        width={this.props.width * 2}
        height={this.props.height * 2}
      />
    );
  }
}
