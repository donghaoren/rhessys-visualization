import * as React from "react";
import * as d3 from "d3";

export interface D3AxisProps {
  /** The d3 scale for this axis */
  scale: d3.ScaleContinuousNumeric<number, number>;
  /** The orient of this axis */
  orient: "left" | "bottom" | "top" | "right";
  /** The title of the axis */
  title?: string;

  /** x offset */
  x?: number;
  /** y offset */
  y?: number;
  /** Treat the domain as timestamps */
  isTimestamp?: boolean;
  /** Show grid */
  grid?: boolean;
  /** The length of gridlines */
  width?: number;
  /** The degree to rotate the axis labels */
  rotateLabels?: number;

  hideTicks?: boolean;
}

export class D3Axis extends React.Component<D3AxisProps> {
  public static defaultProps: Partial<D3AxisProps> = {
    x: 0,
    y: 0,
    isTimestamp: false,
    grid: false,
    width: 100,
    rotateLabels: null
  };
  public container: SVGGElement;
  public containerBG: SVGGElement;

  public renderD3() {
    const { orient } = this.props;
    let scale: any = this.props.scale;
    if (this.props.isTimestamp) {
      scale = d3
        .scaleUtc()
        .domain(this.props.scale.domain().map(x => x * 1000))
        .range(this.props.scale.range());
    }
    const axis =
      orient == "left"
        ? d3.axisLeft(scale)
        : orient == "bottom"
        ? d3.axisBottom(scale)
        : orient == "top"
        ? d3.axisTop(scale)
        : orient == "right"
        ? d3.axisRight(scale)
        : null;

    if (this.props.isTimestamp) {
      const list = [
        [d3.utcFormat("%b %d"), (d: Date) => d.getUTCDate() != 1],
        [d3.utcFormat("%b"), (d: Date) => d.getUTCMonth() != 0],
        [d3.utcFormat("%Y"), () => true]
      ];
      axis.tickFormat((d: Date) => {
        for (const item of list) {
          if (item[1](d)) {
            return item[0](d) as string;
          }
        }
        return "";
      });
    }

    d3.select(this.container).call(axis);
    if (this.props.rotateLabels != null) {
      d3.select(this.container)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", `rotate(-${this.props.rotateLabels})`);
    }
    if (this.props.hideTicks) {
      d3.select(this.container)
        .selectAll("text")
        .remove();
    }
    if (this.props.grid) {
      axis.tickFormat(() => "");
      axis.tickSize(-this.props.width);
      d3.select(this.containerBG).call(axis);
      d3.select(this.containerBG)
        .selectAll(".tick:not(:first-of-type) line")
        .attr("stroke", "#eee")
        .attr("stroke-dasharray", "3,1");
    }
  }

  public componentDidMount() {
    this.renderD3();
  }

  public componentDidUpdate() {
    this.renderD3();
  }

  public renderTitle() {
    if (!this.props.title) {
      return null;
    }
    if (this.props.orient == "left") {
      const y1 = this.props.scale.range()[1];
      return (
        <g transform={`translate(0, ${y1.toFixed(5)}) rotate(-90)`}>
          <text x={-5} y={13} style={{ textAnchor: "end", fontSize: 12 }}>
            {this.props.title}
          </text>
        </g>
      );
    }
    if (this.props.orient == "bottom") {
      const x1 = this.props.scale.range()[1];
      return (
        <g transform={`translate(${x1.toFixed(5)}, 0)`}>
          <text x={-3} y={-5} style={{ textAnchor: "end", fontSize: 12 }}>
            {this.props.title}
          </text>
        </g>
      );
    }
    return null;
  }

  public render() {
    return (
      <g
        className="axis"
        transform={`translate(${this.props.x}, ${this.props.y})`}
      >
        {this.props.grid ? (
          <g className="axis-grid" ref={e => (this.containerBG = e)} />
        ) : null}
        <g ref={e => (this.container = e)} />
        {this.renderTitle()}
      </g>
    );
  }
}
