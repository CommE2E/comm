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
      Orientation.getOrientation(orientation => {
        if (orientation !== this.props.deviceOrientation) {
          // If the orientation in Redux changes, but it doesn't match what's
          // being reported by native, then update Redux. This should only
          // happen when importing a frozen app state via React Native Debugger
          this.updateOrientation(orientation);
        }
      });
    }
  }

  updateOrientation = orientation => {
    this.props.dispatchActionPayload(
      updateDeviceOrientationActionType,
      orientation,
    );
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
