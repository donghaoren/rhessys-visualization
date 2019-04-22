import * as React from "react";
import * as d3 from "d3";
import { RHESSysDataFilter } from "../database/abstract";
import { HTMLSelect } from "@blueprintjs/core";

export interface DashboardGroup {
  filter: RHESSysDataFilter;
  color: string;
}

export interface GroupsEditorProps {
  groups: DashboardGroup[];
  onChange?: (newGroups: DashboardGroup[]) => void;
}

export interface GroupsEditorState {}

const kColors = d3.schemeSet1;
const kColorsSequential = [
  d3.schemeCategory10[1],
  d3.schemeCategory10[2],
  d3.schemeCategory10[0]
];

function createFacets(
  attribute: string,
  values: string[],
  isSequential: boolean
) {
  return values.map((val, index) => {
    const attributes: { [name: string]: any } = {};
    attributes[attribute] = { in: [val] };
    return {
      filter: {
        attributes
      },
      color: isSequential ? kColorsSequential[index] : kColors[index]
    };
  });
}

export const kOptions = [
  {
    name: "Veg",
    groups: createFacets("veg", ["chap", "oak", "tgrass", "tgrass_irr"], false)
  },
  { name: "EIA", groups: createFacets("EIA", ["low", "med", "high"], true) },
  { name: "TIA", groups: createFacets("TIA", ["LOW", "MED", "HIGH"], true) },
  { name: "All", groups: [{ filter: {}, color: "#000000" }] }
];

function filterToText(filter: RHESSysDataFilter) {
  const items: string[] = [];
  if (filter.attributes) {
    for (const attr of Object.keys(filter.attributes)) {
      if (filter.attributes[attr].in) {
        items.push(attr + " = " + filter.attributes[attr].in.join(","));
      }
    }
  }
  return items.join("; ");
}

export class GroupsEditor extends React.Component<
  GroupsEditorProps,
  GroupsEditorState
> {
  public render() {
    let currentOption = null;
    for (const option of kOptions) {
      if (JSON.stringify(option.groups) == JSON.stringify(this.props.groups)) {
        currentOption = option.name;
      }
    }
    return (
      <div className="group-editor">
        <HTMLSelect
          value={currentOption}
          onChange={e => {
            const opt = kOptions.filter(x => x.name == e.target.value);
            if (opt.length == 1) {
              if (this.props.onChange) {
                this.props.onChange(opt[0].groups);
              }
            }
          }}
        >
          {kOptions.map(option => (
            <option key={option.name} value={option.name}>
              {option.name}
            </option>
          ))}
        </HTMLSelect>
        {this.props.groups.map((g, index) => (
          <div className="group-editor-group" key={index}>
            <div className="el-color" style={{ backgroundColor: g.color }} />
            <div className="el-filter">{filterToText(g.filter)}</div>
          </div>
        ))}
      </div>
    );
  }
}
