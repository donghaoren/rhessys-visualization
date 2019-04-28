import * as React from "react";
import { HTMLSelect } from "@blueprintjs/core";

export function createEnumSelect<ValueType = string>(
  options: ValueType[],
  labels?: string[]
) {
  class EnumSelect extends React.Component<{
    value: ValueType;
    onChange?: (value: ValueType) => void;
  }> {
    public handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (this.props.onChange) {
        this.props.onChange((e.target.value as any) as ValueType);
      }
    };
    public render() {
      return (
        <HTMLSelect
          onChange={this.handleChange}
          value={this.props.value.toString()}
        >
          {options.map((option, index) => (
            <option key={option.toString()} value={option.toString()}>
              {labels ? labels[index] : option.toString()}
            </option>
          ))}
        </HTMLSelect>
      );
    }
  }
  return EnumSelect;
}
