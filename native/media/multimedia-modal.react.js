// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import {
  type Media,
  mediaPropType,
  type Dimensions,
  dimensionsPropType,
} from 'lib/types/media-types';
import type { AppState } from '../redux-setup';

import * as React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import {
  dimensionsSelector,
  contentVerticalOffset,
} from '../selectors/dimension-selectors';
import Multimedia from './multimedia.react';

type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    media: Media,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  // Redux state
  screenDimensions: Dimensions,
|};
class MultimediaModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          media: mediaPropType.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    screenDimensions: dimensionsPropType.isRequired,
  };

  get imageDimensions(): Dimensions {
    const { screenDimensions, navigation } = this.props;
    const screenHeight = screenDimensions.height - contentVerticalOffset;
    const screenWidth = screenDimensions.width;
    const { dimensions } = navigation.state.params.media;
    if (dimensions.height < screenHeight && dimensions.width < screenWidth) {
      return { ...dimensions };
    }
    const heightRatio = screenHeight / dimensions.height;
    const widthRatio = screenWidth / dimensions.width;
    if (heightRatio < widthRatio) {
      return {
        height: screenHeight,
        width: dimensions.width * heightRatio,
      };
    }
    return {
      width: screenWidth,
      height: dimensions.height * widthRatio,
    };
  }

  render() {
    const { navigation, screenDimensions } = this.props;
    const { media } = navigation.state.params;
    const style = this.imageDimensions;
    const screenHeight = screenDimensions.height - contentVerticalOffset;
    const containerHeightStyle = { height: screenHeight };
    return (
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={this.close}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[ styles.media, containerHeightStyle ]}>
          <Multimedia media={media} style={style} />
        </View>
      </View>
    );
  }

  close = () => {
    this.props.navigation.goBack();
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: contentVerticalOffset,
  },
  backdrop: {
    position: "absolute",
    top: -1 * contentVerticalOffset,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.9,
    backgroundColor: "black",
  },
  media: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default connect(
  (state: AppState) => ({
    screenDimensions: dimensionsSelector(state),
  }),
)(MultimediaModal);
