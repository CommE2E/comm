// @flow

import type { Dimensions } from 'lib/types/media-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Dimensions as NativeDimensions } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

import { updateDimensionsActiveType } from './navigation/action-types';

type Props = {|
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class DimensionsUpdater extends React.PureComponent<Props> {

  static propTypes = {
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidMount() {
    NativeDimensions.addEventListener('change', this.onDimensionsChange);
  }

  componentWillUnmount() {
    NativeDimensions.removeEventListener('change', this.onDimensionsChange);
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

export default connect(null, null, true)(DimensionsUpdater);
