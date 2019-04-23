import * as React from "react";
import * as d3 from "d3";

export interface D3AxisProps {
  x: number;
  y: number;
  scale: d3.ScaleContinuousNumeric<number, number>;
  isTimestamp?: boolean;
  grid?: boolean;
  width?: number;
  orient: "left" | "bottom" | "top" | "right";
  rotateLabels?: number;
}

export class D3Axis extends React.Component<D3AxisProps> {
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
    d3.select(this.container).call(axis);
    if (this.props.rotateLabels != null) {
      d3.select(this.container)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", `rotate(-${this.props.rotateLabels})`);
    }
    if (this.props.grid) {
      axis.tickFormat(() => "");
      axis.tickSize(-this.props.width);
      d3.select(this.containerBG).call(axis);
      d3.select(this.containerBG)
        .selectAll(".tick:not(:first-of-type) line")
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "3,1");
    }
  }

  public componentDidMount() {
    this.renderD3();
  }

  public componentDidUpdate() {
    this.renderD3();
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
      </g>
    );
  }
}
