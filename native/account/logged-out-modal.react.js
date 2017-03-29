// @flow

import type { NavigationScreenProp } from 'react-navigation';
import type { DispatchActionPayload } from 'lib/utils/action-utils';

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
  Platform,
  BackAndroid,
  Linking,
} from 'react-native';
import invariant from 'invariant';
import Icon from 'react-native-vector-icons/FontAwesome';
import OnePassword from 'react-native-onepassword';
import { connect } from 'react-redux';

import { includeDispatchActionProps } from 'lib/utils/action-utils';

import { windowHeight } from '../dimensions';
import LogInPanelContainer from './log-in-panel-container.react';
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
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
type State = {
  mode: LoggedOutMode,
  panelPaddingTop: Animated.Value,
  footerPaddingTop: Animated.Value,
  panelOpacity: Animated.Value,
  forgotPasswordLinkOpacity: Animated.Value,
  onePasswordSupported: bool,
};

class LoggedOutModal extends React.PureComponent {

  props: Props;
  state: State = {
    mode: "prompt",
    panelPaddingTop: new Animated.Value(
      LoggedOutModal.calculatePanelPaddingTop("prompt", 0),
    ),
    footerPaddingTop: new Animated.Value(
      LoggedOutModal.calculateFooterPaddingTop(0),
    ),
    panelOpacity: new Animated.Value(0),
    forgotPasswordLinkOpacity: new Animated.Value(0),
    onePasswordSupported: false,
  };
  static propTypes = {
    navigation: React.PropTypes.shape({
      navigate: React.PropTypes.func.isRequired,
      goBack: React.PropTypes.func.isRequired,
    }).isRequired,
    dispatchActionPayload: React.PropTypes.func.isRequired,
  };

  static navigationOptions = {
    cardStack: {
      gesturesEnabled: false,
    },
  };

  keyboardShowListener: ?EmitterSubscription;
  keyboardHideListener: ?EmitterSubscription;

  nextMode: LoggedOutMode = "prompt";
  activeAlert = false;
  activeKeyboard = false;
  opacityChangeQueued = false;
  keyboardHeight = 0;
  lastPanelPaddingTopValue: ?number = null;
  logInPanelContainer: ?LogInPanelContainer = null;

  constructor(props: Props) {
    super(props);
    this.determineOnePasswordSupport().then();
  }

  async determineOnePasswordSupport() {
    let onePasswordSupported;
    try {
      onePasswordSupported = await OnePassword.isSupported();
    } catch (e) {
      onePasswordSupported = false;
    }
    this.setState({ onePasswordSupported });
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
    this.handleInitialURL().then();
    Linking.addEventListener('url', this.handleURLChange);
  }

  async handleInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) {
      this.dispatchActionForURL(url);
    }
  }

  handleURLChange = (event: { url: string }) => {
    this.dispatchActionForURL(event.url);
  }

  dispatchActionForURL(url: string) {
    if (!url.startsWith("http")) {
      return;
    }
    this.props.dispatchActionPayload("HANDLE_URL", url);
  }

  componentWillUnmount() {
    invariant(this.keyboardShowListener, "should be set");
    this.keyboardShowListener.remove();
    invariant(this.keyboardHideListener, "should be set");
    this.keyboardHideListener.remove();
    BackAndroid.removeEventListener('hardwareBackPress', this.hardwareBack);
    Linking.removeEventListener('url', this.handleURLChange);
  }

  hardwareBack = () => {
    if (this.nextMode === "log-in") {
      invariant(this.logInPanelContainer, "ref should be set");
      const returnValue = this.logInPanelContainer.backFromLogInMode();
      if (returnValue) {
        return true;
      }
    }
    if (this.nextMode !== "prompt") {
      this.goBackToPrompt();
      return true;
    }
    return false;
  }

  static calculatePanelPaddingTop(
    mode: LoggedOutMode,
    keyboardHeight: number,
  ) {
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
    return (windowHeight - containerSize - keyboardHeight) / 2;
  }

  static calculateFooterPaddingTop(keyboardHeight: number) {
    const textHeight = Platform.OS === "ios" ? 17 : 19;
    return windowHeight - keyboardHeight - textHeight - 20;
  }

  animateToSecondMode(inputDuration: ?number, realKeyboardHeight: ?number) {
    const duration = inputDuration ? inputDuration : 150;
    if (!realKeyboardHeight) {
      realKeyboardHeight = this.keyboardHeight;
    }
    const animations = [];
    const newPanelPaddingTopValue = LoggedOutModal.calculatePanelPaddingTop(
      this.state.mode,
      this.keyboardHeight,
    );
    if (newPanelPaddingTopValue !== this.lastPanelPaddingTopValue) {
      this.lastPanelPaddingTopValue = newPanelPaddingTopValue;
      animations.push(
        Animated.timing(
          this.state.panelPaddingTop,
          {
            duration,
            easing: Easing.out(Easing.ease),
            toValue: newPanelPaddingTopValue,
          },
        ),
      );
    }
    animations.push(
      Animated.timing(
        this.state.footerPaddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: LoggedOutModal.calculateFooterPaddingTop(realKeyboardHeight),
        },
      ),
    );
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(
          this.state.panelOpacity,
          {
            duration,
            easing: Easing.out(Easing.ease),
            toValue: 1,
          },
        ),
      );
      animations.push(
        Animated.timing(
          this.state.forgotPasswordLinkOpacity,
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
    if (!this.activeKeyboard) {
      // We do this because the Android keyboard can change in height and we
      // don't want to bother moving the panel between those events
      this.keyboardHeight = event.endCoordinates.height;
    }
    this.activeKeyboard = true;
    this.animateToSecondMode(event.duration, event.endCoordinates.height);
    this.opacityChangeQueued = false;
  }

  animateKeyboardDownOrBackToPrompt(inputDuration: ?number) {
    const duration = inputDuration ? inputDuration : 250;
    this.lastPanelPaddingTopValue = LoggedOutModal.calculatePanelPaddingTop(
      this.nextMode,
      0,
    );
    const animations = [
      Animated.timing(
        this.state.panelPaddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: this.lastPanelPaddingTopValue,
        },
      ),
      Animated.timing(
        this.state.footerPaddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: LoggedOutModal.calculateFooterPaddingTop(
            this.keyboardHeight,
          ),
        },
      ),
    ];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(
          this.state.panelOpacity,
          {
            duration,
            easing: Easing.out(Easing.ease),
            toValue: 0,
          },
        ),
      );
      animations.push(
        Animated.timing(
          this.state.forgotPasswordLinkOpacity,
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
    this.activeKeyboard = false;
    if (this.activeAlert) {
      return;
    }
    this.animateKeyboardDownOrBackToPrompt(event && event.duration);
    this.opacityChangeQueued = false;
  }

  setActiveAlert = (activeAlert: bool) => {
    this.activeAlert = activeAlert;
  }

  goBackToPrompt = () => {
    let opacityListenerID = -1;
    const opacityListener = (animatedUpdate: { value: number }) => {
      if (animatedUpdate.value === 0) {
        this.setState({ mode: this.nextMode });
        this.state.panelOpacity.removeListener(opacityListenerID);
      }
    }
    opacityListenerID = this.state.panelOpacity.addListener(opacityListener);

    this.opacityChangeQueued = true;
    this.nextMode = "prompt";

    if (this.activeKeyboard) {
      // If keyboard is currently active, keyboardHide will handle the
      // animation. This is so we can run all animations in parallel
      Keyboard.dismiss();
    } else {
      this.animateKeyboardDownOrBackToPrompt(null);
    }
  }

  render() {
    const statusBar = <ConnectedStatusBar barStyle="light-content" />;
    const background = (
      <Image
        source={require("../img/logged-out-modal-background.jpg")}
        style={styles.modalBackgroundContainer}
      />
    );

    let panel = null;
    let buttons = null;
    if (this.state.mode === "log-in") {
      panel = (
        <LogInPanelContainer
          onePasswordSupported={this.state.onePasswordSupported}
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.state.panelOpacity}
          forgotPasswordLinkOpacity={this.state.forgotPasswordLinkOpacity}
          ref={this.logInPanelContainerRef}
        />
      );
    } else if (this.state.mode === "register") {
      panel = (
        <RegisterPanel
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.state.panelOpacity}
          onePasswordSupported={this.state.onePasswordSupported}
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

    let forgotPasswordLink = null;
    if (this.state.mode === "log-in") {
      const dynamicStyle = {
        opacity: this.state.forgotPasswordLinkOpacity,
        top: this.state.footerPaddingTop,
      };
      forgotPasswordLink = (
        <Animated.View
          style={[styles.forgotPasswordTextContainer, dynamicStyle]}
        >
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={this.onPressForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    const padding = { paddingTop: this.state.panelPaddingTop };
    const opacity = { opacity: this.state.panelOpacity };
    const animatedContent = (
      <Animated.View style={[styles.animationContainer, padding]}>
        <View>
          <Text style={styles.header}>SquadCal</Text>
          <Animated.View style={[styles.backButton, opacity]}>
            <TouchableOpacity activeOpacity={0.6} onPress={this.hardwareBack}>
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
          {forgotPasswordLink}
        </View>
      );
    } else {
      return (
        <View style={styles.container}>
          {statusBar}
          {background}
          {buttons}
          {animatedContent}
          {forgotPasswordLink}
        </View>
      );
    }
  }

  logInPanelContainerRef = (logInPanelContainer: ?LogInPanelContainer) => {
    this.logInPanelContainer = logInPanelContainer;
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

  onPressForgotPassword = () => {
    invariant(this.logInPanelContainer, "ref should be set");
    this.logInPanelContainer.onPressForgotPassword();
  }

}

const styles = StyleSheet.create({
  modalBackgroundContainer: {
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
  forgotPasswordTextContainer: {
    position: 'absolute',
    alignSelf: 'flex-end',
    right: 20,
  },
  forgotPasswordText: {
    color: '#8899FF',
  },
});

export default connect(
  null,
  includeDispatchActionProps({ dispatchActionPayload: true }),
)(LoggedOutModal);
