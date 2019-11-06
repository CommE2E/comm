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
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class OrientationHandler extends React.PureComponent<Props> {

  static propTypes = {
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidMount() {
    Orientation.addOrientationListener(this.updateOrientation);
  }

  componentWillUnmount() {
    Orientation.removeOrientationListener(this.updateOrientation);
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
  null,
  null,
  true,
)(OrientationHandler);
