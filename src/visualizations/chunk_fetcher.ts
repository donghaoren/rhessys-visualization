import {
  RHESSysGranularity,
  RHESSysDataFilter,
  RHESSysDataGroups,
  RHESSysDatabase
} from "../database/abstract";
import { EventEmitter } from "fbemitter";
import { deepEquals } from "../utils";

export interface ChunkDataGroup {
  /** The start time for each time group */
  t: Float64Array;
  /** The data for each variable */
  [name: string]: Float64Array;
}

export interface ChunkData {
  id: string;
  timeStart: number;
  timeEnd: number;
  groups: ChunkDataGroup[];
}

/** Fetch data by chunk */
export class ChunkFetcher extends EventEmitter {
  constructor(
    public readonly db: RHESSysDatabase,
    public readonly table: string
  ) {
    super();
  }

  public filter: RHESSysDataFilter = null;
  public granularity: RHESSysGranularity = "day";
  public groups: RHESSysDataGroups = { groups: [[]], variables: [] };
  public variables: string[] = [];

  public setVariables(variables: string[]) {
    if (!deepEquals(this.variables, variables)) {
      this.clear();
      this.variables = variables;
    }
  }

  public setGroups(groups: RHESSysDataGroups) {
    if (!deepEquals(this.groups, groups)) {
      this.clear();
      this.groups = groups;
    }
  }

  public setFilter(filter: RHESSysDataFilter) {
    if (!deepEquals(this.filter, filter)) {
      this.clear();
      this.filter = filter;
    }
  }

  public setGranularity(granularity: RHESSysGranularity) {
    if (granularity != this.granularity) {
      this.clear();
      this.granularity = granularity;
    }
  }

  protected chunkCache = new Map<string, ChunkData>();
  protected chunkRequested = new Set<string>();
  protected generation: number = 0;

  public getChunkID(timeStart: number, timeEnd: number) {
    return timeStart + "::" + timeEnd;
  }

  public clear() {
    this.chunkCache.clear();
    this.chunkRequested.clear();
    this.generation += 1;
  }

  protected async fetchChunk(
    timeStart: number,
    timeEnd: number
  ): Promise<boolean> {
    const id = this.getChunkID(timeStart, timeEnd);
    if (this.chunkCache.has(id)) {
      return false;
    }
    if (this.chunkRequested.has(id)) {
      return false;
    }
    // Mark the chunk as requested, so we won't fetch it again
    this.chunkRequested.add(id);
    // Keep the current generation
    const gen = this.generation;
    // Now start fetch data from server
    const data = await this.db.queryVariables(
      this.table,
      this.granularity,
      this.variables,
      this.groups,
      {
        ...this.filter,
        timeStart,
        timeEnd
      }
    );
    // If the generation is newer, discard the result
    if (this.generation != gen) {
      return false;
    }
    // Convert the chunk data and put it into chunkCache
    const arrays = this.groups.groups.map((g, i) => {
      const r: ChunkDataGroup = {
        t: new Float64Array(data[i].map(x => x.t))
      };
      for (const variable of this.variables) {
        const array = new Float64Array(data[i].map(x => x[variable]));
        r[variable] = array;
      }
      return r;
    });
    this.chunkCache.set(timeStart + "::" + timeEnd, {
      id,
      timeStart,
      timeEnd,
      groups: arrays
    });
    return true;
  }

  /** Call this in componentDidMount and componentDidUpdate */
  public async request(timeStart: number, timeEnd: number) {
    // Prepare the ranges to fetch based on granularity
    const chunkLength = 2000;
    let rangeSize = 86400 * 365;
    if (this.granularity == "year") {
      rangeSize = 86400 * 365 * chunkLength;
    }
    if (this.granularity == "month") {
      rangeSize = 86400 * 30 * chunkLength;
    }
    if (this.granularity == "week") {
      rangeSize = 86400 * 7 * chunkLength;
    }
    if (this.granularity == "day") {
      rangeSize = 86400 * chunkLength;
    }
    const range1 = Math.floor(timeStart / rangeSize);
    const range2 = Math.ceil(timeEnd / rangeSize);
    const chunks: Array<[number, number]> = [];

    // Prepare the chunks to fetch
    for (let i = range1; i <= range2; i++) {
      chunks.push([i * rangeSize, i * rangeSize + rangeSize]);
    }
    // Issue all queries at once
    const results = await Promise.all(
      chunks.map(chunk => this.fetchChunk(chunk[0], chunk[1]))
    );
    // If any fetch returned true, call update
    if (results.some(x => x)) {
      this.emit("update");
    }
  }

  /** Call this in the render method */
  public getChunks(timeStart: number, timeEnd: number): ChunkData[] {
    const r: ChunkData[] = [];
    for (const chunk of this.chunkCache.values()) {
      if (chunk.timeStart > timeEnd || chunk.timeEnd < timeStart) {
        continue;
      }
      r.push(chunk);
    }
    return r.sort((a, b) => a.timeStart - b.timeStart);
  }
}
