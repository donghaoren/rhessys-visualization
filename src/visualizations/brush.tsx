import * as React from "react";
import * as d3 from "d3";

export interface D3BrushXProps {
  x: number;
  y1: number;
  y2: number;
  valueMin: number;
  valueMax: number;
  scale: d3.ScaleContinuousNumeric<number, number>;
  onBrush?: (valueMin: number, valueMax: number) => void;
}

export class D3BrushX extends React.Component<D3BrushXProps> {
  public container: SVGGElement;
  public brush: d3.BrushBehavior<{}>;

  public renderD3() {
    this.brush.extent([
      [this.props.scale.range()[0], Math.min(this.props.y1, this.props.y2)],
      [this.props.scale.range()[1], Math.max(this.props.y1, this.props.y2)]
    ]);
    this.brush.move(d3.select(this.container), [
      this.props.scale(this.props.valueMin),
      this.props.scale(this.props.valueMax)
    ]);
    d3.select(this.container).call(this.brush);
  }

  public componentDidMount() {
    this.brush = d3.brushX();
    this.brush.on("brush", () => {
      if (!(d3.event.sourceEvent instanceof MouseEvent)) {
        return;
      }
      const [v1, v2] = d3.event.selection;
      if (this.props.onBrush) {
        const newValue1 = this.props.scale.invert(v1);
        const newValue2 = this.props.scale.invert(v2);
        this.props.onBrush(newValue1, newValue2);
      }
    });
    d3.select(this.container).call(this.brush);
    this.renderD3();
  }

  public componentDidUpdate() {
    this.renderD3();
  }

  public render() {
    return (
      <g className="axis" transform={`translate(${this.props.x}, 0)`}>
        <g ref={e => (this.container = e)} />
      </g>
    );
  }
}
