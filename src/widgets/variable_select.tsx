import * as React from "react";
import { Button, MenuItem } from "@blueprintjs/core";
import { IItemRendererProps, Select } from "@blueprintjs/select";
import { RHESSysVariable } from "../database/abstract";

const VariableSelectM = Select.ofType<RHESSysVariable>();

export interface VariableSelectProps {
  list: RHESSysVariable[];
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}
export interface VariableSelectState {
  activeItem: RHESSysVariable;
}
export class VariableSelect extends React.Component<
  VariableSelectProps,
  VariableSelectState
> {
  public state: VariableSelectState = {
    activeItem: null
  };
  public getItem(name: string) {
    for (const item of this.props.list) {
      if (item.name == name) {
        return item;
      }
    }
    return null;
  }
  public itemRenderer = (
    item: RHESSysVariable,
    itemProps: IItemRendererProps
  ) => {
    const modifiers = itemProps.modifiers;
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        key={item.name}
        label={
          (item.description ? item.description : "") +
          (item.unit ? " (" + item.unit + ")" : "")
        }
        onClick={itemProps.handleClick}
        text={item.name}
      />
    );
  };
  public itemPredicate = (query: string, item: RHESSysVariable) => {
    return (
      item.name.toLowerCase().indexOf(query.toLowerCase()) >= 0 ||
      item.description.toLowerCase().indexOf(query.toLowerCase()) >= 0
    );
  };
  public handleItemSelect = (item: RHESSysVariable) => {
    if (this.props.onChange) {
      this.props.onChange(item.name);
    }
  };
  public handleActiveItemChange = (item: RHESSysVariable) => {
    this.setState({
      activeItem: item
    });
  };
  public render() {
    const item = this.getItem(this.props.value);
    const currentDescription = item
      ? item.name +
        (item.description ? " - " + item.description : "") +
        (item.unit ? " (" + item.unit + ")" : "")
      : this.props.placeholder || "none";
    return (
      <VariableSelectM
        activeItem={this.state.activeItem}
        onActiveItemChange={this.handleActiveItemChange}
        items={this.props.list}
        itemRenderer={this.itemRenderer}
        itemPredicate={this.itemPredicate}
        noResults={<MenuItem disabled={true} text="No results." />}
        onItemSelect={this.handleItemSelect}
      >
        <Button text={currentDescription} rightIcon="double-caret-vertical" />
      </VariableSelectM>
    );
  }
}
