import * as React from "react";
import * as d3 from "d3";

export interface BrushXProps {
  y1: number;
  y2: number;
  valueMin: number;
  valueMax: number;
  scale: d3.ScaleContinuousNumeric<number, number>;
  onBrush?: (valueMin: number, valueMax: number) => void;
  onHover?: (t: number) => void;
}

export class BrushX extends React.Component<BrushXProps> {
  public container: SVGGElement;
  public bgRect: SVGRectElement;
  public brush: d3.BrushBehavior<{}>;

  private emit(p1: number, p2: number, keepDistance: boolean = false) {
    const [min, max] = this.props.scale.domain();
    if (keepDistance) {
      if (p1 > p2) {
        [p1, p2] = [p2, p1];
      }
      const dist = p2 - p1;
      if (p1 < min) {
        p1 = min;
        p2 = min + dist;
      }
      if (p2 > max) {
        p2 = max;
        p1 = max - dist;
      }
      this.props.onBrush(p1, p2);
    } else {
      p1 = Math.max(min, Math.min(max, p1));
      p2 = Math.max(min, Math.min(max, p2));
      if (p1 < p2) {
        this.props.onBrush(p1, p2);
      } else {
        this.props.onBrush(p2, p1);
      }
    }
  }

  public handleMouseDown = (
    e: React.MouseEvent<SVGElement>,
    side: "min" | "max" | "both"
  ) => {
    const x0 = e.pageX;
    const min0 = this.props.scale(this.props.valueMin);
    const max0 = this.props.scale(this.props.valueMax);
    const onBrush = this.props.onBrush;
    if (!onBrush) {
      return;
    }
    const onMouseMove = (eMove: MouseEvent) => {
      const x1 = eMove.pageX;
      const dx = x1 - x0;
      const min1 =
        side == "min" || side == "both"
          ? this.props.scale.invert(min0 + dx)
          : this.props.scale.invert(min0);
      const max1 =
        side == "max" || side == "both"
          ? this.props.scale.invert(max0 + dx)
          : this.props.scale.invert(max0);
      this.emit(min1, max1, side == "both");
    };
    const onMouseUp = (eUp: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  public handleRectMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
    this.handleMouseDown(e, "both");
  };

  public handleLineMouseDownMin = (e: React.MouseEvent<SVGLineElement>) => {
    this.handleMouseDown(e, "min");
  };

  public handleLineMouseDownMax = (e: React.MouseEvent<SVGLineElement>) => {
    this.handleMouseDown(e, "max");
  };

  public getValueFromPageX(pageX: number) {
    const xOffset =
      this.bgRect.getBoundingClientRect().left -
      Math.min(...this.props.scale.range());
    return this.props.scale.invert(pageX - xOffset);
  }

  public handleFreespaceMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
    const x0 = e.pageX;
    const onMouseMove = (eMove: MouseEvent) => {
      const x1 = eMove.pageX;
      const xMin = this.getValueFromPageX(x0);
      const xMax = this.getValueFromPageX(x1);
      this.emit(xMin, xMax);
    };
    const onMouseUp = (eUp: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  public handleWheel = (e: React.WheelEvent<SVGRectElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dy = e.deltaY;
    let p1 = this.props.scale(this.props.valueMin);
    let p2 = this.props.scale(this.props.valueMax);
    let mid = this.props.scale(this.getValueFromPageX(e.pageX));
    mid =
      p1 < p2
        ? Math.max(p1, Math.min(p2, mid))
        : Math.max(p2, Math.min(p1, mid));
    const factor = Math.exp(dy / 400);
    p1 = (p1 - mid) * factor + mid;
    p2 = (p2 - mid) * factor + mid;
    const min1 = this.props.scale.invert(p1);
    const max1 = this.props.scale.invert(p2);
    this.props.onBrush(Math.min(min1, max1), Math.max(min1, max1));
    return false;
  };

  public handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (this.props.onHover) {
      const value = this.getValueFromPageX(e.pageX);
      this.props.onHover(value);
    }
  };

  public render() {
    const { valueMin, valueMax, scale, y1, y2 } = this.props;
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);
    return (
      <g className="axis">
        <rect
          x={Math.min(...scale.range())}
          width={Math.abs(scale.range()[1] - scale.range()[0])}
          y={yMin}
          height={yMax - yMin}
          style={{
            stroke: "none",
            strokeWidth: 0,
            fill: "none",
            cursor: "crosshair",
            pointerEvents: "all"
          }}
          ref={e => (this.bgRect = e)}
          onMouseDown={this.handleFreespaceMouseDown}
          onMouseMove={this.props.onHover ? this.handleMouseMove : null}
        />
        <rect
          style={{
            stroke: "rgba(0, 0, 0, 0.2)",
            fill: "rgba(0, 0, 0, 0.1)",
            cursor: "move",
            pointerEvents: "all",
            shapeRendering: "crispEdges"
          }}
          x={Math.min(scale(valueMin), scale(valueMax))}
          width={Math.abs(scale(valueMax) - scale(valueMin))}
          y={yMin}
          height={yMax - yMin}
          onMouseDown={this.handleRectMouseDown}
          onMouseMove={this.props.onHover ? this.handleMouseMove : null}
        />
        <line
          x1={scale(valueMin)}
          x2={scale(valueMin)}
          y1={yMin}
          y2={yMax}
          style={{
            stroke: "none",
            strokeWidth: 5,
            fill: "none",
            pointerEvents: "stroke",
            cursor: "ew-resize"
          }}
          onMouseDown={this.handleLineMouseDownMin}
          onMouseMove={this.props.onHover ? this.handleMouseMove : null}
        />
        <line
          x1={scale(valueMax)}
          x2={scale(valueMax)}
          y1={Math.min(y1, y2)}
          y2={Math.max(y1, y2)}
          style={{
            stroke: "none",
            strokeWidth: 5,
            fill: "none",
            pointerEvents: "stroke",
            cursor: "ew-resize"
          }}
          onMouseDown={this.handleLineMouseDownMax}
          onMouseMove={this.props.onHover ? this.handleMouseMove : null}
        />
      </g>
    );
  }
}

export interface PanXProps {
  y1: number;
  y2: number;
  scale: d3.ScaleContinuousNumeric<number, number>;
  onBrush?: (valueMin: number, valueMax: number) => void;
  onHover?: (t: number) => void;
}

export class PanX extends React.Component<PanXProps> {
  public container: SVGGElement;
  public bgRect: SVGRectElement;
  public brush: d3.BrushBehavior<{}>;

  public getValueFromPageX(pageX: number) {
    const xOffset =
      this.bgRect.getBoundingClientRect().left -
      Math.min(...this.props.scale.range());
    return this.props.scale.invert(pageX - xOffset);
  }

  public handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    const x0 = e.pageX;
    const scale = this.props.scale;
    const min0 = scale.range()[0];
    const max0 = scale.range()[1];
    const onBrush = this.props.onBrush;
    if (!onBrush) {
      return;
    }
    const onMouseMove = (eMove: MouseEvent) => {
      const x1 = eMove.pageX;
      const dx = x1 - x0;
      const min1 = scale.invert(min0 - dx);
      const max1 = scale.invert(max0 - dx);
      onBrush(Math.min(min1, max1), Math.max(min1, max1));
    };
    const onMouseUp = (eUp: MouseEvent) => {
      onMouseMove(eUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  public handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (this.props.onHover) {
      const value = this.getValueFromPageX(e.pageX);
      this.props.onHover(value);
    }
  };

  public render() {
    const { scale, y1, y2 } = this.props;
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);
    const [valueMin, valueMax] = scale.range();
    return (
      <g className="axis">
        <rect
          x={Math.min(valueMin, valueMax)}
          width={Math.abs(valueMax - valueMin)}
          y={yMin}
          height={yMax - yMin}
          style={{
            stroke: "none",
            strokeWidth: 0,
            fill: "none",
            cursor: "crosshair",
            pointerEvents: "all"
          }}
          ref={e => (this.bgRect = e)}
          onMouseDown={this.handleMouseDown}
          onMouseMove={this.props.onHover ? this.handleMouseMove : null}
        />
      </g>
    );
  }
}
