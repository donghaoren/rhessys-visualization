import * as React from "react";
import {
  RHESSysDatabase,
  RHESSysGranularity,
  RHESSysDataFilter
} from "../database/abstract";
import { ScaleNumerical, getD3Scale } from "./scale";
import { D3Axis } from "./axis";
import { ChunkFetcher } from "./chunk_fetcher";

export interface ScatterplotProps {
  db: RHESSysDatabase;

  table: string;
  timeStart: number;
  timeEnd: number;
  granularity: RHESSysGranularity;
  filter?: RHESSysDataFilter;

  width: number;
  height: number;

  xVariable: string;
  xScale: ScaleNumerical;

  yVariable: string;
  yScale: ScaleNumerical;

  points?: boolean;
  lines?: boolean;

  groupsBy: string[];
  groups: Array<{
    values: string[];
    color: string;
    opacity: number;
    lineWidth: number;
    pointSize: number;
  }>;

  title?: string;
}

export interface ScatterplotState {
  data?: any[][];
}

export class Scatterplot extends React.Component<
  ScatterplotProps,
  ScatterplotState
> {
  public state: ScatterplotState = {};

  public chunkFetcher = new ChunkFetcher(this.props.db, this.props.table);

  public componentDidMount() {
    this.chunkFetcher.addListener("update", () => {
      this.forceUpdate();
    });
  }

  public getCurrentViewStats() {
    const chunks = this.chunkFetcher.getChunks(
      this.props.timeStart,
      this.props.timeEnd
    );
    return [this.props.xVariable, this.props.yVariable].map(variable => {
      let sumX = 0;
      let sumX2 = 0;
      let count = 0;
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      for (const chunk of chunks) {
        for (const item of chunk.groups) {
          for (let i = 0; i < item.t.length; i++) {
            const t = item.t[i];
            if (t >= this.props.timeStart && t <= this.props.timeEnd) {
              const value = item[variable][i];
              if (value > maxX) {
                maxX = value;
              }
              if (value < minX) {
                minX = value;
              }
              sumX += value;
              sumX2 += value * value;
              count += 1;
            }
          }
        }
      }
      return {
        mean: sumX / count,
        min: minX,
        max: maxX,
        stdev: Math.sqrt(sumX2 / count - (sumX / count) * (sumX / count)),
        count
      };
    });
  }

  public render() {
    this.chunkFetcher.setVariables([
      this.props.xVariable,
      this.props.yVariable
    ]);
    this.chunkFetcher.setFilter(this.props.filter);
    this.chunkFetcher.setGranularity(this.props.granularity);
    this.chunkFetcher.setGroups({
      variables: this.props.groupsBy,
      groups: this.props.groups.map(x => x.values)
    });
    this.chunkFetcher.request(this.props.timeStart, this.props.timeEnd);

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
    const chunks = this.chunkFetcher.getChunks(
      this.props.timeStart,
      this.props.timeEnd
    );
    return (
      <div
        style={{
          width: this.props.width + "px",
          height: this.props.height + "px",
          display: "inline-block",
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
            title={this.props.xVariable}
            grid={true}
            width={height - marginTop - marginBottom}
          />
          <D3Axis
            scale={yScale}
            orient="left"
            x={marginLeft}
            y={0}
            title={this.props.yVariable}
            grid={true}
            width={width - marginLeft - marginRight}
          />
          {this.props.title ? (
            <text x={marginLeft} y={marginTop - 5} style={{ fontSize: 12 }}>
              {this.props.title}
            </text>
          ) : null}
        </svg>
        {this.props.groups.map((g, gIndex) => (
          <div key={gIndex}>
            {chunks.map(chunk => (
              <ScatterplotChunkCanvas
                key={chunk.id}
                width={this.props.width}
                height={this.props.height}
                points={chunk.groups[gIndex]}
                xVariable={this.props.xVariable}
                yVariable={this.props.yVariable}
                color={g.color}
                opacity={g.opacity}
                timeStart={Math.max(chunk.timeStart, this.props.timeStart)}
                timeEnd={Math.min(chunk.timeEnd, this.props.timeEnd)}
                showPoints={this.props.points}
                showLines={this.props.lines}
                kX={
                  this.props.xScale.log
                    ? xScale(Math.E) - xScale(1)
                    : xScale(1) - xScale(0)
                }
                kY={
                  this.props.yScale.log
                    ? yScale(Math.E) - yScale(1)
                    : yScale(1) - yScale(0)
                }
                bX={this.props.xScale.log ? xScale(Math.E) : xScale(0)}
                bY={this.props.yScale.log ? yScale(Math.E) : yScale(0)}
                xTransform={this.props.xScale.log ? "log" : "linear"}
                yTransform={this.props.yScale.log ? "log" : "linear"}
                lineWidth={g.lineWidth}
                radius={g.pointSize}
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
  showPoints?: boolean;
  showLines?: boolean;
  points: { t: ArrayLike<number>; [name: string]: ArrayLike<number> };
  color: string;
  opacity: number;
  timeStart: number;
  timeEnd: number;
  xVariable: string;
  yVariable: string;
  kX: number;
  bX: number;
  kY: number;
  bY: number;
  xTransform?: "linear" | "log";
  yTransform?: "linear" | "log";
  radius: number;
  lineWidth: number;
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
      points,
      color,
      opacity,
      timeStart,
      timeEnd,
      kX,
      kY,
      bX,
      bY,
      radius,
      lineWidth
    } = this.props;
    const tx =
      this.props.xTransform == "log"
        ? (x: number) => Math.log(x)
        : (x: number) => x;
    const ty =
      this.props.yTransform == "log"
        ? (x: number) => Math.log(x)
        : (x: number) => x;

    if (this.props.showPoints) {
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      for (let i = 0; i < points.t.length; i++) {
        if (points.t[i] >= timeStart && points.t[i] <= timeEnd) {
          const x = kX * tx(points[this.props.xVariable][i]) + bX;
          const y = kY * ty(points[this.props.yVariable][i]) + bY;
          if (isFinite(x) && isFinite(y)) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    if (this.props.showLines) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = opacity * 0.5;

      let prev = null;
      for (let i = 0; i < points.t.length; i++) {
        if (points.t[i] >= timeStart && points.t[i] <= timeEnd) {
          const now = [
            kX * tx(points[this.props.xVariable][i]) + bX,
            kY * ty(points[this.props.yVariable][i]) + bY
          ];
          if (isFinite(now[0]) && isFinite(now[1])) {
            ctx.beginPath();
            if (prev) {
              ctx.moveTo(prev[0], prev[1]);
              ctx.lineTo(now[0], now[1]);
            }
            prev = now;
            ctx.stroke();
          }
        }
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
