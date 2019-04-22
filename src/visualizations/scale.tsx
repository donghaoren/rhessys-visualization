import * as d3 from "d3";

export interface ScaleNumerical {
  domainMin: number;
  domainMax: number;
  log?: boolean;
}

export function getD3Scale(scale: ScaleNumerical) {
  if (scale.log) {
    return d3.scaleLog().domain([scale.domainMin, scale.domainMax]);
  } else {
    return d3.scaleLinear().domain([scale.domainMin, scale.domainMax]);
  }
}
