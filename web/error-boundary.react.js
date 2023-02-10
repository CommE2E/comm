// @flow

import * as React from 'react';

import type { ErrorInfo, ErrorData } from 'lib/types/report-types.js';

import css from './error-boundary.css';

type Props = {
  +children: React.Node,
};

type State = {
  +errorData: $ReadOnlyArray<ErrorData>,
  +showError: boolean,
};

class ErrorBoundary extends React.PureComponent<Props, State> {
  state: State = {
    errorData: [],
    showError: false,
  };

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState(prevState => ({
      errorData: [...prevState.errorData, { error, info }],
    }));
  }

  render(): React.Node {
    if (this.state.errorData.length > 0) {
      return (
        <div className={css.container}>
          <h3>Something has gone wrong, please reload the page</h3>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
