import "@mapd/connector/dist/browser-connector";
import * as d3 from "d3";
import {
  RHESSysDatabase,
  RHESSysDataFilter,
  RHESSysVariable,
  RHESSysGranularity
} from "./abstract";
import {
  timestamp_to_days,
  timestamp_to_weeks,
  timestamp_to_months,
  days_to_timestamp,
  weeks_to_timestamp,
  months_to_timestamp,
  timestamp_to_years,
  years_to_timestamp
} from "../utils";

export interface MapDConnectionOptions {
  host: string;
  protocol: string;
  port: number;
  dbName: string;
  user: string;
  password: string;
}

declare let require: any;

export class MapDConnection implements RHESSysDatabase {
  public async queryScatterplot(
    table: string,
    granularity: RHESSysGranularity,
    variable1: string,
    variable2: string,
    filter?: RHESSysDataFilter
  ): Promise<Array<{ ts: number; x: number; y: number }>> {
    const variableExpression = (v: string) => {
      return `AVG(m_${v}) as ${v}`;
    };
    const { results } = await this.query(`
      SELECT
        t_${granularity} as t,
        ${variableExpression(variable1)},
        ${variableExpression(variable2)}
      FROM ${table}
      ${this.filterExpression(granularity, filter)}
      ${this.groupExpression(granularity)}
    `);
    for (const item of results) {
      item.t = this.group_to_timestamp(item.t, granularity);
    }
    return results;
  }

  public async listTables(): Promise<string[]> {
    const result = await this.session.getTablesAsync();
    return result
      .map((x: any) => x.name)
      .filter((x: string) => !x.startsWith("omnisci"));
  }

  public async listVariables(name: string): Promise<RHESSysVariable[]> {
    const result = await this.session.getFieldsAsync(name);
    const data = await fetch(require("./variables.csv"));
    const items = d3.csvParse(await data.text());
    const lookup = (name: string) => {
      for (const row of items) {
        if (row.name == name) {
          return row;
        }
      }
      return { description: "", unit: "" };
    };
    return result
      .map((r: any) => {
        if (r.name.startsWith("m_")) {
          const varName = r.name.substr(2);
          let jsType = "unknown";
          switch (r.type) {
            case "DOUBLE":
              jsType = "number";
              break;
            case "BIGINT":
              jsType = "number";
              break;
            case "STR":
              jsType = "string";
              break;
          }
          return {
            name: varName,
            type: jsType,
            description: lookup(varName).description,
            unit: lookup(varName).unit
          };
        } else {
          return null;
        }
      })
      .filter((x: any) => x != null);
  }

  public async queryTimeSeries(
    table: string,
    granularity: "year" | "month" | "week" | "day",
    variables: string[],
    filter: RHESSysDataFilter = {}
  ): Promise<any[]> {
    const variableExpression = (v: string) => {
      return `AVG(m_${v}) as ${v}`;
    };
    const { results } = await this.query(`
      SELECT t_${granularity} as t, ${variables
      .map(variableExpression)
      .join(",")}
      FROM ${table}
      ${this.filterExpression(granularity, filter)}
      ${this.groupExpression(granularity)}
    `);
    for (const item of results) {
      item.t = this.group_to_timestamp(item.t, granularity);
    }
    return results;
  }

  public async queryDistinctValues(
    table: string,
    variable: string
  ): Promise<string[]> {
    const { results } = await this.query(
      `SELECT m_${variable} as V FROM ${table} GROUP BY m_${variable}`
    );
    return results.map(x => x.V);
  }

  public async queryValueStats(
    table: string,
    variable: string,
    granularity: RHESSysGranularity
  ): Promise<{ min: number; max: number; stdev: number; mean: number }> {
    const { results } = await this.query(`
      SELECT
        MIN(vv) as vmin, MAX(vv) as vmax,
        VARIANCE(vv) as vvar, AVG(vv) as vavg
      FROM (
        SELECT
          m_${variable} as vv
        FROM ${table}
      )
    `);
    return {
      min: results[0].vmin,
      max: results[0].vmax,
      stdev: Math.sqrt(results[0].vvar),
      mean: results[0].vavg
    };
  }

  private timestamp_to_group(ts: number, granularity: RHESSysGranularity) {
    switch (granularity) {
      case "day":
        return timestamp_to_days(ts);
      case "week":
        return timestamp_to_weeks(ts);
      case "month":
        return timestamp_to_months(ts);
      case "year":
        return timestamp_to_years(ts);
    }
  }

  private group_to_timestamp(g: number, granularity: RHESSysGranularity) {
    switch (granularity) {
      case "day":
        return days_to_timestamp(g);
      case "week":
        return weeks_to_timestamp(g);
      case "month":
        return months_to_timestamp(g);
      case "year":
        return years_to_timestamp(g);
    }
  }

  private filterExpression(
    granularity: RHESSysGranularity,
    filter: RHESSysDataFilter
  ) {
    const parts = [];
    if (filter.timeStart !== undefined) {
      parts.push(
        `t_${granularity} >= ${this.timestamp_to_group(
          filter.timeStart,
          granularity
        )}`
      );
    }
    if (filter.timeEnd !== undefined) {
      parts.push(
        `t_${granularity} <= ${this.timestamp_to_group(
          filter.timeEnd,
          granularity
        )}`
      );
    }
    if (filter.attributes) {
      for (const name of Object.keys(filter.attributes)) {
        const item = filter.attributes[name];
        if (item.in) {
          parts.push(
            "(" +
              item.in.map(value => `m_${name} = '${value}'`).join(" OR ") +
              ")"
          );
        }
        if (item.within) {
          if (item.within.min !== undefined) {
            parts.push(`m_${name} >= ${item.within.min}`);
          }
          if (item.within.max !== undefined) {
            parts.push(`m_${name} <= ${item.within.max}`);
          }
        }
      }
    }
    if (parts.length > 0) {
      return "WHERE " + parts.join(" AND ");
    } else {
      return "";
    }
  }

  private groupExpression(granularity: string) {
    return `
      GROUP BY t_${granularity}
      ORDER BY t_${granularity}
    `;
  }

  private session: any;

  public async connect(options: MapDConnectionOptions) {
    const connector = new (window as any).MapdCon();
    const connection = connector
      .host(options.host)
      .protocol(options.protocol)
      .port(options.port)
      .dbName(options.dbName)
      .user(options.user)
      .password(options.password);

    this.session = await connection.connectAsync();
  }

  private async query(query: string) {
    const result = await this.session.queryAsync(query, { returnTiming: true });
    return {
      fields: result.fields as string[],
      results: result.results as any[]
    };
  }
}
