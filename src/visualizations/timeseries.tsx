import * as React from "react";
import * as d3 from "d3";
import {
  RHESSysDatabase,
  RHESSysGranularity,
  RHESSysDataFilter
} from "../database/abstract";
import { D3Axis } from "./axis";
import { D3BrushX } from "./brush";
import { ScaleNumerical } from "./scale";

export interface TimeseriesPlotProps {
  db: RHESSysDatabase;

  table: string;
  timeStart: number;
  timeEnd: number;
  granularity: RHESSysGranularity;

  scale: ScaleNumerical;

  width: number;
  height: number;

  brushEnabled?: boolean;
  brushMin?: number;
  brushMax?: number;
  onBrush?: (min: number, max: number) => void;

  lines: Array<{
    variable: string;
    color: string;
    lineWidth: number;
    opacity: number;
    filter?: RHESSysDataFilter;
  }>;
}

export class TimeseriesPlot extends React.PureComponent<TimeseriesPlotProps> {
  public chunkCache = new Map<
    string,
    {
      timeStart: number;
      timeEnd: number;
      data: Float64Array[][];
    }
  >();
  private clipPathID =
    "CLIP_" +
    Math.random()
      .toString(16)
      .substr(2);
  private chunkGeneration = 0;

  public async fetchChunk(timeStart: number, timeEnd: number) {
    if (this.chunkCache.has(timeStart + "::" + timeEnd)) {
      return false;
    }
    const gen = this.chunkGeneration;
    const data = await Promise.all(
      this.props.lines.map(line =>
        this.props.db.queryTimeSeries(
          this.props.table,
          this.props.granularity,
          [line.variable],
          {
            ...line.filter,
            timeStart,
            timeEnd
          }
        )
      )
    );
    if (this.chunkGeneration != gen) {
      return false;
    }
    const arrays = this.props.lines.map((x, i) => [
      new Float64Array(data[i].map(t => t.t)),
      new Float64Array(data[i].map(t => t[x.variable]))
    ]);
    this.chunkCache.set(timeStart + "::" + timeEnd, {
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

  public componentDidUpdate(oldProps: TimeseriesPlotProps) {
    if (
      JSON.stringify(oldProps.lines) != JSON.stringify(this.props.lines) ||
      oldProps.granularity != this.props.granularity
    ) {
      this.chunkCache.clear();
      this.chunkGeneration += 1;
      this.forceUpdate();
    }
    this.fetchChunks();
  }

  public render() {
    const marginLeft = 80;
    const marginBottom = 30;
    const marginTop = 20;
    const marginRight = 40;
    const chunks = Array.from(this.chunkCache.values()).filter(
      x =>
        !(
          x.timeStart > this.props.timeEnd || x.timeEnd < this.props.timeStart
        ) && x.data.length == this.props.lines.length
    );
    const tScale = d3
      .scaleLinear()
      .domain([this.props.timeStart, this.props.timeEnd])
      .range([marginLeft, this.props.width - marginRight]);

    const yScale = d3
      .scaleLinear()
      .domain([this.props.scale.domainMin, this.props.scale.domainMax])
      .range([this.props.height - marginBottom, marginTop]);

    return (
      <svg width={this.props.width} height={this.props.height}>
        <defs>
          <clipPath id={this.clipPathID}>
            <rect
              x={marginLeft}
              y={0}
              width={this.props.width - marginLeft - marginRight}
              height={this.props.height}
            />
          </clipPath>
        </defs>
        <D3Axis
          grid={true}
          width={this.props.width - marginLeft - marginRight}
          scale={yScale}
          orient="left"
          x={marginLeft}
          y={0}
        />
        <D3Axis
          scale={tScale}
          isTimestamp={true}
          orient="bottom"
          x={0}
          y={this.props.height - marginBottom}
        />
        <g clipPath={`url(#${this.clipPathID})`}>
          {this.props.lines.map((line, index) => (
            <g key={index} transform={`translate(${tScale(0).toFixed(5)}, 0)`}>
              {chunks.map((chunk, chunkIndex) => (
                <TimeseriesChunk
                  key={chunkIndex}
                  stroke={line.color}
                  lineWidth={line.lineWidth}
                  opacity={line.opacity}
                  points={chunk.data[index]}
                  tK={tScale(1) - tScale(0)}
                  tB={0}
                  yK={yScale(1) - yScale(0)}
                  yB={yScale(0)}
                />
              ))}
            </g>
          ))}
        </g>
        {this.props.brushEnabled ? (
          <D3BrushX
            x={0}
            y1={yScale.range()[0]}
            y2={yScale.range()[1]}
            valueMin={this.props.brushMin}
            valueMax={this.props.brushMax}
            onBrush={this.props.onBrush}
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
  points: Array<ArrayLike<number>>;
  stroke?: string;
  fill?: string;
  lineWidth?: number;
  opacity?: number;
}

export class TimeseriesChunk extends React.PureComponent<TimeseriesChunkProps> {
  public render() {
    const entries: string[] = [];
    const { points, tB, tK, yK, yB, yTransform } = this.props;
    if (yTransform == "log") {
      for (let i = 0; i < points[0].length; i++) {
        const x = tK * points[0][i] + tB;
        const y = yK * Math.log(points[1][i]) + yB;
        entries.push(x.toFixed(4) + "," + y.toFixed(4));
      }
    } else {
      for (let i = 0; i < points[0].length; i++) {
        const x = tK * points[0][i] + tB;
        const y = yK * points[1][i] + yB;
        entries.push(x.toFixed(4) + "," + y.toFixed(4));
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
