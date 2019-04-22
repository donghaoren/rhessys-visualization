import * as d3 from "d3";

const timeParser = d3.utcParse("%Y-%m-%d");
const timeFormatter = d3.utcFormat("%Y-%m-%d");
const timeOffset = timeParser("1970-01-01").getTime();

export const parseTime = (t: string) =>
  (timeParser(t).getTime() - timeOffset) / 1000;

export function timestamp_to_days(ts: number) {
  return Math.floor(ts / 86400);
}

export function days_to_timestamp(days: number) {
  return days * 86400;
}

export function timestamp_to_weeks(ts: number) {
  return Math.floor(Math.floor(ts / 86400) / 7);
}

export function weeks_to_timestamp(weeks: number) {
  return weeks * (86400 * 7);
}

export function timestamp_to_months(ts: number) {
  const date = new Date(timeOffset + ts * 1000);
  const mIndex = date.getUTCFullYear() * 12 + date.getUTCMonth() + 1;
  return mIndex - (1970 * 12 + 1) + 1;
}

export function months_to_timestamp(months: number) {
  let year = 1970;
  let month = months;
  const dY = Math.floor(month / 12);
  year += dY;
  month -= 12 * dY;
  return parseTime(year + "-" + month + "-01");
}

export function timestamp_to_years(ts: number) {
  const date = new Date(timeOffset + ts * 1000);
  return date.getUTCFullYear();
}

export function years_to_timestamp(year: number) {
  return parseTime(year + "-01-01");
}

export function timestamp_to_string(ts: number) {
  return timeFormatter(new Date(timeOffset + ts * 1000));
}
