import * as React from "react";
import {
  NumericInput,
  Button,
  Switch,
  InputGroup,
  FormGroup
} from "@blueprintjs/core";
import { ScaleNumerical } from "../visualizations/scale";

export interface ScaleEditorProps {
  defaultScale: ScaleNumerical;
  onChange: (newScale: ScaleNumerical) => void;
}

export interface ScaleEditorState {
  domainMin: string;
  domainMax: string;
  log?: boolean;
}

export class ScaleEditor extends React.Component<
  ScaleEditorProps,
  ScaleEditorState
> {
  public state: ScaleEditorState = {
    domainMin: this.props.defaultScale.domainMin.toString(),
    domainMax: this.props.defaultScale.domainMax.toString(),
    log: this.props.defaultScale.log
  };
  public render() {
    return (
      <div className="scale-editor">
        <FormGroup label="Domain Min">
          <InputGroup
            value={this.state.domainMin}
            onChange={e => {
              this.setState({ domainMin: e.target.value });
            }}
          />
        </FormGroup>
        <FormGroup label="Domain Max">
          <InputGroup
            value={this.state.domainMax}
            onChange={e => {
              this.setState({ domainMax: e.target.value });
            }}
          />
        </FormGroup>
        <Switch
          checked={this.state.log}
          label="log"
          onChange={e => {
            this.setState({ log: (e.target as any).checked });
          }}
        />
        <Button
          text="Confirm"
          onClick={() => {
            if (
              !isNaN(+this.state.domainMin) &&
              !isNaN(+this.state.domainMax)
            ) {
              this.props.onChange({
                domainMin: +this.state.domainMin,
                domainMax: +this.state.domainMax,
                log: this.state.log
              });
            }
          }}
        />
      </div>
    );
  }
}
