// @flow

import _isEqual from 'lodash/fp/isEqual';
import * as React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Keyboard,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import Animated, { EasingNode } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useDispatch } from 'react-redux';

import {
  appStartCookieLoggedInButInvalidRedux,
  appStartReduxLoggedInButInvalidCookie,
} from 'lib/actions/user-actions';
import { isLoggedIn } from 'lib/selectors/user-selectors';
import type { Dispatch } from 'lib/types/redux-types';
import { fetchNewCookieFromNativeCredentials } from 'lib/utils/action-utils';

import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react';
import ConnectedStatusBar from '../connected-status-bar.react';
import {
  type KeyboardEvent,
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard/keyboard';
import { createIsForegroundSelector } from '../navigation/nav-selectors';
import { NavContext } from '../navigation/navigation-context';
import { LoggedOutModalRouteName } from '../navigation/route-names';
import { resetUserStateActionType } from '../redux/action-types';
import { useSelector } from '../redux/redux-utils';
import { usePersistedStateLoaded } from '../selectors/app-state-selectors';
import {
  type DerivedDimensionsInfo,
  derivedDimensionsInfoSelector,
} from '../selectors/dimensions-selectors';
import { splashStyleSelector } from '../splash';
import type { EmitterSubscription } from '../types/react-native';
import type { ImageStyle } from '../types/styles';
import {
  runTiming,
  ratchetAlongWithKeyboardHeight,
} from '../utils/animation-utils';
import {
  type StateContainer,
  type StateChange,
  setStateForContainer,
} from '../utils/state-container';
import { splashBackgroundURI } from './background-info';
import LogInPanel from './log-in-panel.react';
import type { LogInState } from './log-in-panel.react';
import RegisterPanel from './register-panel.react';
import type { RegisterState } from './register-panel.react';

let initialAppLoad = true;
const safeAreaEdges = ['top', 'bottom'];

/* eslint-disable import/no-named-as-default-member */
const {
  Value,
  Node,
  Clock,
  block,
  set,
  call,
  cond,
  not,
  and,
  eq,
  neq,
  lessThan,
  greaterOrEq,
  add,
  sub,
  divide,
  max,
  stopClock,
  clockRunning,
} = Animated;
/* eslint-enable import/no-named-as-default-member */

type LoggedOutMode = 'loading' | 'prompt' | 'log-in' | 'register';
const modeNumbers: { [LoggedOutMode]: number } = {
  'loading': 0,
  'prompt': 1,
  'log-in': 2,
  'register': 3,
};
function isPastPrompt(modeValue: Node) {
  return and(
    neq(modeValue, modeNumbers['loading']),
    neq(modeValue, modeNumbers['prompt']),
  );
}

type Props = {
  // Navigation state
  +isForeground: boolean,
  // Redux state
  +persistedStateLoaded: boolean,
  +rehydrateConcluded: boolean,
  +cookie: ?string,
  +urlPrefix: string,
  +loggedIn: boolean,
  +dimensions: DerivedDimensionsInfo,
  +splashStyle: ImageStyle,
  // Redux dispatch functions
  +dispatch: Dispatch,
  ...
};
type State = {
  +mode: LoggedOutMode,
  +logInState: StateContainer<LogInState>,
  +registerState: StateContainer<RegisterState>,
};
class LoggedOutModal extends React.PureComponent<Props, State> {
  keyboardShowListener: ?EmitterSubscription;
  keyboardHideListener: ?EmitterSubscription;

  mounted = false;
  nextMode: LoggedOutMode = 'loading';
  activeAlert = false;

  contentHeight: Value;
  keyboardHeightValue = new Value(0);
  modeValue: Value;

  buttonOpacity: Value;
  panelPaddingTopValue: Node;
  panelOpacityValue: Node;

  constructor(props: Props) {
    super(props);

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
      mode: props.persistedStateLoaded ? 'prompt' : 'loading',
      logInState: {
        state: {
          usernameInputText: null,
          passwordInputText: null,
        },
        setState: setLogInState,
      },
      registerState: {
        state: {
          usernameInputText: '',
          passwordInputText: '',
          confirmPasswordInputText: '',
        },
        setState: setRegisterState,
      },
    };
    if (props.persistedStateLoaded) {
      this.nextMode = 'prompt';
    }

    this.contentHeight = new Value(props.dimensions.safeAreaHeight);
    this.modeValue = new Value(modeNumbers[this.nextMode]);

    this.buttonOpacity = new Value(props.persistedStateLoaded ? 1 : 0);
    this.panelPaddingTopValue = this.panelPaddingTop();
    this.panelOpacityValue = this.panelOpacity();
  }

  guardedSetState = (change: StateChange<State>, callback?: () => mixed) => {
    if (this.mounted) {
      this.setState(change, callback);
    }
  };

  setMode(newMode: LoggedOutMode) {
    this.nextMode = newMode;
    this.guardedSetState({ mode: newMode });
    this.modeValue.setValue(modeNumbers[newMode]);
  }

  proceedToNextMode = () => {
    this.guardedSetState({ mode: this.nextMode });
  };

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
    if (!prevProps.persistedStateLoaded && this.props.persistedStateLoaded) {
      this.setMode('prompt');
    }
    if (!prevProps.rehydrateConcluded && this.props.rehydrateConcluded) {
      this.onInitialAppLoad();
    }
    if (!prevProps.isForeground && this.props.isForeground) {
      this.onForeground();
    } else if (prevProps.isForeground && !this.props.isForeground) {
      this.onBackground();
    }

    if (this.state.mode === 'prompt' && prevState.mode !== 'prompt') {
      this.buttonOpacity.setValue(0);
      Animated.timing(this.buttonOpacity, {
        easing: EasingNode.out(EasingNode.ease),
        duration: 250,
        toValue: 1.0,
      }).start();
    }

    const newContentHeight = this.props.dimensions.safeAreaHeight;
    const oldContentHeight = prevProps.dimensions.safeAreaHeight;
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
    if (loggedIn === !!hasUserCookie) {
      return;
    }
    if (!__DEV__) {
      const actionSource = loggedIn
        ? appStartReduxLoggedInButInvalidCookie
        : appStartCookieLoggedInButInvalidRedux;
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
    this.props.dispatch({ type: resetUserStateActionType });
  }

  hardwareBack = () => {
    if (this.nextMode !== 'prompt') {
      this.goBackToPrompt();
      return true;
    }
    return false;
  };

  panelPaddingTop() {
    const headerHeight = Platform.OS === 'ios' ? 62.33 : 58.54;
    const promptButtonsSize = Platform.OS === 'ios' ? 40 : 61;
    const logInContainerSize = 140;
    const registerPanelSize = Platform.OS === 'ios' ? 181 : 180;

    const containerSize = add(
      headerHeight,
      cond(not(isPastPrompt(this.modeValue)), promptButtonsSize, 0),
      cond(eq(this.modeValue, modeNumbers['log-in']), logInContainerSize, 0),
      cond(eq(this.modeValue, modeNumbers['register']), registerPanelSize, 0),
    );
    const potentialPanelPaddingTop = divide(
      max(sub(this.contentHeight, this.keyboardHeightValue, containerSize), 0),
      2,
    );

    const panelPaddingTop = new Value(-1);
    const targetPanelPaddingTop = new Value(-1);
    const prevModeValue = new Value(modeNumbers[this.nextMode]);
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
            neq(isPastPrompt(prevModeValue), isPastPrompt(this.modeValue)),
            set(targetPanelPaddingTop, potentialPanelPaddingTop),
          ),
          set(prevModeValue, this.modeValue),
        ],
      ),
      ratchetAlongWithKeyboardHeight(this.keyboardHeightValue, [
        stopClock(clock),
        set(targetPanelPaddingTop, potentialPanelPaddingTop),
      ]),
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

  panelOpacity() {
    const targetPanelOpacity = isPastPrompt(this.modeValue);

    const panelOpacity = new Value(-1);
    const prevPanelOpacity = new Value(-1);
    const prevTargetPanelOpacity = new Value(-1);
    const clock = new Clock();
    return block([
      cond(lessThan(panelOpacity, 0), [
        set(panelOpacity, targetPanelOpacity),
        set(prevPanelOpacity, targetPanelOpacity),
        set(prevTargetPanelOpacity, targetPanelOpacity),
      ]),
      cond(greaterOrEq(this.keyboardHeightValue, 0), [
        cond(neq(targetPanelOpacity, prevTargetPanelOpacity), [
          stopClock(clock),
          set(prevTargetPanelOpacity, targetPanelOpacity),
        ]),
        cond(
          neq(panelOpacity, targetPanelOpacity),
          set(panelOpacity, runTiming(clock, panelOpacity, targetPanelOpacity)),
        ),
      ]),
      cond(
        and(eq(panelOpacity, 0), neq(prevPanelOpacity, 0)),
        call([], this.proceedToNextMode),
      ),
      set(prevPanelOpacity, panelOpacity),
      panelOpacity,
    ]);
  }

  keyboardShow = (event: KeyboardEvent) => {
    if (_isEqual(event.startCoordinates)(event.endCoordinates)) {
      return;
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
  };

  keyboardHide = () => {
    if (!this.activeAlert) {
      this.keyboardHeightValue.setValue(0);
    }
  };

  setActiveAlert = (activeAlert: boolean) => {
    this.activeAlert = activeAlert;
  };

  goBackToPrompt = () => {
    this.nextMode = 'prompt';
    this.keyboardHeightValue.setValue(0);
    this.modeValue.setValue(modeNumbers['prompt']);
    Keyboard.dismiss();
  };

  render() {
    let panel = null;
    let buttons = null;
    if (this.state.mode === 'log-in') {
      panel = (
        <LogInPanel
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.panelOpacityValue}
          logInState={this.state.logInState}
        />
      );
    } else if (this.state.mode === 'register') {
      panel = (
        <RegisterPanel
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.panelOpacityValue}
          registerState={this.state.registerState}
        />
      );
    } else if (this.state.mode === 'prompt') {
      const opacityStyle = { opacity: this.buttonOpacity };
      buttons = (
        <Animated.View style={[styles.buttonContainer, opacityStyle]}>
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
        </Animated.View>
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

    const windowWidth = this.props.dimensions.width;
    const buttonStyle = {
      opacity: this.panelOpacityValue,
      left: windowWidth < 360 ? 28 : 40,
    };
    const padding = { paddingTop: this.panelPaddingTopValue };

    const animatedContent = (
      <Animated.View style={[styles.animationContainer, padding]}>
        <View>
          <Text style={styles.header}>Comm</Text>
          <Animated.View style={[styles.backButton, buttonStyle]}>
            <TouchableOpacity activeOpacity={0.6} onPress={this.hardwareBack}>
              <Icon name="arrow-circle-o-left" size={36} color="#FFFFFFAA" />
            </TouchableOpacity>
          </Animated.View>
        </View>
        {panel}
      </Animated.View>
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
          <KeyboardAvoidingView behavior="padding" style={styles.container}>
            {animatedContent}
            {buttons}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </React.Fragment>
    );
  }

  onPressLogIn = () => {
    if (Platform.OS !== 'ios') {
      // For some strange reason, iOS's password management logic doesn't
      // realize that the username and password fields in LogInPanel are related
      // if the username field gets focused on mount. To avoid this issue we
      // need the username and password fields to both appear on-screen before
      // we focus the username field. However, when we set keyboardHeightValue
      // to -1 here, we are telling our Reanimated logic to wait until the
      // keyboard appears before showing LogInPanel. Since we need LogInPanel
      // to appear before the username field is focused, we need to avoid this
      // behavior on iOS.
      this.keyboardHeightValue.setValue(-1);
    }
    this.setMode('log-in');
  };

  onPressRegister = () => {
    this.keyboardHeightValue.setValue(-1);
    this.setMode('register');
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
  header: {
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'IBMPlexSans' : 'IBMPlexSans-Medium',
    fontSize: 56,
    fontWeight: '500',
    lineHeight: 66,
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

const ConnectedLoggedOutModal: React.ComponentType<{ ... }> = React.memo<{
  ...
}>(function ConnectedLoggedOutModal(props: { ... }) {
  const navContext = React.useContext(NavContext);
  const isForeground = isForegroundSelector(navContext);

  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated && navContext),
  );
  const persistedStateLoaded = usePersistedStateLoaded();
  const cookie = useSelector(state => state.cookie);
  const urlPrefix = useSelector(state => state.urlPrefix);
  const loggedIn = useSelector(isLoggedIn);
  const dimensions = useSelector(derivedDimensionsInfoSelector);
  const splashStyle = useSelector(splashStyleSelector);

  const dispatch = useDispatch();
  return (
    <LoggedOutModal
      {...props}
      isForeground={isForeground}
      persistedStateLoaded={persistedStateLoaded}
      rehydrateConcluded={rehydrateConcluded}
      cookie={cookie}
      urlPrefix={urlPrefix}
      loggedIn={loggedIn}
      dimensions={dimensions}
      splashStyle={splashStyle}
      dispatch={dispatch}
    />
  );
});

export default ConnectedLoggedOutModal;
