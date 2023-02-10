// @flow

import * as React from 'react';
import type { Orientations } from 'react-native-orientation-locker';
import Orientation from 'react-native-orientation-locker';
import { useDispatch } from 'react-redux';

import type { Dispatch } from 'lib/types/redux-types.js';

import { updateDeviceOrientationActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +deviceOrientation: Orientations,
  +dispatch: Dispatch,
};
class OrientationHandler extends React.PureComponent<Props> {
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
      this.props.dispatch({
        type: updateDeviceOrientationActionType,
        payload: orientation,
      });
    }
  };

  render() {
    return null;
  }
}

const ConnectedOrientationHandler: React.ComponentType<{}> = React.memo<{}>(
  function ConnectedOrientationHandler() {
    const deviceOrientation = useSelector(state => state.deviceOrientation);
    const dispatch = useDispatch();

    return (
      <OrientationHandler
        deviceOrientation={deviceOrientation}
        dispatch={dispatch}
      />
    );
  },
);

export default ConnectedOrientationHandler;
