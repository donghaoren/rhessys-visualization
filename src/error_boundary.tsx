import * as React from "react";
import { Button } from "@blueprintjs/core";

export class ErrorBoundary extends React.Component<
  { className?: string },
  { hasError: boolean }
> {
  public state = { hasError: false };

  public static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: any, info: any) {
    // You can also log the error to an error reporting service
    console.log(error);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className={this.props.className}>
          Something went wrong here.{" "}
          <Button
            text="Try again"
            onClick={() => this.setState({ hasError: false })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
