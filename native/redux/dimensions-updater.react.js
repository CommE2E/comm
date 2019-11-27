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
    const { height, width } = NativeDimensions.get('window');
    if (
      (this.props.dimensions.height !== prevProps.dimensions.height ||
        this.props.dimensions.width !== prevProps.dimensions.width) &&
      (this.props.dimensions.height !== height ||
        this.props.dimensions.width !== width)
    ) {
      // If the dimensions in Redux change, but they don't match what's being
      // reported by React Native, then update Redux. This should only happen
      // when importing a frozen app state via React Native Debugger
      this.props.dispatchActionPayload(
        updateDimensionsActiveType,
        { height, width },
      );
    }
  }

  onDimensionsChange = (allDimensions: { window: Dimensions }) => {
    const dimensions = allDimensions.window;
    this.props.dispatchActionPayload(
      updateDimensionsActiveType,
      dimensions,
    );
  }

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
