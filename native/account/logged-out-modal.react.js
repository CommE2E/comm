// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import {
  View,
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
import { useDispatch } from 'react-redux';

import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { logInActionSources } from 'lib/types/account-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import { fetchNewCookieFromNativeCredentials } from 'lib/utils/action-utils.js';

import { splashBackgroundURI } from './background-info.js';
import LogInPanel from './log-in-panel.react.js';
import type { LogInState } from './log-in-panel.react.js';
import LoggedOutStaffInfo from './logged-out-staff-info.react.js';
import RegisterPanel from './register-panel.react.js';
import type { RegisterState } from './register-panel.react.js';
import SIWEPanel from './siwe-panel.react.js';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react.js';
import ConnectedStatusBar from '../connected-status-bar.react.js';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard/keyboard.js';
import { createIsForegroundSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  LoggedOutModalRouteName,
  RegistrationRouteName,
} from '../navigation/route-names.js';
import { resetUserStateActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { usePersistedStateLoaded } from '../selectors/app-state-selectors.js';
import {
  type DerivedDimensionsInfo,
  derivedDimensionsInfoSelector,
} from '../selectors/dimensions-selectors.js';
import { splashStyleSelector } from '../splash.js';
import { useStyles } from '../themes/colors.js';
import type {
  EventSubscription,
  KeyboardEvent,
} from '../types/react-native.js';
import type { ImageStyle } from '../types/styles.js';
import {
  runTiming,
  ratchetAlongWithKeyboardHeight,
} from '../utils/animation-utils.js';
import {
  type StateContainer,
  type StateChange,
  setStateForContainer,
} from '../utils/state-container.js';
import EthereumLogo from '../vectors/ethereum-logo.react.js';

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

export type LoggedOutMode =
  | 'loading'
  | 'prompt'
  | 'log-in'
  | 'register'
  | 'siwe';
const modeNumbers: { [LoggedOutMode]: number } = {
  'loading': 0,
  'prompt': 1,
  'log-in': 2,
  'register': 3,
  'siwe': 4,
};
function isPastPrompt(modeValue: Node) {
  return and(
    neq(modeValue, modeNumbers['loading']),
    neq(modeValue, modeNumbers['prompt']),
  );
}

type BaseProps = {
  +navigation: RootNavigationProp<'LoggedOutModal'>,
  +route: NavigationRoute<'LoggedOutModal'>,
};

type Props = {
  ...BaseProps,
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
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatch: Dispatch,
};
type State = {
  +mode: LoggedOutMode,
  +nextMode: LoggedOutMode,
  +logInState: StateContainer<LogInState>,
  +registerState: StateContainer<RegisterState>,
};
class LoggedOutModal extends React.PureComponent<Props, State> {
  keyboardShowListener: ?EventSubscription;
  keyboardHideListener: ?EventSubscription;

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

    const initialMode = props.persistedStateLoaded ? 'prompt' : 'loading';
    this.state = {
      mode: initialMode,
      nextMode: initialMode,
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
    this.nextMode = initialMode;

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
    this.guardedSetState({ mode: newMode, nextMode: newMode });
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
        ? logInActionSources.appStartReduxLoggedInButInvalidCookie
        : logInActionSources.appStartCookieLoggedInButInvalidRedux;
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
    const siwePanelSize = 250;

    const containerSize = add(
      headerHeight,
      cond(not(isPastPrompt(this.modeValue)), promptButtonsSize, 0),
      cond(eq(this.modeValue, modeNumbers['log-in']), logInContainerSize, 0),
      cond(eq(this.modeValue, modeNumbers['register']), registerPanelSize, 0),
      cond(eq(this.modeValue, modeNumbers['siwe']), siwePanelSize, 0),
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
    if (
      event.startCoordinates &&
      _isEqual(event.startCoordinates)(event.endCoordinates)
    ) {
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
    this.guardedSetState({ nextMode: 'prompt' });
    this.keyboardHeightValue.setValue(0);
    this.modeValue.setValue(modeNumbers['prompt']);
    Keyboard.dismiss();
  };

  render() {
    const { styles } = this.props;

    const siweButton = (
      <>
        <TouchableOpacity
          onPress={this.onPressSIWE}
          style={[styles.button, styles.siweButton]}
          activeOpacity={0.6}
        >
          <View style={styles.siweIcon}>
            <EthereumLogo />
          </View>
          <Text style={[styles.buttonText, styles.siweButtonText]}>
            Sign in with Ethereum
          </Text>
        </TouchableOpacity>
        <View style={styles.siweOr}>
          <View style={styles.siweOrLeftHR} />
          <Text style={styles.siweOrText}>or</Text>
          <View style={styles.siweOrRightHR} />
        </View>
      </>
    );

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

      const registerButtons = [];
      registerButtons.push(
        <TouchableOpacity
          onPress={this.onPressRegister}
          style={[styles.button, styles.classicAuthButton]}
          activeOpacity={0.6}
          key="old"
        >
          <Text style={[styles.buttonText, styles.classicAuthButtonText]}>
            Register
          </Text>
        </TouchableOpacity>,
      );
      if (__DEV__) {
        registerButtons.push(
          <TouchableOpacity
            onPress={this.onPressNewRegister}
            style={[styles.button, styles.classicAuthButton]}
            activeOpacity={0.6}
            key="new"
          >
            <Text style={[styles.buttonText, styles.classicAuthButtonText]}>
              Register (new)
            </Text>
          </TouchableOpacity>,
        );
      }

      buttons = (
        <Animated.View style={[styles.buttonContainer, opacityStyle]}>
          <LoggedOutStaffInfo />
          {siweButton}
          <TouchableOpacity
            onPress={this.onPressLogIn}
            style={[styles.button, styles.classicAuthButton]}
            activeOpacity={0.6}
          >
            <Text style={[styles.buttonText, styles.classicAuthButtonText]}>
              Sign in
            </Text>
          </TouchableOpacity>
          <View style={styles.registerButtons}>{registerButtons}</View>
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

    let siwePanel;
    if (this.state.mode === 'siwe') {
      siwePanel = (
        <SIWEPanel
          onClose={this.goBackToPrompt}
          nextMode={this.state.nextMode}
        />
      );
    }

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
        {siwePanel}
      </React.Fragment>
    );
  }

  onPressSIWE = () => {
    this.setMode('siwe');
  };

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

  onPressNewRegister = () => {
    this.props.navigation.navigate(RegistrationRouteName);
  };
}

const unboundStyles = {
  animationContainer: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 13,
  },
  button: {
    borderRadius: 4,
    marginBottom: 4,
    marginTop: 4,
    marginLeft: 4,
    marginRight: 4,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 14,
    flex: 1,
  },
  buttonContainer: {
    bottom: 0,
    left: 0,
    marginLeft: 26,
    marginRight: 26,
    paddingBottom: 20,
    position: 'absolute',
    right: 0,
  },
  buttonText: {
    fontFamily: 'OpenSans-Semibold',
    fontSize: 17,
    textAlign: 'center',
  },
  classicAuthButton: {
    backgroundColor: 'purpleButton',
  },
  classicAuthButtonText: {
    color: 'whiteText',
  },
  registerButtons: {
    flexDirection: 'row',
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
  siweButton: {
    backgroundColor: 'siweButton',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  siweButtonText: {
    color: 'siweButtonText',
  },
  siweOr: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 18,
    marginTop: 14,
  },
  siweOrLeftHR: {
    borderColor: 'logInSpacer',
    borderTopWidth: 1,
    flex: 1,
    marginRight: 18,
    marginTop: 10,
  },
  siweOrRightHR: {
    borderColor: 'logInSpacer',
    borderTopWidth: 1,
    flex: 1,
    marginLeft: 18,
    marginTop: 10,
  },
  siweOrText: {
    color: 'whiteText',
    fontSize: 17,
    textAlign: 'center',
  },
  siweIcon: {
    paddingRight: 10,
  },
};

const isForegroundSelector = createIsForegroundSelector(
  LoggedOutModalRouteName,
);

const ConnectedLoggedOutModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedLoggedOutModal(props: BaseProps) {
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
    const styles = useStyles(unboundStyles);

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
        styles={styles}
        dispatch={dispatch}
      />
    );
  });

export default ConnectedLoggedOutModal;
