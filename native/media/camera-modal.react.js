// @flow

import type {
  NavigationStackProp,
  NavigationLeafRoute,
  NavigationStackScene,
} from 'react-navigation';
import type { AppState } from '../redux/redux-setup';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';

import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';
import { RNCamera } from 'react-native-camera';

import { connect } from 'lib/utils/redux-utils';

import {
  contentBottomOffset,
  dimensionsSelector,
  contentVerticalOffsetSelector,
} from '../selectors/dimension-selectors';

const {
  Value,
} = Animated;

type Props = {|
  navigation: NavigationStackProp<NavigationLeafRoute>,
  scene: NavigationStackScene,
  position: Value,
  // Redux state
  screenDimensions: Dimensions,
  contentVerticalOffset: number,
|};
class CameraModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    scene: PropTypes.object.isRequired,
    position: PropTypes.instanceOf(Value).isRequired,
    screenDimensions: dimensionsPropType.isRequired,
    contentVerticalOffset: PropTypes.number.isRequired,
  };

  render() {
    return (
      <View style={styles.container}>
        <RNCamera
          captureAudio={false}
          style={styles.preview}
        />
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
});

export default connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
    contentVerticalOffset: contentVerticalOffsetSelector(state),
  }),
)(CameraModal);
