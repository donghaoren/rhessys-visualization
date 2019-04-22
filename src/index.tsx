import * as React from "react";
import * as ReactDOM from "react-dom";
import "../node_modules/normalize.css/normalize.css";
import "../node_modules/@blueprintjs/core/lib/css/blueprint.css";
import "../node_modules/@blueprintjs/icons/lib/css/blueprint-icons.css";
import "../node_modules/@blueprintjs/select/lib/css/blueprint-select.css";
import "./styles.scss";
import "@babel/polyfill";
import { MapDConnection } from "./database/mapd";
import { RHESSysDatabase } from "./database/abstract";
import { Dashboard } from "./dashboard";

import config from "../config";

interface AppProps {
  db: RHESSysDatabase;
}

interface AppState {
  tables: string[];
  currentTable: string;
}

class App extends React.Component<AppProps, AppState> {
  public state: AppState = { tables: [], currentTable: null };
  public componentDidMount() {
    this.props.db
      .listTables()
      .then(tables => this.setState({ tables, currentTable: tables[0] }));
  }
  public render() {
    return (
      <div className="app-container">
        {this.state.currentTable ? (
          <Dashboard
            key={this.state.currentTable}
            db={this.props.db}
            table={this.state.currentTable}
          />
        ) : null}
      </div>
    );
  }
}

ReactDOM.render(
  <div>Connecting to Database...</div>,
  document.getElementById("app")
);

const connection = new MapDConnection();
connection.connect(config.db).then(() => {
  ReactDOM.render(<App db={connection} />, document.getElementById("app"));
});
