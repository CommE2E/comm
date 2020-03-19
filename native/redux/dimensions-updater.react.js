// @flow

import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Dimensions as NativeDimensions } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

import { updateDimensionsActiveType } from './action-types';

type Props = {
  // Redux state
  dimensions: Dimensions,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
class DimensionsUpdater extends React.PureComponent<Props> {
  static propTypes = {
    dimensions: dimensionsPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidMount() {
    NativeDimensions.addEventListener('change', this.onDimensionsChange);
  }

  componentWillUnmount() {
    NativeDimensions.removeEventListener('change', this.onDimensionsChange);
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.dimensions.height !== prevProps.dimensions.height ||
      this.props.dimensions.width !== prevProps.dimensions.width
    ) {
      // Most of the time, this is triggered as a result of an action dispatched
      // by the handler attached above, so the onDimensionsChnage call should be
      // a no-op. This conditional is here to correct Redux state when it is
      // imported from another device context.
      this.onDimensionsChange({ window: NativeDimensions.get('window') });
    }
  }

  onDimensionsChange = (allDimensions: { window: Dimensions }) => {
    const { height: newHeight, width: newWidth } = allDimensions.window;
    const { height: oldHeight, width: oldWidth } = this.props.dimensions;
    if (newHeight !== oldHeight || newWidth !== oldWidth) {
      this.props.dispatchActionPayload(updateDimensionsActiveType, {
        height: newHeight,
        width: newWidth,
      });
    }
  };

  render() {
    return null;
  }
}

export default connect(
  (state: AppState) => ({
    dimensions: state.dimensions,
  }),
  null,
  true,
)(DimensionsUpdater);
