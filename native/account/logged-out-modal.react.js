// @flow

import type { NavigationScreenProp } from 'react-navigation';

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  EmitterSubscription,
  Keyboard,
  Alert,
} from 'react-native';
import invariant from 'invariant';

import LogInPanel from './log-in-panel.react';
import RegisterPanel from './register-panel.react';
import ConnectedStatusBar from '../connected-status-bar.react';

type KeyboardEvent = {
  duration: number,
  endCoordinates: {
    width: number,
    height: number,
    screenX: number,
    screenY: number,
  },
};

class LoggedOutModal extends React.PureComponent {

  props: {
    navigation: NavigationScreenProp<*, *>,
  };

  state: {
    mode: "prompt" | "log-in" | "register",
    paddingTop: Animated.Value,
  } = {
    mode: "prompt",
    paddingTop: new Animated.Value(250),
  };

  static propTypes = {
    navigation: React.PropTypes.shape({
      navigate: React.PropTypes.func.isRequired,
    }).isRequired,
  };

  static navigationOptions = {
    cardStack: {
      gesturesEnabled: false,
    },
  };

  keyboardDidShowListener: ?EmitterSubscription;
  keyboardDidHideListener: ?EmitterSubscription;

  componentWillMount() {
    this.keyboardDidShowListener = Keyboard.addListener(
      'keyboardWillShow',
      this.keyboardDidShow,
    );
    this.keyboardDidHideListener = Keyboard.addListener(
      'keyboardWillHide',
      this.keyboardDidHide,
    );
  }

  componentWillUnmount() {
    invariant(this.keyboardDidShowListener, "should be set");
    this.keyboardDidShowListener.remove();
    invariant(this.keyboardDidHideListener, "should be set");
    this.keyboardDidHideListener.remove();
  }

  keyboardDidShow = (event: KeyboardEvent) => {
    Animated.timing(
      this.state.paddingTop,
      {
        duration: event.duration,
        easing: Easing.inOut(Easing.ease),
        toValue: 250 - event.endCoordinates.height,
      },
    ).start();
  }

  keyboardDidHide = (event: KeyboardEvent) => {
    Animated.timing(
      this.state.paddingTop,
      {
        duration: event.duration,
        easing: Easing.inOut(Easing.ease),
        toValue: 250,
      },
    ).start();
  }

  render() {
    const padding = { paddingTop: this.state.paddingTop };
    let content = null;
    let buttons = null;
    if (this.state.mode === "log-in") {
      content = <LogInPanel navigateToApp={this.props.navigation.goBack} />;
    } else if (this.state.mode === "register") {
      content = <RegisterPanel navigateToApp={this.props.navigation.goBack} />;
    } else {
      buttons = (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={this.onPressLogIn}
            style={styles.button}
            activeOpacity={0.6}
          >
            <Text style={styles.buttonText}>
              LOG IN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={this.onPressRegister}
            style={styles.button}
            activeOpacity={0.6}
          >
            <Text style={styles.buttonText}>
              SIGN UP
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <ConnectedStatusBar barStyle="light-content" />
        <Image
          source={require("../img/logged-out-modal-background.jpg")}
          style={styles.loggedOutModalBackgroundContainer}
        />
        <Animated.View style={[styles.animationContainer, padding]}>
          <Text style={styles.header}>SquadCal</Text>
          {content}
        </Animated.View>
        {buttons}
      </View>
    );
  }

  onPressLogIn = () => {
    this.setState({ mode: "log-in" });
  }

  onPressRegister = () => {
    this.setState({ mode: "register" });
  }

}

const styles = StyleSheet.create({
  loggedOutModalBackgroundContainer: {
    position: 'absolute',
  },
  container: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 50,
    backgroundColor: 'transparent',
  },
  animationContainer: {
    flex: 1,
  },
  header: {
    fontFamily: 'Anaheim-Regular',
    color: 'white',
    fontSize: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
  },
  button: {
    paddingBottom: 6,
    paddingTop: 6,
    paddingLeft: 18,
    paddingRight: 18,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
  },
  buttonText: {
    fontSize: 22,
    fontFamily: 'OpenSans-Semibold',
    textAlign: 'center',
    color: '#000000FF',
  },
});

export default LoggedOutModal;
