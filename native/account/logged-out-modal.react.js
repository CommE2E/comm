// @flow

import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from '../redux/redux-setup';
import type { KeyboardEvent, EmitterSubscription } from '../keyboard/keyboard';
import type { LogInState } from './log-in-panel.react';
import type { RegisterState } from './register-panel.react';
import {
  type DimensionsInfo,
  dimensionsInfoPropType,
} from '../redux/dimensions-updater.react';
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
} from 'react-native';
import invariant from 'invariant';
import Icon from 'react-native-vector-icons/FontAwesome';
import OnePassword from 'react-native-onepassword';
import PropTypes from 'prop-types';
import _isEqual from 'lodash/fp/isEqual';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, {
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';

import { fetchNewCookieFromNativeCredentials } from 'lib/utils/action-utils';
import {
  appStartNativeCredentialsAutoLogIn,
  appStartReduxLoggedInButInvalidCookie,
} from 'lib/actions/user-actions';
import { connect } from 'lib/utils/redux-utils';
import { isLoggedIn } from 'lib/selectors/user-selectors';

import LogInPanelContainer from './log-in-panel-container.react';
import RegisterPanel from './register-panel.react';
import ConnectedStatusBar from '../connected-status-bar.react';
import { createIsForegroundSelector } from '../navigation/nav-selectors';
import { resetUserStateActionType } from '../redux/action-types';
import { splashBackgroundURI } from './background-info';
import { splashStyleSelector } from '../splash';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard/keyboard';
import {
  type StateContainer,
  type StateChange,
  setStateForContainer,
} from '../utils/state-container';
import { LoggedOutModalRouteName } from '../navigation/route-names';
import {
  connectNav,
  type NavContextType,
  navContextPropType,
} from '../navigation/navigation-context';
import { runTiming } from '../utils/animation-utils';

let initialAppLoad = true;
const animatedSpec = {
  useNativeDriver: false,
  easing: Easing.out(Easing.ease),
};
const safeAreaEdges = ['top', 'bottom'];

/* eslint-disable import/no-named-as-default-member */
const {
  Clock,
  block,
  set,
  cond,
  not,
  and,
  eq,
  neq,
  greaterThan,
  lessThan,
  greaterOrEq,
  add,
  sub,
  divide,
  max,
  stopClock,
  clockRunning,
} = Reanimated;
/* eslint-enable import/no-named-as-default-member */

type LoggedOutMode = 'loading' | 'prompt' | 'log-in' | 'register';
type Props = {
  // Navigation state
  isForeground: boolean,
  navContext: ?NavContextType,
  // Redux state
  rehydrateConcluded: boolean,
  cookie: ?string,
  urlPrefix: string,
  loggedIn: boolean,
  dimensions: DimensionsInfo,
  splashStyle: ImageStyle,
  // Redux dispatch functions
  dispatch: Dispatch,
  dispatchActionPayload: DispatchActionPayload,
};
type State = {
  mode: LoggedOutMode,
  panelOpacity: Animated.Value,
  forgotPasswordLinkOpacity: Animated.Value,
  onePasswordSupported: boolean,
  logInState: StateContainer<LogInState>,
  registerState: StateContainer<RegisterState>,
};

class LoggedOutModal extends React.PureComponent<Props, State> {
  static propTypes = {
    isForeground: PropTypes.bool.isRequired,
    navContext: navContextPropType,
    rehydrateConcluded: PropTypes.bool.isRequired,
    cookie: PropTypes.string,
    urlPrefix: PropTypes.string.isRequired,
    loggedIn: PropTypes.bool.isRequired,
    dimensions: dimensionsInfoPropType.isRequired,
    dispatch: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  keyboardShowListener: ?EmitterSubscription;
  keyboardHideListener: ?EmitterSubscription;
  expectingKeyboardToAppear = false;

  mounted = false;
  nextMode: LoggedOutMode = 'loading';
  activeAlert = false;
  activeKeyboard = false;
  opacityChangeQueued = false;
  keyboardHeight = 0;
  logInPanelContainer: ?LogInPanelContainer = null;

  contentHeight: Reanimated.Value;
  keyboardHeightValue = new Reanimated.Value(0);
  modeValue: Reanimated.Value;

  buttonOpacity: Reanimated.Value;
  panelPaddingTopValue: Reanimated.Value;
  footerPaddingTopValue: Reanimated.Value;

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

    this.state = {
      mode: props.rehydrateConcluded ? 'prompt' : 'loading',
      panelOpacity: new Animated.Value(0),
      forgotPasswordLinkOpacity: new Animated.Value(0),
      onePasswordSupported: false,
      logInState: {
        state: {
          usernameOrEmailInputText: '',
          passwordInputText: '',
        },
        setState: setLogInState,
      },
      registerState: {
        state: {
          usernameInputText: '',
          emailInputText: '',
          passwordInputText: '',
          confirmPasswordInputText: '',
        },
        setState: setRegisterState,
      },
    };
    if (props.rehydrateConcluded) {
      this.nextMode = 'prompt';
    }

    const { height: windowHeight, topInset, bottomInset } = props.dimensions;
    this.contentHeight = new Reanimated.Value(
      windowHeight - topInset - bottomInset,
    );
    this.modeValue = new Reanimated.Value(
      LoggedOutModal.getModeNumber(this.nextMode),
    );

    this.buttonOpacity = new Reanimated.Value(props.rehydrateConcluded ? 1 : 0);
    this.panelPaddingTopValue = this.panelPaddingTop();
    this.footerPaddingTopValue = this.footerPaddingTop();
  }

  guardedSetState = (change: StateChange<State>) => {
    if (this.mounted) {
      this.setState(change);
    }
  };

  setMode(newMode: LoggedOutMode) {
    this.nextMode = newMode;
    this.guardedSetState({ mode: newMode });
    this.modeValue.setValue(LoggedOutModal.getModeNumber(newMode));
  }

  static getModeNumber(mode: LoggedOutMode) {
    if (mode === 'loading') {
      return 0;
    } else if (mode === 'prompt') {
      return 1;
    } else if (mode === 'log-in') {
      return 2;
    } else if (mode === 'register') {
      return 3;
    }
    invariant(false, `${mode} is not a valid LoggedOutMode`);
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

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!prevProps.rehydrateConcluded && this.props.rehydrateConcluded) {
      this.setMode('prompt');
      this.onInitialAppLoad();
    }
    if (!prevProps.isForeground && this.props.isForeground) {
      this.onForeground();
    } else if (prevProps.isForeground && !this.props.isForeground) {
      this.onBackground();
    }

    if (this.state.mode === 'prompt' && prevState.mode !== 'prompt') {
      this.buttonOpacity.setValue(0);
      Reanimated.timing(this.buttonOpacity, {
        easing: ReanimatedEasing.out(ReanimatedEasing.ease),
        duration: 250,
        toValue: 1.0,
      }).start();
    }

    const newContentHeight =
      this.props.dimensions.height -
      this.props.dimensions.topInset -
      this.props.dimensions.bottomInset;
    const oldContentHeight =
      prevProps.dimensions.height -
      prevProps.dimensions.topInset -
      prevProps.dimensions.bottomInset;
    if (newContentHeight !== oldContentHeight) {
      this.contentHeight.setValue(newContentHeight);
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

    const { loggedIn, cookie, urlPrefix, dispatch } = this.props;
    const hasUserCookie = cookie && cookie.startsWith('user=');
    if (loggedIn && hasUserCookie) {
      return;
    }

    if (!__DEV__) {
      const actionSource = loggedIn
        ? appStartReduxLoggedInButInvalidCookie
        : appStartNativeCredentialsAutoLogIn;
      const sessionChange = await fetchNewCookieFromNativeCredentials(
        dispatch,
        cookie,
        urlPrefix,
        actionSource,
      );
      if (
        sessionChange &&
        sessionChange.cookie &&
        sessionChange.cookie.startsWith('user=')
      ) {
        // success! we can expect subsequent actions to fix up the state
        return;
      }
    }

    if (loggedIn || hasUserCookie) {
      this.props.dispatchActionPayload(resetUserStateActionType, null);
    }
  }

  hardwareBack = () => {
    if (this.nextMode === 'log-in') {
      invariant(this.logInPanelContainer, 'ref should be set');
      const returnValue = this.logInPanelContainer.backFromLogInMode();
      if (returnValue) {
        return true;
      }
    }
    if (this.nextMode !== 'prompt') {
      this.goBackToPrompt();
      return true;
    }
    return false;
  };

  panelPaddingTop() {
    const headerHeight = Platform.OS === 'ios' ? 62.33 : 58.54;
    const containerSize = add(
      headerHeight,
      cond(
        eq(this.modeValue, 2),
        // We make space for the reset password button on smaller devices
        cond(lessThan(this.contentHeight, 600), 195, 165),
        0,
      ),
      cond(
        eq(this.modeValue, 3),
        // We make space for the password manager on smaller devices
        cond(lessThan(this.contentHeight, 600), 261, 246),
        0,
      ),
      cond(lessThan(this.modeValue, 2), Platform.OS === 'ios' ? 40 : 61, 0),
    );
    const potentialPanelPaddingTop = divide(
      max(sub(this.contentHeight, this.keyboardHeightValue, containerSize), 0),
      2,
    );

    const panelPaddingTop = new Reanimated.Value(-1);
    const targetPanelPaddingTop = new Reanimated.Value(-1);
    const prevModeValue = new Reanimated.Value(
      LoggedOutModal.getModeNumber(this.nextMode),
    );
    const clock = new Clock();
    const keyboardTimeoutClock = new Clock();
    return block([
      cond(lessThan(panelPaddingTop, 0), [
        set(panelPaddingTop, potentialPanelPaddingTop),
        set(targetPanelPaddingTop, potentialPanelPaddingTop),
      ]),
      cond(
        lessThan(this.keyboardHeightValue, 0),
        [
          runTiming(keyboardTimeoutClock, 0, 1, true, { duration: 500 }),
          cond(
            not(clockRunning(keyboardTimeoutClock)),
            set(this.keyboardHeightValue, 0),
          ),
        ],
        stopClock(keyboardTimeoutClock),
      ),
      cond(
        and(
          greaterOrEq(this.keyboardHeightValue, 0),
          neq(prevModeValue, this.modeValue),
        ),
        [
          stopClock(clock),
          cond(
            neq(greaterThan(prevModeValue, 1), greaterThan(this.modeValue, 1)),
            set(targetPanelPaddingTop, potentialPanelPaddingTop),
          ),
          set(prevModeValue, this.modeValue),
        ],
      ),
      cond(
        neq(panelPaddingTop, targetPanelPaddingTop),
        set(
          panelPaddingTop,
          runTiming(clock, panelPaddingTop, targetPanelPaddingTop),
        ),
      ),
      panelPaddingTop,
    ]);
  }

  footerPaddingTop() {
    const textHeight = Platform.OS === 'ios' ? 17 : 19;
    const targetFooterPaddingTop = max(
      sub(this.contentHeight, max(this.keyboardHeightValue, 0), textHeight, 15),
      0,
    );

    const footerPaddingTop = new Reanimated.Value(-1);
    const prevTargetFooterPaddingTop = new Reanimated.Value(-1);
    const clock = new Clock();
    return block([
      cond(lessThan(footerPaddingTop, 0), [
        set(footerPaddingTop, targetFooterPaddingTop),
        set(prevTargetFooterPaddingTop, targetFooterPaddingTop),
      ]),
      cond(greaterOrEq(this.keyboardHeightValue, 0), [
        cond(neq(targetFooterPaddingTop, prevTargetFooterPaddingTop), [
          stopClock(clock),
          set(prevTargetFooterPaddingTop, targetFooterPaddingTop),
        ]),
        cond(
          neq(footerPaddingTop, targetFooterPaddingTop),
          set(
            footerPaddingTop,
            runTiming(clock, footerPaddingTop, targetFooterPaddingTop),
          ),
        ),
      ]),
      footerPaddingTop,
    ]);
  }

  animateToSecondMode(inputDuration: ?number = null) {
    const duration = inputDuration ? inputDuration : 150;
    const animations = [];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(this.state.panelOpacity, {
          ...animatedSpec,
          duration,
          toValue: 1,
        }),
      );
      animations.push(
        Animated.timing(this.state.forgotPasswordLinkOpacity, {
          ...animatedSpec,
          duration,
          toValue: 1,
        }),
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
    const keyboardHeight = Platform.select({
      // Android doesn't include the bottomInset in this height measurement
      android: event.endCoordinates.height,
      default: Math.max(
        event.endCoordinates.height - this.props.dimensions.bottomInset,
        0,
      ),
    });
    this.keyboardHeightValue.setValue(keyboardHeight);
    this.keyboardHeight = keyboardHeight;
    this.animateToSecondMode(event.duration);
    if (!this.activeKeyboard) {
      this.opacityChangeQueued = false;
    }
    this.activeKeyboard = true;
  };

  animateKeyboardDownOrBackToPrompt(inputDuration: ?number) {
    const duration = inputDuration ? inputDuration : 250;
    const animations = [];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(this.state.panelOpacity, {
          ...animatedSpec,
          duration,
          toValue: 0,
        }),
      );
      animations.push(
        Animated.timing(this.state.forgotPasswordLinkOpacity, {
          ...animatedSpec,
          duration,
          toValue: 0,
        }),
      );
    }
    Animated.parallel(animations).start();
  }

  keyboardHide = (event: ?KeyboardEvent) => {
    this.keyboardHeightValue.setValue(0);
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
  };

  setActiveAlert = (activeAlert: boolean) => {
    this.activeAlert = activeAlert;
  };

  goBackToPrompt = () => {
    let opacityListenerID: ?string = null;
    const opacityListener = (animatedUpdate: { value: number }) => {
      if (animatedUpdate.value === 0) {
        this.guardedSetState({ mode: this.nextMode });
        invariant(opacityListenerID, 'should be set');
        this.state.panelOpacity.removeListener(opacityListenerID);
      }
    };
    opacityListenerID = this.state.panelOpacity.addListener(opacityListener);

    this.opacityChangeQueued = true;
    this.nextMode = 'prompt';
    this.keyboardHeightValue.setValue(0);
    this.modeValue.setValue(LoggedOutModal.getModeNumber('prompt'));

    if (this.activeKeyboard) {
      // If keyboard is currently active, keyboardHide will handle the
      // animation. This is so we can run all animations in parallel
      Keyboard.dismiss();
    } else {
      this.animateKeyboardDownOrBackToPrompt(null);
    }
  };

  render() {
    let panel = null;
    let buttons = null;
    if (this.state.mode === 'log-in') {
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
    } else if (this.state.mode === 'register') {
      panel = (
        <RegisterPanel
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.state.panelOpacity}
          onePasswordSupported={this.state.onePasswordSupported}
          state={this.state.registerState}
        />
      );
    } else if (this.state.mode === 'prompt') {
      const opacityStyle = { opacity: this.buttonOpacity };
      buttons = (
        <Reanimated.View style={[styles.buttonContainer, opacityStyle]}>
          <TouchableOpacity
            onPress={this.onPressLogIn}
            style={styles.button}
            activeOpacity={0.6}
          >
            <Text style={styles.buttonText}>LOG IN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={this.onPressRegister}
            style={styles.button}
            activeOpacity={0.6}
          >
            <Text style={styles.buttonText}>SIGN UP</Text>
          </TouchableOpacity>
        </Reanimated.View>
      );
    } else if (this.state.mode === 'loading') {
      panel = (
        <ActivityIndicator
          color="white"
          size="large"
          style={styles.loadingIndicator}
        />
      );
    }

    let forgotPasswordLink = null;
    if (this.state.mode === 'log-in') {
      const animatedStyle = {
        opacity: this.state.forgotPasswordLinkOpacity,
      };
      const reanimatedStyle = {
        top: this.footerPaddingTopValue,
      };
      forgotPasswordLink = (
        <Reanimated.View
          style={[styles.forgotPasswordTextContainer, reanimatedStyle]}
        >
          <Animated.View style={animatedStyle}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={this.onPressForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </Animated.View>
        </Reanimated.View>
      );
    }

    const windowWidth = this.props.dimensions.width;
    const buttonStyle = {
      opacity: this.state.panelOpacity,
      left: windowWidth < 360 ? 28 : 40,
    };
    const padding = { paddingTop: this.panelPaddingTopValue };

    const animatedContent = (
      <Reanimated.View style={[styles.animationContainer, padding]}>
        <View>
          <Text style={styles.header}>SquadCal</Text>
          <Animated.View style={[styles.backButton, buttonStyle]}>
            <TouchableOpacity activeOpacity={0.6} onPress={this.hardwareBack}>
              <Icon name="arrow-circle-o-left" size={36} color="#FFFFFFAA" />
            </TouchableOpacity>
          </Animated.View>
        </View>
        {panel}
      </Reanimated.View>
    );

    const backgroundSource = { uri: splashBackgroundURI };
    return (
      <React.Fragment>
        <ConnectedStatusBar barStyle="light-content" />
        <Image
          source={backgroundSource}
          style={[styles.modalBackground, this.props.splashStyle]}
        />
        <SafeAreaView style={styles.container} edges={safeAreaEdges}>
          <View style={styles.container}>
            {animatedContent}
            {buttons}
            {forgotPasswordLink}
          </View>
        </SafeAreaView>
      </React.Fragment>
    );
  }

  logInPanelContainerRef = (logInPanelContainer: ?LogInPanelContainer) => {
    this.logInPanelContainer = logInPanelContainer;
  };

  onPressLogIn = () => {
    this.keyboardHeightValue.setValue(-1);
    this.opacityChangeQueued = true;
    this.setMode('log-in');
    if (this.activeKeyboard) {
      // If keyboard isn't currently active, keyboardShow will handle the
      // animation. This is so we can run all animations in parallel
      this.animateToSecondMode();
      return;
    }
    this.expectingKeyboardToAppear = true;
    setTimeout(this.animateToSecondIfKeyboardStillHidden, 500);
  };

  onPressRegister = () => {
    this.keyboardHeightValue.setValue(-1);
    this.opacityChangeQueued = true;
    this.setMode('register');
    if (this.activeKeyboard) {
      // If keyboard isn't currently active, keyboardShow will handle the
      // animation. This is so we can run all animations in parallel
      this.animateToSecondMode();
      return;
    }
    this.expectingKeyboardToAppear = true;
    setTimeout(this.animateToSecondIfKeyboardStillHidden, 500);
  };

  animateToSecondIfKeyboardStillHidden = () => {
    if (!this.expectingKeyboardToAppear || !this.mounted) {
      return;
    }
    this.expectingKeyboardToAppear = false;
    this.animateToSecondMode();
  };

  onPressForgotPassword = () => {
    invariant(this.logInPanelContainer, 'ref should be set');
    this.logInPanelContainer.onPressForgotPassword();
  };
}

const styles = StyleSheet.create({
  animationContainer: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 13,
  },
  button: {
    backgroundColor: '#FFFFFFAA',
    borderRadius: 6,
    marginBottom: 10,
    marginLeft: 40,
    marginRight: 40,
    marginTop: 10,
    paddingBottom: 6,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 6,
  },
  buttonContainer: {
    bottom: 0,
    left: 0,
    paddingBottom: 20,
    position: 'absolute',
    right: 0,
  },
  buttonText: {
    color: '#000000FF',
    fontFamily: 'OpenSans-Semibold',
    fontSize: 22,
    textAlign: 'center',
  },
  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  forgotPasswordText: {
    color: '#8899FF',
  },
  forgotPasswordTextContainer: {
    alignSelf: 'flex-end',
    position: 'absolute',
    right: 20,
  },
  header: {
    color: 'white',
    fontFamily: 'Anaheim-Regular',
    fontSize: 48,
    textAlign: 'center',
  },
  loadingIndicator: {
    paddingTop: 15,
  },
  modalBackground: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

const isForegroundSelector = createIsForegroundSelector(
  LoggedOutModalRouteName,
);
export default connectNav((context: ?NavContextType) => ({
  isForeground: isForegroundSelector(context),
  navContext: context,
}))(
  connect(
    (state: AppState, ownProps: { navContext: ?NavContextType }) => ({
      rehydrateConcluded: !!(
        state._persist &&
        state._persist.rehydrated &&
        ownProps.navContext
      ),
      cookie: state.cookie,
      urlPrefix: state.urlPrefix,
      loggedIn: isLoggedIn(state),
      dimensions: state.dimensions,
      splashStyle: splashStyleSelector(state),
    }),
    null,
    true,
  )(LoggedOutModal),
);
