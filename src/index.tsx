import * as React from "react";
import * as ReactDOM from "react-dom";
import { MapDConnection } from "./database/mapd";
import { VisibleDashboard } from "./dashboard/dashboard";
import { Provider } from "react-redux";

import config from "../config";
import { createDefaultDashboardState } from "./dashboard/state";

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
import { DatasetSelector } from "./dataset_selector";
import { Spinner } from "@blueprintjs/core";

ReactDOM.render(
  <div className="dataset-selector">
    <p>Connecting to Database...</p>
    <Spinner />
  </div>,
  document.getElementById("app")
);

const connection = new MapDConnection();
connection
  .connect(config.db)
  .then(async () => {
    ReactDOM.render(
      <DatasetSelector
        db={connection}
        onLoad={async config => {
          const state = await createDefaultDashboardState(
            connection,
            config.table,
            config.config
          );
          const store = createStore(reducer, state);
          ReactDOM.render(
            <Provider store={store}>
              <VisibleDashboard />
            </Provider>,
            document.getElementById("app")
          );
        }}
      />,
      document.getElementById("app")
    );
  })
  .catch(() => {
    ReactDOM.render(
      <div className="dataset-selector">
        <p>Failed to connect to database!</p>
      </div>,
      document.getElementById("app")
    );
  });
