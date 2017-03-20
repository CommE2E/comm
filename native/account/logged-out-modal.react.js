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
  Platform,
  Dimensions,
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
type LoggedOutMode = "prompt" | "log-in" | "register";
type Props = {
  navigation: NavigationScreenProp<*, *>,
};
type State = {
  mode: LoggedOutMode,
  activeAlert: bool,
  paddingTop: Animated.Value,
};

class LoggedOutModal extends React.PureComponent {

  props: Props;
  state: State;
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

  keyboardShowListener: ?EmitterSubscription;
  keyboardHideListener: ?EmitterSubscription;

  constructor(props: Props) {
    super(props);
    this.state = {
      mode: "prompt",
      activeAlert: false,
      paddingTop: new Animated.Value(
        LoggedOutModal.currentPaddingTop("prompt", 0),
      ),
    };
  }

  componentWillMount() {
    this.keyboardShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      this.keyboardShow,
    );
    this.keyboardHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      this.keyboardHide,
    );
  }

  componentWillUnmount() {
    invariant(this.keyboardShowListener, "should be set");
    this.keyboardShowListener.remove();
    invariant(this.keyboardHideListener, "should be set");
    this.keyboardHideListener.remove();
  }

  static currentPaddingTop(
    mode: LoggedOutMode,
    keyboardHeight: number,
  ) {
    const { height } = Dimensions.get('window');
    const heightWithoutPadding = height - 90;
    let containerSize = Platform.OS === "ios" ? 62 : 59;
    if (mode === "log-in") {
      containerSize += 165;
    } else if (mode === "register") {
      containerSize += 246;
    }
    const test = (heightWithoutPadding - containerSize - keyboardHeight) / 2;
    console.log(test);
    return test;
  }

  keyboardShow = (event: KeyboardEvent) => {
    const duration = event.duration ? event.duration : 250;
    Animated.timing(
      this.state.paddingTop,
      {
        duration,
        easing: Easing.inOut(Easing.ease),
        toValue: LoggedOutModal.currentPaddingTop(
          this.state.mode,
          event.endCoordinates.height,
        ),
      },
    ).start();
  }

  keyboardHide = (event: ?KeyboardEvent) => {
    if (this.state.activeAlert) {
      return;
    }
    const duration = (event && event.duration) ? event.duration : 250;
    Animated.timing(
      this.state.paddingTop,
      {
        duration,
        easing: Easing.inOut(Easing.ease),
        toValue: LoggedOutModal.currentPaddingTop(this.state.mode, 0),
      },
    ).start();
  }

  setActiveAlert = (activeAlert: bool) => {
    this.setState({ activeAlert });
  }

  render() {
    const padding = { paddingTop: this.state.paddingTop };
    let content = null;
    let buttons = null;
    if (this.state.mode === "log-in") {
      content = (
        <LogInPanel
          navigateToApp={this.props.navigation.goBack}
          setActiveAlert={this.setActiveAlert}
        />
      );
    } else if (this.state.mode === "register") {
      content = (
        <RegisterPanel
          navigateToApp={this.props.navigation.goBack}
          setActiveAlert={this.setActiveAlert}
        />
      );
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
