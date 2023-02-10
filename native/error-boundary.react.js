// @flow

import * as React from 'react';

import type { ErrorInfo, ErrorData } from 'lib/types/report-types.js';

import Crash from './crash.react.js';

let instance: ?ErrorBoundary = null;
const defaultHandler = global.ErrorUtils.getGlobalHandler();
global.ErrorUtils.setGlobalHandler(error => {
  defaultHandler(error);
  if (instance) {
    instance.reportError(error);
  }
});

type Props = {
  +children: React.Node,
};
type State = {
  +errorData: $ReadOnlyArray<ErrorData>,
};
class ErrorBoundary extends React.PureComponent<Props, State> {
  state: State = {
    errorData: [],
  };

  componentDidMount() {
    instance = this;
  }

  componentWillUnmount() {
    instance = null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState(prevState => ({
      errorData: [...prevState.errorData, { error, info }],
    }));
  }

  reportError(error: Error) {
    this.setState(prevState => ({
      errorData: [...prevState.errorData, { error }],
    }));
  }

  render(): React.Node {
    if (this.state.errorData.length > 0) {
      return <Crash errorData={this.state.errorData} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
