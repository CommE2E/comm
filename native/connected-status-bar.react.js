// @flow

import type { AppState } from './redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';

import React from 'react';
import { connect } from 'react-redux';
import { StatusBar } from 'react-native';

import { globalLoadingStatusSelector } from 'lib/selectors/loading-selectors';

class ConnectedStatusBar extends React.PureComponent {

  props: Object;
  static propTypes = {
    globalLoadingStatus: React.PropTypes.string.isRequired,
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

export default connect((state: AppState) => ({
  globalLoadingStatus: globalLoadingStatusSelector(state),
}))(ConnectedStatusBar);
