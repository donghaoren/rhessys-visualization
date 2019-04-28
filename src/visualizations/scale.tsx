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

export function nice(scale: ScaleNumerical, enable: boolean = true) {
  if (!enable) {
    return scale;
  }
  const ns = d3
    .scaleLinear()
    .domain([scale.domainMin, scale.domainMax])
    .nice();
  return { domainMin: ns.domain()[0], domainMax: ns.domain()[1], log: false };
}

export function autoScale(
  stat: {
    min: number;
    max: number;
    stdev: number;
    mean: number;
  },
  niceEnable: boolean = true
) {
  if (stat.min == stat.max) {
    return { domainMin: stat.min - 1, domainMax: stat.min + 1 };
  }
  if (stat.min < 0) {
    return nice(
      {
        domainMin: -stat.stdev * 5,
        domainMax: +stat.stdev * 5,
        log: false
      },
      niceEnable
    );
  } else {
    if (stat.mean > stat.stdev * 10) {
      return nice(
        {
          domainMin: stat.mean - stat.stdev * 5,
          domainMax: stat.mean + stat.stdev * 5,
          log: false
        },
        niceEnable
      );
    } else {
      return nice(
        {
          domainMin: 0,
          domainMax: stat.mean + stat.stdev * 5,
          log: false
        },
        niceEnable
      );
    }
  }
}

export function autoScaleConservative(
  stat: {
    min: number;
    max: number;
    stdev: number;
    mean: number;
  },
  niceEnable: boolean = true
) {
  if (stat.min == stat.max) {
    return { domainMin: stat.min - 1, domainMax: stat.min + 1 };
  }
  if (stat.min < 0) {
    const range = Math.max(Math.abs(stat.min), Math.abs(stat.max));
    return nice(
      { domainMax: range, domainMin: -range, log: false },
      niceEnable
    );
  } else {
    if (stat.min - 5 * stat.stdev > 0) {
      return nice(
        { domainMax: stat.max, domainMin: stat.min, log: false },
        niceEnable
      );
    } else {
      return nice(
        { domainMax: stat.max, domainMin: 0, log: false },
        niceEnable
      );
    }
  }
}
