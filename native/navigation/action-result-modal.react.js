// @flow

import type {
  NavigationStackProp,
  NavigationLeafRoute,
  NavigationStackScene,
} from 'react-navigation';

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';

import { contentBottomOffset } from '../selectors/dimension-selectors';

const {
  Value,
  Extrapolate,
  interpolate,
} = Animated;

type NavProp = NavigationStackProp<{|
  ...NavigationLeafRoute,
  params: {|
    message: string,
  |},
|}>;

type Props = {|
  navigation: NavProp,
  scene: NavigationStackScene,
  position: Value,
|};
class ActionResultModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          message: PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    scene: PropTypes.object.isRequired,
    position: PropTypes.instanceOf(Value).isRequired,
  };
  progress: Value;

  constructor(props: Props) {
    super(props);

    const { position } = props;
    const { index } = props.scene;
    this.progress = interpolate(
      position,
      {
        inputRange: [ index - 1, index ],
        outputRange: [ 0, 1 ],
        extrapolate: Extrapolate.CLAMP,
      },
    );
  }

  componentDidMount() {
    setTimeout(this.goBack, 2000);
  }

  goBack = () => {
    this.props.navigation.goBack();
  }

  get containerStyle() {
    return {
      ...styles.container,
      opacity: this.progress,
    };
  }

  render() {
    const { message } = this.props.navigation.state.params;
    return (
      <Animated.View style={this.containerStyle}>
        <View style={styles.message}>
          <View style={styles.backdrop} />
          <Text style={styles.text}>{message}</Text>
        </View>
      </Animated.View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: contentBottomOffset + 100,
  },
  message: {
    borderRadius: 10,
    padding: 10,
    overflow: 'hidden',
  },
  backdrop: {
    backgroundColor: 'black',
    opacity: 0.7,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  text: {
    fontSize: 20,
    color: 'white',
  },
});

export default ActionResultModal;
