// @flow

import type { AppState } from '../redux/redux-setup';
import type { Orientations } from 'react-native-orientation-locker';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import { updateDeviceOrientationActionType } from '../redux/action-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import Orientation from 'react-native-orientation-locker';

import { connect } from 'lib/utils/redux-utils';

type Props = {
  // Redux state
  deviceOrientation: Orientations,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class OrientationHandler extends React.PureComponent<Props> {

  static propTypes = {
    deviceOrientation: PropTypes.string.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidMount() {
    Orientation.addOrientationListener(this.updateOrientation);
  }

  componentWillUnmount() {
    Orientation.removeOrientationListener(this.updateOrientation);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.deviceOrientation !== prevProps.deviceOrientation) {
      // Most of the time, this is triggered as a result of an action dispatched
      // by the handler attached above, so the updateOrientation call should be
      // a no-op. This conditional is here to correct Redux state when it is
      // imported from another device context.
      Orientation.getOrientation(this.updateOrientation);
    }
  }

  updateOrientation = orientation => {
    if (orientation !== this.props.deviceOrientation) {
      this.props.dispatchActionPayload(
        updateDeviceOrientationActionType,
        orientation,
      );
    }
  }

  render() {
    return null;
  }

}

export default connect(
  (state: AppState) => ({
    deviceOrientation: state.deviceOrientation,
  }),
  null,
  true,
)(OrientationHandler);
