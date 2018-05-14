// @flow

import type { AppState } from './redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';

import React from 'react';
import { StatusBar } from 'react-native';
import PropTypes from 'prop-types';

import { globalLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { connect } from 'lib/utils/redux-utils';

type InjectedProps = {
  globalLoadingStatus: LoadingStatus,
};
type OwnProps = {
  barStyle?: "light-content" | "dark-content",
  animated?: bool,
};
class ConnectedStatusBar extends React.PureComponent<InjectedProps & OwnProps> {

  static propTypes = {
    globalLoadingStatus: PropTypes.string.isRequired,
  };

  render() {
    const fetchingSomething = this.props.globalLoadingStatus === "loading";
    return (
      <StatusBar
        {...this.props}
        networkActivityIndicatorVisible={fetchingSomething}
      />
    );
  }

}

export default connect((state: AppState): InjectedProps => ({
  globalLoadingStatus: globalLoadingStatusSelector(state),
}))(ConnectedStatusBar);
