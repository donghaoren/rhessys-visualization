import "@mapd/connector/dist/browser-connector";
import * as d3 from "d3";
import {
  RHESSysDatabase,
  RHESSysDataFilter,
  RHESSysVariable,
  RHESSysDataGroups,
  RHESSysGranularity,
  RHESSysStats
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

export class MapDConnection implements RHESSysDatabase {
  public async queryVariables(
    table: string,
    granularity: RHESSysGranularity,
    variables: string[],
    groups?: RHESSysDataGroups,
    filter?: RHESSysDataFilter
  ): Promise<Array<Array<{ [name: string]: any; t: number }>>> {
    let selectVariables = [
      `t_${granularity} as t`,
      ...variables.map(v => `AVG(m_${v}) as m_${v}`)
    ];
    if (groups) {
      selectVariables = selectVariables.concat(
        groups.variables.map(v => `m_${v} as g_${v}`)
      );
    }
    const { results } = await this.query(`
      SELECT
        ${selectVariables.join(",")}
      FROM
        ${table}
      ${this.filterExpression(granularity, filter)}
      GROUP BY
        t_${granularity}
        ${
          groups && groups.variables.length > 0
            ? "," + groups.variables.map(v => `m_${v}`)
            : ""
        }
      ORDER BY t_${granularity}
    `);
    for (const item of results) {
      item.t = this.group_to_timestamp(item.t, granularity);
      for (const v of variables) {
        item[v] = item["m_" + v];
      }
    }
    if (groups) {
      return groups.groups.map(g =>
        results.filter(item =>
          groups.variables.every((v, i) => item["g_" + v] == g[i])
        )
      );
    } else {
      return [results];
    }
  }

  public async queryAggregatedVariables(
    table: string,
    variables: string[],
    aggregation: RHESSysGranularity,
    groups?: RHESSysDataGroups,
    filter?: RHESSysDataFilter
  ): Promise<
    Array<
      Array<{
        t: number;
        variables: {
          [name: string]: RHESSysStats;
        };
      }>
    >
  > {
    const variableExpressions = (v: string) => {
      return [
        `AVG(m_${v}) as mean_${v}`,
        `VARIANCE(m_${v}) as var_${v}`,
        `MIN(m_${v}) as min_${v}`,
        `MAX(m_${v}) as max_${v}`,
        `COUNT(m_${v}) as count_${v}`
      ];
    };
    let selectVariables = [`ty_${aggregation} as t`];
    for (const variable of variables) {
      selectVariables = selectVariables.concat(variableExpressions(variable));
    }
    if (groups) {
      selectVariables = selectVariables.concat(
        groups.variables.map(v => `m_${v} as ${v}`)
      );
    }
    const { results } = await this.query(`
      SELECT
        ${selectVariables.join(",")}
      FROM
        ${table}
      ${this.filterExpression("day", filter)}
      GROUP BY
        ty_${aggregation}
        ${
          groups && groups.variables.length > 0
            ? "," + groups.variables.map(v => `m_${v}`)
            : ""
        }
      ORDER BY ty_${aggregation}
    `);
    const mapResults = (item: any) => {
      const r = { t: item.t, variables: {} as any };
      for (const variable of variables) {
        r.variables[variable] = {
          min: item["min_" + variable],
          max: item["max_" + variable],
          mean: item["mean_" + variable],
          stdev: Math.sqrt(item["var_" + variable]),
          count: item["count_" + variable]
        };
      }
      return r;
    };
    if (groups) {
      return groups.groups.map(g =>
        results
          .filter(item => groups.variables.every((v, i) => item[v] == g[i]))
          .map(mapResults)
      );
    } else {
      return [results.map(mapResults)];
    }
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
  ): Promise<RHESSysStats> {
    const { results } = await this.query(`
      SELECT
        MIN(vv) as vmin, MAX(vv) as vmax,
        VARIANCE(vv) as vvar, AVG(vv) as vavg,
        COUNT(vv) as vcount
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
      mean: results[0].vavg,
      count: results[0].vcount
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
    if (filter) {
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
            if (item.in.length == 0) {
              parts.push("(FALSE)");
            } else {
              parts.push(
                "(" +
                  item.in.map(value => `m_${name} = '${value}'`).join(" OR ") +
                  ")"
              );
            }
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
    }
    if (parts.length > 0) {
      return "WHERE " + parts.join(" AND ");
    } else {
      return "";
    }
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
    try {
      const result = await this.session.queryAsync(query, {
        returnTiming: true
      });
      return {
        fields: result.fields as string[],
        results: result.results as any[]
      };
    } catch (e) {
      console.log("Error running query: " + query, e);
      throw e;
    }
  }
}
