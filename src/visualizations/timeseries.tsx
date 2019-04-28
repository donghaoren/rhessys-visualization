import * as React from "react";
import * as d3 from "d3";
import {
  RHESSysDatabase,
  RHESSysGranularity,
  RHESSysDataFilter
} from "../database/abstract";
import { D3Axis } from "./axis";
import { BrushX, PanX } from "./brush";
import { ScaleNumerical, getD3Scale } from "./scale";
import { ChunkFetcher } from "./chunk_fetcher";
import { scaleOrdinal } from "d3";

export interface TimeseriesPlotProps {
  db: RHESSysDatabase;

  table: string;
  timeStart: number;
  timeEnd: number;
  granularity: RHESSysGranularity;
  filter?: RHESSysDataFilter;

  scale: ScaleNumerical;

  width: number;
  height: number;

  title?: string;

  timeCursor?: number;
  onTimeCursor?: (t: number) => void;

  brushEnabled?: boolean;
  brushMin?: number;
  brushMax?: number;
  onBrush?: (min: number, max: number) => void;

  panEnabled?: boolean;
  onPan?: (min: number, max: number) => void;

  variable: string;
  groupsBy: string[];
  groups: Array<{
    values: string[];
    color: string;
    lineWidth: number;
    opacity: number;
  }>;

  marginLeft?: number;
  hideYTicks?: boolean;
}

export class TimeseriesPlot extends React.PureComponent<TimeseriesPlotProps> {
  private clipPathID =
    "CLIP_" +
    Math.random()
      .toString(16)
      .substr(2);

  private chunkFetcher: ChunkFetcher = new ChunkFetcher(
    this.props.db,
    this.props.table
  );

  public getCurrentViewStats() {
    const chunks = this.chunkFetcher.getChunks(
      this.props.timeStart,
      this.props.timeEnd
    );
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
            const value = item[this.props.variable][i];
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
  }

  public componentDidMount() {
    this.chunkFetcher.addListener("update", () => {
      this.forceUpdate();
    });
  }

  public render() {
    this.chunkFetcher.setVariables([this.props.variable]);
    this.chunkFetcher.setGranularity(this.props.granularity);
    this.chunkFetcher.setFilter(this.props.filter);
    this.chunkFetcher.setGroups({
      variables: this.props.groupsBy,
      groups: this.props.groups.map(x => x.values)
    });
    this.chunkFetcher.request(this.props.timeStart, this.props.timeEnd);

    const marginLeft = this.props.marginLeft || 80;
    const marginBottom = 30;
    const marginTop = 20;
    const marginRight = 20;
    const chunks = this.chunkFetcher.getChunks(
      this.props.timeStart,
      this.props.timeEnd
    );
    const tScale = d3
      .scaleLinear()
      .domain([this.props.timeStart, this.props.timeEnd])
      .range([marginLeft, this.props.width - marginRight]);

    const yScale = getD3Scale(this.props.scale).range([
      this.props.height - marginBottom,
      marginTop
    ]);

    const truncateTK = (k: number) => {
      const log = Math.floor(Math.log(k) / Math.log(10));
      const scaler = Math.pow(10, -log + 5);
      return Math.round(k * scaler) / scaler;
    };

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
          hideTicks={this.props.hideYTicks}
          y={0}
        />
        <D3Axis
          scale={tScale}
          isTimestamp={true}
          orient="bottom"
          x={0}
          y={this.props.height - marginBottom}
        />
        {this.props.title ? (
          <text x={marginLeft} y={marginTop - 5} style={{ fontSize: 12 }}>
            {this.props.title}
          </text>
        ) : null}
        <g clipPath={`url(#${this.clipPathID})`}>
          {this.props.groups.map((group, index) => (
            <g key={index} transform={`translate(${tScale(0).toFixed(5)}, 0)`}>
              {chunks.map(chunk => (
                <TimeseriesChunk
                  key={chunk.id}
                  stroke={group.color}
                  lineWidth={group.lineWidth}
                  opacity={group.opacity}
                  points={chunk.groups[index]}
                  variable={this.props.variable}
                  yTransform={this.props.scale.log ? "log" : "linear"}
                  tK={truncateTK(tScale(1) - tScale(0))}
                  tB={0}
                  yK={
                    this.props.scale.log
                      ? yScale(Math.E) - yScale(1)
                      : yScale(1) - yScale(0)
                  }
                  yB={this.props.scale.log ? yScale(1) : yScale(0)}
                />
              ))}
            </g>
          ))}
        </g>
        {this.props.timeCursor != null ? (
          <line
            x1={tScale(this.props.timeCursor)}
            x2={tScale(this.props.timeCursor)}
            y1={yScale.range()[0]}
            y2={yScale.range()[1]}
            style={{
              stroke: "black",
              shapeRendering: "crispEdges"
            }}
          />
        ) : null}
        {this.props.panEnabled ? (
          <PanX
            y1={yScale.range()[0]}
            y2={yScale.range()[1]}
            scale={tScale}
            onBrush={(min, max) => {
              this.props.onPan(min, max);
            }}
            onHover={this.props.onTimeCursor}
          />
        ) : null}
        {this.props.brushEnabled ? (
          <BrushX
            y1={yScale.range()[0]}
            y2={yScale.range()[1]}
            valueMin={this.props.brushMin}
            valueMax={this.props.brushMax}
            onBrush={this.props.onBrush}
            onHover={this.props.onTimeCursor}
            scale={tScale}
          />
        ) : null}
      </svg>
    );
  }
}

export interface TimeseriesChunkProps {
  tK: number;
  tB: number;
  yK: number;
  yB: number;
  yTransform?: "linear" | "log";
  points: { t: ArrayLike<number>; [name: string]: ArrayLike<number> };
  variable: string;
  stroke?: string;
  fill?: string;
  lineWidth?: number;
  opacity?: number;
}

export class TimeseriesChunk extends React.PureComponent<TimeseriesChunkProps> {
  public render() {
    const entries: string[] = [];
    const { points, tB, tK, yK, yB, yTransform } = this.props;
    const arrayT = points.t;
    const arrayV = points[this.props.variable];
    if (yTransform == "log") {
      for (let i = 0; i < arrayT.length; i++) {
        const x = tK * arrayT[i] + tB;
        const y = yK * Math.log(arrayV[i]) + yB;
        if (isFinite(x) && isFinite(y)) {
          entries.push(x.toFixed(2) + "," + y.toFixed(2));
        }
      }
    } else {
      for (let i = 0; i < arrayT.length; i++) {
        const x = tK * arrayT[i] + tB;
        const y = yK * arrayV[i] + yB;
        if (isFinite(x) && isFinite(y)) {
          entries.push(x.toFixed(2) + "," + y.toFixed(2));
        }
      }
    }
    return (
      <path
        d={"M" + entries.join("L")}
        style={{
          opacity: this.props.opacity,
          strokeWidth: this.props.lineWidth,
          stroke: this.props.stroke || "none",
          fill: this.props.fill || "none",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }}
      />
    );
  }
}
