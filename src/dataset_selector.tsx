import * as React from "react";
import { RHESSysDatabase } from "./database/abstract";
import { DashboardConfig } from "./dashboard/state";
import { Card, Button, Elevation, Spinner } from "@blueprintjs/core";

export interface DatasetSelectorProps {
  db: RHESSysDatabase;
  onLoad: (config: DatasetConfig) => void;
}
export interface DatasetSelectorState {
  configs?: DatasetConfig[];
}

export interface DatasetConfig {
  name: string;
  description: string;
  table: string;

  config: DashboardConfig;
}

export class DatasetSelector extends React.Component<
  DatasetSelectorProps,
  DatasetSelectorState
> {
  public state: DatasetSelectorState = {};
  public componentDidMount() {
    this.getDatasetConfigs().then(configs => {
      this.setState({ configs });
    });
  }
  public async getDatasetConfigs(): Promise<DatasetConfig[]> {
    return [
      {
        name: "allscen_40basindaily",
        table: "allscen_40basindaily",
        description: "Rachael's initial dataset",
        config: {
          timeStart: "1970-01-01",
          timeEnd: "2020-01-01",
          defaultVariable: "precip",
          factors: [
            {
              name: "veg",
              levels: ["chap", "oak", "tgrass", "tgrass_irr"],
              kind: "nominal"
            },
            { name: "EIA", levels: ["low", "med", "high"], kind: "ordinal" },
            { name: "TIA", levels: ["LOW", "MED", "HIGH"], kind: "ordinal" }
          ],
          palettes: [
            {
              kind: "nominal",
              colors: [
                "#1f77b4",
                "#ff7f0e",
                "#2ca02c",
                "#d62728",
                "#9467bd",
                "#8c564b",
                "#e377c2",
                "#7f7f7f",
                "#bcbd22",
                "#17becf"
              ]
            },
            { kind: "ordinal", colors: ["#2F69A2", "#B75699", "#F05656"] }
          ]
        }
      },
      {
        name: "base_basin",
        table: "base_basin",
        description: "base_basin.daily, base_grow_basin.daily",
        config: {
          timeStart: "1980-01-01",
          timeEnd: "2012-01-01",
          defaultVariable: "precip",
          factors: [],
          palettes: [
            {
              kind: "nominal",
              colors: [
                "#1f77b4",
                "#ff7f0e",
                "#2ca02c",
                "#d62728",
                "#9467bd",
                "#8c564b",
                "#e377c2",
                "#7f7f7f",
                "#bcbd22",
                "#17becf"
              ]
            },
            { kind: "ordinal", colors: ["#2F69A2", "#B75699", "#F05656"] }
          ]
        }
      },
      {
        name: "p301_multiscale_test_pdpdg",
        table: "p301_multiscale_test_pdpdg",
        description: "Will's test dataset",
        config: {
          timeStart: "1941-01-01",
          timeEnd: "2007-01-01",
          defaultVariable: "evap",
          factors: [],
          palettes: [
            {
              kind: "nominal",
              colors: [
                "#1f77b4",
                "#ff7f0e",
                "#2ca02c",
                "#d62728",
                "#9467bd",
                "#8c564b",
                "#e377c2",
                "#7f7f7f",
                "#bcbd22",
                "#17becf"
              ]
            },
            { kind: "ordinal", colors: ["#2F69A2", "#B75699", "#F05656"] }
          ]
        }
      }
    ];
  }

  public render() {
    return (
      <div className="dataset-selector">
        <h1>Select Dataset to Visualize</h1>
        {this.state.configs ? (
          this.state.configs.map(config => (
            <Card
              interactive={true}
              elevation={Elevation.ONE}
              onClick={() => {
                this.props.onLoad(config);
              }}
            >
              <h3>{config.name}</h3>
              <p>{config.description}</p>
            </Card>
          ))
        ) : (
          <Spinner />
        )}
      </div>
    );
  }
}
