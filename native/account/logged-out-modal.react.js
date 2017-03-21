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
  BackAndroid,
} from 'react-native';
import invariant from 'invariant';
import Icon from 'react-native-vector-icons/FontAwesome';

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
  paddingTop: Animated.Value,
  opacityValue: Animated.Value,
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

  opacityHitsZeroListenerID: number;

  nextMode: LoggedOutMode = "prompt";
  activeAlert: bool = false;
  activeKeyboard: bool = false;
  opacityChangeQueued: bool = false;
  keyboardHeight: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      mode: "prompt",
      paddingTop: new Animated.Value(
        LoggedOutModal.currentPaddingTop("prompt", 0),
      ),
      opacityValue: new Animated.Value(0),
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
    BackAndroid.addEventListener('hardwareBackPress', this.hardwareBack);
  }

  componentWillUnmount() {
    invariant(this.keyboardShowListener, "should be set");
    this.keyboardShowListener.remove();
    invariant(this.keyboardHideListener, "should be set");
    this.keyboardHideListener.remove();
    BackAndroid.removeEventListener('hardwareBackPress', this.hardwareBack);
  }

  hardwareBack = () => {
    if (this.nextMode !== "prompt") {
      this.goBackToPrompt();
      return true;
    }
    return false;
  }

  static currentPaddingTop(
    mode: LoggedOutMode,
    keyboardHeight: number,
  ) {
    let { height } = Dimensions.get('window');
    if (Platform.OS === "android") {
      // Android's Dimensions.get doesn't include the status bar
      height -= 24;
    }
    let containerSize = Platform.OS === "ios" ? 62 : 59; // header height
    if (mode === "log-in") {
      containerSize += 165;
    } else if (mode === "register") {
      containerSize += 246;
    } else {
      // This is arbitrary and artificial... actually centering just looks a bit
      // weird because the buttons are at the bottom
      containerSize += 80;
    }
    return (height - containerSize - keyboardHeight) / 2;
  }

  animateToSecondMode(inputDuration: ?number) {
    const duration = inputDuration ? inputDuration : 150;
    const animations = [
      Animated.timing(
        this.state.paddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: LoggedOutModal.currentPaddingTop(
            this.state.mode,
            this.keyboardHeight,
          ),
        },
      ),
    ];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(
          this.state.opacityValue,
          {
            duration,
            easing: Easing.out(Easing.ease),
            toValue: 1,
          },
        ),
      );
    }
    Animated.parallel(animations).start();
  }

  keyboardShow = (event: KeyboardEvent) => {
    this.keyboardHeight = event.endCoordinates.height;
    if (this.activeKeyboard) {
      // We do this because the Android keyboard can change in height and we
      // don't want to bother animating between those events
      return;
    }
    this.activeKeyboard = true;
    this.animateToSecondMode(event.duration);
    this.opacityChangeQueued = false;
  }

  animateBackToPrompt(inputDuration: ?number) {
    const duration = inputDuration ? inputDuration : 250;
    const animations = [
      Animated.timing(
        this.state.paddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: LoggedOutModal.currentPaddingTop(this.nextMode, 0),
        },
      ),
    ];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(
          this.state.opacityValue,
          {
            duration,
            easing: Easing.out(Easing.ease),
            toValue: 0,
          },
        ),
      );
    }
    Animated.parallel(animations).start();
  }

  keyboardHide = (event: ?KeyboardEvent) => {
    this.keyboardHeight = 0;
    if (this.activeAlert) {
      return;
    }
    this.activeKeyboard = false;
    this.animateBackToPrompt(event && event.duration);
    this.opacityChangeQueued = false;
  }

  setActiveAlert = (activeAlert: bool) => {
    this.activeAlert = activeAlert;
  }

  goBackToPrompt = () => {
    this.opacityHitsZeroListenerID =
      this.state.opacityValue.addListener(this.opacityListener);
    this.opacityChangeQueued = true;
    this.nextMode = "prompt";
    if (this.activeKeyboard) {
      // If keyboard is currently active, keyboardHide will handle the
      // animation. This is so we can run all animations in parallel
      Keyboard.dismiss();
    } else {
      this.animateBackToPrompt(null);
    }
  }

  opacityListener = (animatedUpdate: { value: number }) => {
    if (animatedUpdate.value === 0) {
      this.setState({ mode: "prompt" });
      this.state.opacityValue.removeListener(this.opacityHitsZeroListenerID);
    }
  }

  render() {
    const statusBar = <ConnectedStatusBar barStyle="light-content" />;
    const background = (
      <Image
        source={require("../img/logged-out-modal-background.jpg")}
        style={styles.loggedOutModalBackgroundContainer}
      />
    );

    let panel = null;
    let buttons = null;
    if (this.state.mode === "log-in") {
      panel = (
        <LogInPanel
          navigateToApp={this.props.navigation.goBack}
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.state.opacityValue}
        />
      );
    } else if (this.state.mode === "register") {
      panel = (
        <RegisterPanel
          navigateToApp={this.props.navigation.goBack}
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.state.opacityValue}
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

    const padding = { paddingTop: this.state.paddingTop };
    const opacity = { opacity: this.state.opacityValue };
    const animatedContent = (
      <Animated.View style={[styles.animationContainer, padding]}>
        <View>
          <Text style={styles.header}>SquadCal</Text>
          <Animated.View style={[styles.backButton, opacity]}>
            <TouchableOpacity activeOpacity={0.6} onPress={this.goBackToPrompt}>
              <Icon
                name="arrow-circle-o-left"
                size={36}
                color="#FFFFFFAA"
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
        {panel}
      </Animated.View>
    );

    // Man, you gotta wonder sometimes if React Native is really worth it.
    // The iOS order causes some extremely strange layout bugs on Android.
    // The Android order makes the buttons in prompt mode not clickable.
    let content;
    if (Platform.OS === "ios") {
      return (
        <View style={styles.container}>
          {statusBar}
          {background}
          {animatedContent}
          {buttons}
        </View>
      );
    } else {
      return (
        <View style={styles.container}>
          {statusBar}
          {background}
          {buttons}
          {animatedContent}
        </View>
      );
    }
  }

  onPressLogIn = () => {
    this.opacityChangeQueued = true;
    this.nextMode = "log-in";
    this.setState({ mode: "log-in" });
    if (this.activeKeyboard) {
      // If keyboard isn't currently active, keyboardShow will handle the
      // animation. This is so we can run all animations in parallel
      this.animateToSecondMode(null);
    }
  }

  onPressRegister = () => {
    this.opacityChangeQueued = true;
    this.nextMode = "register";
    this.setState({ mode: "register" });
    if (this.activeKeyboard) {
      // If keyboard isn't currently active, keyboardShow will handle the
      // animation. This is so we can run all animations in parallel
      this.animateToSecondMode(null);
    }
  }

}

const styles = StyleSheet.create({
  loggedOutModalBackgroundContainer: {
    position: 'absolute',
  },
  container: {
    flex: 1,
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
  backButton: {
    position: 'absolute',
    left: 40,
    top: 13,
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
