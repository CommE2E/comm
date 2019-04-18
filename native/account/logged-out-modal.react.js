// @flow

import type { NavigationScreenProp, NavigationRoute } from 'react-navigation';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from '../redux/redux-setup';
import type { Action } from '../navigation/navigation-setup';
import type { KeyboardEvent, EmitterSubscription } from '../keyboard';
import type { LogInState } from './log-in-panel.react';
import type { RegisterState } from './register-panel.react';
import type { LogInExtraInfo } from 'lib/types/account-types';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';

import * as React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Keyboard,
  Platform,
  BackHandler,
  ActivityIndicator,
  DeviceInfo,
} from 'react-native';
import invariant from 'invariant';
import Icon from 'react-native-vector-icons/FontAwesome';
import OnePassword from 'react-native-onepassword';
import PropTypes from 'prop-types';
import { SafeAreaView } from 'react-navigation';
import _isEqual from 'lodash/fp/isEqual';

import { fetchNewCookieFromNativeCredentials } from 'lib/utils/action-utils';
import {
  appStartNativeCredentialsAutoLogIn,
  appStartReduxLoggedInButInvalidCookie,
} from 'lib/actions/user-actions';
import sleep from 'lib/utils/sleep';
import { connect } from 'lib/utils/redux-utils';

import {
  dimensionsSelector,
  contentVerticalOffsetSelector,
} from '../selectors/dimension-selectors';
import LogInPanelContainer from './log-in-panel-container.react';
import RegisterPanel from './register-panel.react';
import ConnectedStatusBar from '../connected-status-bar.react';
import { createIsForegroundSelector } from '../selectors/nav-selectors';
import {
  navigateToAppActionType,
  resetUserStateActionType,
} from '../redux/action-types';
import { splashBackgroundURI } from './background-info';
import { splashStyleSelector } from '../splash';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard';
import {
  type SimpleStateSetter,
  type StateContainer,
  type StateChange,
  setStateForContainer,
} from '../utils/state-container';
import { LoggedOutModalRouteName } from '../navigation/route-names';

const forceInset = { top: 'always', bottom: 'always' };
let initialAppLoad = true;

type LoggedOutMode = "loading" | "prompt" | "log-in" | "register";
type Props = {
  navigation: NavigationScreenProp<NavigationRoute>,
  // Redux state
  rehydrateConcluded: bool,
  cookie: ?string,
  urlPrefix: string,
  loggedIn: bool,
  isForeground: bool,
  dimensions: Dimensions,
  contentVerticalOffset: number,
  splashStyle: ImageStyle,
  // Redux dispatch functions
  dispatch: Dispatch,
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
};
type State = {
  mode: LoggedOutMode,
  panelPaddingTop: Animated.Value,
  footerPaddingTop: Animated.Value,
  panelOpacity: Animated.Value,
  forgotPasswordLinkOpacity: Animated.Value,
  buttonOpacity: Animated.Value,
  onePasswordSupported: bool,
  logInState: StateContainer<LogInState>;
  registerState: StateContainer<RegisterState>;
};

class LoggedOutModal extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    rehydrateConcluded: PropTypes.bool.isRequired,
    cookie: PropTypes.string,
    urlPrefix: PropTypes.string.isRequired,
    loggedIn: PropTypes.bool.isRequired,
    isForeground: PropTypes.bool.isRequired,
    dimensions: dimensionsPropType.isRequired,
    contentVerticalOffset: PropTypes.number.isRequired,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
  };

  static navigationOptions = {
    gesturesEnabled: false,
  };

  keyboardShowListener: ?EmitterSubscription;
  keyboardHideListener: ?EmitterSubscription;
  expectingKeyboardToAppear = false;

  mounted = false;
  nextMode: LoggedOutMode = "loading";
  activeAlert = false;
  activeKeyboard = false;
  opacityChangeQueued = false;
  keyboardHeight = 0;
  lastPanelPaddingTopValue: ?number = null;
  logInPanelContainer: ?LogInPanelContainer = null;

  constructor(props: Props) {
    super(props);
    this.determineOnePasswordSupport();

    // Man, this is a lot of boilerplate just to containerize some state.
    // Mostly due to Flow typing requirements...
    const setLogInState = setStateForContainer(
      this.guardedSetState,
      (change: $Shape<LogInState>) => (fullState: State) => ({
        logInState: {
          ...fullState.logInState,
          state: { ...fullState.logInState.state, ...change },
        },
      }),
    );
    const setRegisterState = setStateForContainer(
      this.guardedSetState,
      (change: $Shape<RegisterState>) => (fullState: State) => ({
        registerState: {
          ...fullState.registerState,
          state: { ...fullState.registerState.state, ...change },
        },
      }),
    );
    const initialLogInState = {
      usernameOrEmailInputText: "",
      passwordInputText: "",
    };
    const initialRegisterState = {
      usernameInputText: "",
      emailInputText: "",
      passwordInputText: "",
      confirmPasswordInputText: "",
    };

    this.state = {
      mode: props.rehydrateConcluded ? "prompt" : "loading",
      panelPaddingTop: new Animated.Value(
        this.calculatePanelPaddingTop("prompt", 0),
      ),
      footerPaddingTop: new Animated.Value(
        this.calculateFooterPaddingTop(0),
      ),
      panelOpacity: new Animated.Value(0),
      forgotPasswordLinkOpacity: new Animated.Value(0),
      buttonOpacity: new Animated.Value(props.rehydrateConcluded ? 1 : 0),
      onePasswordSupported: false,
      logInState: {
        state: {
          usernameOrEmailInputText: "",
          passwordInputText: "",
        },
        setState: setLogInState,
      },
      registerState: {
        state: {
          usernameInputText: "",
          emailInputText: "",
          passwordInputText: "",
          confirmPasswordInputText: "",
        },
        setState: setRegisterState,
      },
    };
    if (props.rehydrateConcluded) {
      this.nextMode = "prompt";
    }
  }

  guardedSetState = (change: StateChange<State>) => {
    if (this.mounted) {
      this.setState(change);
    }
  }

  async determineOnePasswordSupport() {
    let onePasswordSupported;
    try {
      onePasswordSupported = await OnePassword.isSupported();
    } catch (e) {
      onePasswordSupported = false;
    }
    this.guardedSetState({ onePasswordSupported });
  }

  componentDidMount() {
    this.mounted = true;
    if (this.props.rehydrateConcluded) {
      this.onInitialAppLoad();
    }
    if (this.props.isForeground) {
      this.onForeground();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.props.isForeground) {
      this.onBackground();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (!prevProps.rehydrateConcluded && this.props.rehydrateConcluded) {
      this.onInitialAppLoad();
    }
    if (!prevProps.isForeground && this.props.isForeground) {
      this.onForeground();
    } else if (prevProps.isForeground && !this.props.isForeground) {
      this.onBackground();
    }
  }

  onForeground() {
    this.keyboardShowListener = addKeyboardShowListener(this.keyboardShow);
    this.keyboardHideListener = addKeyboardDismissListener(this.keyboardHide);
    BackHandler.addEventListener('hardwareBackPress', this.hardwareBack);
  }

  onBackground() {
    if (this.keyboardShowListener) {
      removeKeyboardListener(this.keyboardShowListener);
      this.keyboardShowListener = null;
    }
    if (this.keyboardHideListener) {
      removeKeyboardListener(this.keyboardHideListener);
      this.keyboardHideListener = null;
    }
    BackHandler.removeEventListener('hardwareBackPress', this.hardwareBack);
  }

  // This gets triggered when an app is killed and restarted
  // Not when it is returned from being backgrounded
  async onInitialAppLoad() {
    if (!initialAppLoad) {
      return;
    }
    initialAppLoad = false;

    let { cookie } = this.props;
    const { urlPrefix } = this.props;
    const showPrompt = () => {
      this.nextMode = "prompt";
      this.guardedSetState({ mode: "prompt" });
      Animated.timing(
        this.state.buttonOpacity,
        {
          duration: 250,
          easing: Easing.out(Easing.ease),
          toValue: 1.0,
        },
      ).start();
    };

    // If we're not logged in, try native credentials
    if (!this.props.loggedIn && (!cookie || !cookie.startsWith("user="))) {
      // If this succeeds it will dispatch LOG_IN_SUCCESS
      const sessionChange = await fetchNewCookieFromNativeCredentials(
        this.props.dispatch,
        cookie,
        urlPrefix,
        appStartNativeCredentialsAutoLogIn,
      );
      if (!sessionChange) {
        showPrompt();
        return;
      }
      const newCookie = sessionChange.cookie;
      if (!newCookie || !newCookie.startsWith("user=")) {
        showPrompt();
      }
      return;
    }

    // Are we possibly already logged in?
    if (this.props.loggedIn) {
      if (cookie && cookie.startsWith("user=")) {
        this.props.dispatchActionPayload(navigateToAppActionType, null);
        return;
      }
      // This is an unusual error state that should never happen
      const sessionChange = await fetchNewCookieFromNativeCredentials(
        this.props.dispatch,
        cookie,
        urlPrefix,
        appStartReduxLoggedInButInvalidCookie,
      );
      const newCookie = sessionChange ? sessionChange.cookie : null;
      if (newCookie && newCookie.startsWith("user=")) {
        // If this happens we know that LOG_IN_SUCCESS has been dispatched
        return;
      }
      // Looks like we failed to recover. We'll handle resetting Redux state to
      // match our cookie in the reset call below
      if (newCookie) {
        cookie = newCookie;
      }
    }

    // We are here either because the user cookie exists but Redux says we're
    // not logged in, or because Redux says we're logged in but we don't have
    // a user cookie and we failed to acquire one above
    this.props.dispatchActionPayload(resetUserStateActionType, null);
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

  calculatePanelPaddingTop(
    mode: LoggedOutMode,
    keyboardHeight: number,
  ) {
    const {
      dimensions: { height: windowHeight },
      contentVerticalOffset,
    } = this.props;
    let containerSize = Platform.OS === "ios" ? 62 : 59; // header height
    if (mode === "log-in") {
      // We need to make space for the reset password button on smaller devices
      containerSize += windowHeight < 600 ? 195 : 165;
    } else if (mode === "register") {
      // We need to make space for the password manager on smaller devices
      containerSize += windowHeight < 600 ? 261 : 246;
    } else {
      // This is arbitrary and artificial... actually centering just looks a bit
      // weird because the buttons are at the bottom. The reason it's different
      // for iPhone X is because that's where LaunchScreen.xib places it and I'm
      // not sure how to get AutoLayout to behave consistently with Yoga.
      containerSize += DeviceInfo.isIPhoneX_deprecated ? 50 : 61;
    }
    const contentHeight = windowHeight - contentVerticalOffset;
    return (contentHeight - containerSize - keyboardHeight) / 2;
  }

  calculateFooterPaddingTop(keyboardHeight: number) {
    const windowHeight = this.props.dimensions.height;
    const textHeight = Platform.OS === "ios" ? 17 : 19;
    if (DeviceInfo.isIPhoneX_deprecated) {
      keyboardHeight -= 34;
    }
    return windowHeight - keyboardHeight - textHeight - 15;
  }

  animateToSecondMode(
    inputDuration: ?number = null,
    realKeyboardHeight: ?number = null,
  ) {
    const duration = inputDuration ? inputDuration : 150;
    if (!realKeyboardHeight) {
      realKeyboardHeight = this.keyboardHeight;
    }
    const animations = [];
    const newPanelPaddingTopValue =
      this.calculatePanelPaddingTop(
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
          toValue: this.calculateFooterPaddingTop(
            realKeyboardHeight,
          ),
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
    if (_isEqual(event.startCoordinates)(event.endCoordinates)) {
      return;
    }
    if (this.expectingKeyboardToAppear) {
      this.expectingKeyboardToAppear = false;
    }
    if (!this.activeKeyboard) {
      // We do this because the Android keyboard can change in height and we
      // don't want to bother moving the panel between those events
      this.keyboardHeight = event.endCoordinates.height;
    }
    this.animateToSecondMode(event.duration, event.endCoordinates.height);
    if (!this.activeKeyboard) {
      this.opacityChangeQueued = false;
    }
    this.activeKeyboard = true;
  }

  animateKeyboardDownOrBackToPrompt(inputDuration: ?number) {
    const duration = inputDuration ? inputDuration : 250;
    const newLastPanelPaddingTopValue =
      this.calculatePanelPaddingTop(
        this.nextMode,
        0,
      );
    this.lastPanelPaddingTopValue = newLastPanelPaddingTopValue;
    const animations = [
      Animated.timing(
        this.state.panelPaddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: newLastPanelPaddingTopValue,
        },
      ),
      Animated.timing(
        this.state.footerPaddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: this.calculateFooterPaddingTop(
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
    if (this.expectingKeyboardToAppear) {
      // On the iOS simulator, it's possible to disable the keyboard. In this
      // case, when a TextInput's autoFocus would normally cause keyboardShow
      // to trigger, keyboardHide is instead triggered. Since the Apple app
      // testers seem to use the iOS simulator, we need to support this case.
      this.expectingKeyboardToAppear = false;
      this.animateToSecondMode();
      return;
    }
    if (event && _isEqual(event.startCoordinates)(event.endCoordinates)) {
      return;
    }
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
    let opacityListenerID: ?string = null;
    const opacityListener = (animatedUpdate: { value: number }) => {
      if (animatedUpdate.value === 0) {
        this.guardedSetState({ mode: this.nextMode });
        invariant(opacityListenerID, "should be set");
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
        source={{ uri: splashBackgroundURI }}
        style={[ styles.modalBackground, this.props.splashStyle ]}
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
          logInState={this.state.logInState}
          innerRef={this.logInPanelContainerRef}
        />
      );
    } else if (this.state.mode === "register") {
      panel = (
        <RegisterPanel
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.state.panelOpacity}
          onePasswordSupported={this.state.onePasswordSupported}
          state={this.state.registerState}
        />
      );
    } else if (this.state.mode === "prompt") {
      const opacityStyle = { opacity: this.state.buttonOpacity };
      buttons = (
        <Animated.View style={[styles.buttonContainer, opacityStyle]}>
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
        </Animated.View>
      );
    } else if (this.state.mode === "loading") {
      panel = (
        <ActivityIndicator
          color="white"
          size="large"
          style={styles.loadingIndicator}
        />
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

    const windowWidth = this.props.dimensions.width;
    const buttonStyle = {
      opacity: this.state.panelOpacity,
      left: windowWidth < 360 ? 28 : 40,
    };
    const padding = { paddingTop: this.state.panelPaddingTop };

    const animatedContent = (
      <Animated.View style={[styles.animationContainer, padding]}>
        <View>
          <Text style={styles.header}>SquadCal</Text>
          <Animated.View style={[ styles.backButton, buttonStyle ]}>
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
        <React.Fragment>
          {background}
          <SafeAreaView forceInset={forceInset} style={styles.container}>
            {statusBar}
            {animatedContent}
            {buttons}
            {forgotPasswordLink}
          </SafeAreaView>
        </React.Fragment>
      );
    } else {
      // https://github.com/facebook/react-native/issues/6785
      const topContainerStyle = { height: this.props.dimensions.height };
      return (
        <View style={[ styles.androidTopContainer, topContainerStyle ]}>
          {background}
					<View style={styles.container}>
						{statusBar}
						{buttons}
						{animatedContent}
						{forgotPasswordLink}
					</View>
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
    this.guardedSetState({ mode: "log-in" });
    if (this.activeKeyboard) {
      // If keyboard isn't currently active, keyboardShow will handle the
      // animation. This is so we can run all animations in parallel
      this.animateToSecondMode();
    } else if (Platform.OS === "ios") {
      this.expectingKeyboardToAppear = true;
    }
  }

  onPressRegister = () => {
    this.opacityChangeQueued = true;
    this.nextMode = "register";
    this.guardedSetState({ mode: "register" });
    if (this.activeKeyboard) {
      // If keyboard isn't currently active, keyboardShow will handle the
      // animation. This is so we can run all animations in parallel
      this.animateToSecondMode();
    } else if (Platform.OS === "ios") {
      this.expectingKeyboardToAppear = true;
    }
  }

  onPressForgotPassword = () => {
    invariant(this.logInPanelContainer, "ref should be set");
    this.logInPanelContainer.onPressForgotPassword();
  }

}

const styles = StyleSheet.create({
  modalBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  androidTopContainer: {
    backgroundColor: 'transparent',
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
  loadingIndicator: {
    paddingTop: 15,
  },
});

const isForegroundSelector =
  createIsForegroundSelector(LoggedOutModalRouteName);
export default connect(
  (state: AppState) => ({
    rehydrateConcluded: state._persist && state._persist.rehydrated,
    cookie: state.cookie,
    urlPrefix: state.urlPrefix,
    loggedIn: !!(state.currentUserInfo &&
      !state.currentUserInfo.anonymous && true),
    isForeground: isForegroundSelector(state),
    dimensions: dimensionsSelector(state),
    contentVerticalOffset: contentVerticalOffsetSelector(state),
    splashStyle: splashStyleSelector(state),
  }),
  null,
  true,
)(LoggedOutModal);
