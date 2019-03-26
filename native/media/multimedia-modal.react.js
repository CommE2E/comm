// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import { type Media, mediaPropType } from 'lib/types/media-types';

import * as React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import PropTypes from 'prop-types';

import Multimedia from './multimedia.react';

type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    media: Media,
  |},
|}>;

type Props = {|
  navigation: NavProp,
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
  };

  render() {
    const { media } = this.props.navigation.state.params;
    return (
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={this.close}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.modal}>
          <Multimedia media={media} />
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
    justifyContent: "center",
    overflow: "visible",
  },
  backdrop: {
    position: "absolute",
    top: -1000,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.7,
    backgroundColor: "black",
    overflow: 'visible',
  },
  modal: {
    flex: 1,
    justifyContent: "center",
  },
});

export default MultimediaModal;
