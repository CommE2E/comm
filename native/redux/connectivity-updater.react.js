// @flow

import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { AppState } from './redux-setup';
import {
  type ConnectivityInfo,
  connectivityInfoPropType,
} from '../types/connectivity';

import * as React from 'react';
import PropTypes from 'prop-types';
import NetInfo from '@react-native-community/netinfo';

import { connect } from 'lib/utils/redux-utils';

import { updateConnectivityActiveType } from './action-types';

type Props = {|
  // Redux state
  connectivity: ConnectivityInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class ConnectivityUpdater extends React.PureComponent<Props> {

  static propTypes = {
    connectivity: connectivityInfoPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  netInfoUnsubscribe: ?(() => void);

  componentDidMount() {
    this.netInfoUnsubscribe = NetInfo.addEventListener(this.onConnectionChange);
    NetInfo.fetch().then(this.onConnectionChange);
  }

  componentWillUnmount() {
    this.netInfoUnsubscribe && this.netInfoUnsubscribe();
  }

  onConnectionChange = ({ type }) => {
    const connected = type !== 'none' && type !== 'unknown';
    const hasWiFi = type === "wifi";
    if (
      connected === this.props.connectivity.connected &&
      hasWiFi === this.props.connectivity.hasWiFi
    ) {
      return;
    }
    this.props.dispatchActionPayload(
      updateConnectivityActiveType,
      { connected, hasWiFi },
    );
  }

  render() {
    return null;
  }

}

export default connect(
  (state: AppState) => ({
    connectivity: state.connectivity,
  }),
  null,
  true,
)(ConnectivityUpdater);
