// @flow

import * as React from 'react';

import type { ErrorInfo, ErrorData } from 'lib/types/report-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import css from './error-boundary.css';
import { getVersionUnsupportedError } from './utils/version-utils.js';

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
      const versionUnsupportedError = this.state.errorData.find(e => {
        const messageForException = getMessageForException(e.error);
        return (
          messageForException === 'client_version_unsupported' ||
          messageForException === 'unsupported_version'
        );
      });

      let message = 'Something has gone wrong, please reload the page';
      if (versionUnsupportedError) {
        message = getVersionUnsupportedError();
      }

      return (
        <div className={css.container}>
          <h3>{message}</h3>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
