import * as React from "react";
import * as ReactDOM from "react-dom";
import { MapDConnection } from "./database/mapd";
import { RHESSysDatabase } from "./database/abstract";
import { DashboardView, VisibleDashboard } from "./dashboard/dashboard";
import { Provider, connect } from "react-redux";

import config from "../config";
import { DashboardState, createDefaultDashboardState } from "./dashboard/state";

// Include stylesheets from libraries
import "../node_modules/normalize.css/normalize.css";
import "../node_modules/@blueprintjs/core/lib/css/blueprint.css";
import "../node_modules/@blueprintjs/icons/lib/css/blueprint-icons.css";
import "../node_modules/@blueprintjs/select/lib/css/blueprint-select.css";

// Include our stylesheets
import "./styles.scss";

// Include babel polyfill library
import "@babel/polyfill";
import { createStore } from "redux";
import { reducer } from "./dashboard/reducers";

// interface AppProps {
//   db: RHESSysDatabase;
// }

// interface AppState {
//   tables: string[];
//   currentStore: DashboardStore;
// }

// class App extends React.Component<AppProps, AppState> {
//   public state: AppState = { tables: [], currentStore: null };
//   public componentDidMount() {
//     this.props.db.listTables().then(tables =>
//       this.setState({
//         tables,
//         currentStore: new DashboardStore(this.props.db, tables[0])
//       })
//     );
//   }
//   public render() {
//     return (
//       <div className="app-container">
//         {this.state.currentStore ? (
//           <DashboardContext.Provider value={{ store: this.state.currentStore }}>
//             <Dashboard />
//           </DashboardContext.Provider>
//         ) : null}
//       </div>
//     );
//   }
// }

ReactDOM.render(
  <div>Connecting to Database...</div>,
  document.getElementById("app")
);

const connection = new MapDConnection();
connection.connect(config.db).then(async () => {
  const tables = await connection.listTables();
  const state = await createDefaultDashboardState(connection, tables[0], {
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
  });
  console.log(state);
  const store = createStore(reducer, state);
  console.log(store.getState());

  ReactDOM.render(
    <Provider store={store}>
      <VisibleDashboard />
    </Provider>,
    document.getElementById("app")
  );
});
