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

import { setActiveSessionRecoveryActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import { cookieSelector } from 'lib/selectors/keyserver-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { recoveryFromReduxActionSources } from 'lib/types/account-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import { splashBackgroundURI } from './background-info.js';
import FullscreenSIWEPanel from './fullscreen-siwe-panel.react.js';
import LegacyRegisterPanel from './legacy-register-panel.react.js';
import type { LegacyRegisterState } from './legacy-register-panel.react.js';
import LogInPanel from './log-in-panel.react.js';
import type { LogInState } from './log-in-panel.react.js';
import LoggedOutStaffInfo from './logged-out-staff-info.react.js';
import { enableNewRegistrationMode } from './registration/registration-types.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
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
  QRCodeSignInNavigatorRouteName,
} from '../navigation/route-names.js';
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
import type { StateContainer } from '../utils/state-container.js';
import EthereumLogo from '../vectors/ethereum-logo.react.js';

let initialAppLoad = true;
const safeAreaEdges = ['top', 'bottom'];

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
  useValue,
} = Animated;

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
  signInButtons: {
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

type BaseProps = {
  +navigation: RootNavigationProp<'LoggedOutModal'>,
  +route: NavigationRoute<'LoggedOutModal'>,
};

type Props = {
  ...BaseProps,
  +logInStateContainer: StateContainer<LogInState>,
  +legacyRegisterStateContainer: StateContainer<LegacyRegisterState>,
  +mode: Mode,
  +nextModeRef: { current: LoggedOutMode },
  +contentHeight: Value,
  +keyboardHeightValue: Value,
  +buttonOpacity: Value,
  +panelPaddingTop: Node,
  +panelOpacity: Node,
  +combinedSetMode: LoggedOutMode => void,
  +goBackToPrompt: () => void,
  // Navigation state
  +isForeground: boolean,
  // Redux state
  +rehydrateConcluded: boolean,
  +cookie: ?string,
  +loggedIn: boolean,
  +dimensions: DerivedDimensionsInfo,
  +splashStyle: ImageStyle,
  +styles: $ReadOnly<typeof unboundStyles>,
  // Redux dispatch functions
  +dispatch: Dispatch,
};
class LoggedOutModal extends React.PureComponent<Props> {
  keyboardShowListener: ?EventSubscription;
  keyboardHideListener: ?EventSubscription;

  activeAlert = false;

  componentDidMount() {
    if (this.props.rehydrateConcluded) {
      this.onInitialAppLoad();
    }
    if (this.props.isForeground) {
      this.onForeground();
    }
  }

  componentWillUnmount() {
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

    if (
      this.props.mode.curMode === 'prompt' &&
      prevProps.mode.curMode !== 'prompt'
    ) {
      this.props.buttonOpacity.setValue(0);
      Animated.timing(this.props.buttonOpacity, {
        easing: EasingNode.out(EasingNode.ease),
        duration: 250,
        toValue: 1.0,
      }).start();
    }

    const newContentHeight = this.props.dimensions.safeAreaHeight;
    const oldContentHeight = prevProps.dimensions.safeAreaHeight;
    if (newContentHeight !== oldContentHeight) {
      this.props.contentHeight.setValue(newContentHeight);
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
  onInitialAppLoad() {
    if (!initialAppLoad) {
      return;
    }
    initialAppLoad = false;

    if (usingCommServicesAccessToken || __DEV__) {
      return;
    }

    const { loggedIn, cookie, dispatch } = this.props;
    const hasUserCookie = cookie && cookie.startsWith('user=');
    if (loggedIn === !!hasUserCookie) {
      return;
    }

    const actionSource = loggedIn
      ? recoveryFromReduxActionSources.appStartReduxLoggedInButInvalidCookie
      : recoveryFromReduxActionSources.appStartCookieLoggedInButInvalidRedux;
    dispatch({
      type: setActiveSessionRecoveryActionType,
      payload: {
        activeSessionRecovery: actionSource,
        keyserverID: authoritativeKeyserverID,
      },
    });
  }

  hardwareBack: () => boolean = () => {
    if (this.props.nextModeRef.current !== 'prompt') {
      this.props.goBackToPrompt();
      return true;
    }
    return false;
  };

  keyboardShow = (event: KeyboardEvent) => {
    if (
      event.startCoordinates &&
      _isEqual(event.startCoordinates)(event.endCoordinates)
    ) {
      return;
    }
    const keyboardHeight: number = Platform.select({
      // Android doesn't include the bottomInset in this height measurement
      android: event.endCoordinates.height,
      default: Math.max(
        event.endCoordinates.height - this.props.dimensions.bottomInset,
        0,
      ),
    });
    this.props.keyboardHeightValue.setValue(keyboardHeight);
  };

  keyboardHide = () => {
    if (!this.activeAlert) {
      this.props.keyboardHeightValue.setValue(0);
    }
  };

  setActiveAlert = (activeAlert: boolean) => {
    this.activeAlert = activeAlert;
  };

  render(): React.Node {
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
    if (this.props.mode.curMode === 'log-in') {
      panel = (
        <LogInPanel
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.props.panelOpacity}
          logInState={this.props.logInStateContainer}
        />
      );
    } else if (this.props.mode.curMode === 'register') {
      panel = (
        <LegacyRegisterPanel
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.props.panelOpacity}
          legacyRegisterState={this.props.legacyRegisterStateContainer}
        />
      );
    } else if (this.props.mode.curMode === 'prompt') {
      const opacityStyle = { opacity: this.props.buttonOpacity };

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
      if (enableNewRegistrationMode) {
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

      const signInButtons = [];
      signInButtons.push(
        <TouchableOpacity
          onPress={this.onPressLogIn}
          style={[styles.button, styles.classicAuthButton]}
          activeOpacity={0.6}
          key="login-form"
        >
          <Text style={[styles.buttonText, styles.classicAuthButtonText]}>
            Sign in
          </Text>
        </TouchableOpacity>,
      );
      if (__DEV__) {
        signInButtons.push(
          <TouchableOpacity
            onPress={this.onPressQRCodeSignIn}
            style={[styles.button, styles.classicAuthButton]}
            activeOpacity={0.6}
            key="qr-code-login"
          >
            <Text style={[styles.buttonText, styles.classicAuthButtonText]}>
              Sign in (QR)
            </Text>
          </TouchableOpacity>,
        );
      }

      buttons = (
        <Animated.View style={[styles.buttonContainer, opacityStyle]}>
          <LoggedOutStaffInfo />
          {siweButton}
          <View style={styles.signInButtons}>{signInButtons}</View>
          <View style={styles.registerButtons}>{registerButtons}</View>
        </Animated.View>
      );
    } else if (this.props.mode.curMode === 'loading') {
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
      opacity: this.props.panelOpacity,
      left: windowWidth < 360 ? 28 : 40,
    };
    const padding = { paddingTop: this.props.panelPaddingTop };

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
    if (this.props.mode.curMode === 'siwe') {
      siwePanel = (
        <FullscreenSIWEPanel
          goBackToPrompt={this.props.goBackToPrompt}
          closing={this.props.mode.nextMode === 'prompt'}
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
    this.props.combinedSetMode('siwe');
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
      this.props.keyboardHeightValue.setValue(-1);
    }
    this.props.combinedSetMode('log-in');
  };

  onPressQRCodeSignIn = () => {
    this.props.navigation.navigate(QRCodeSignInNavigatorRouteName);
  };

  onPressRegister = () => {
    this.props.keyboardHeightValue.setValue(-1);
    this.props.combinedSetMode('register');
  };

  onPressNewRegister = () => {
    this.props.navigation.navigate(RegistrationRouteName);
  };
}

const isForegroundSelector = createIsForegroundSelector(
  LoggedOutModalRouteName,
);

const initialLogInState = {
  usernameInputText: null,
  passwordInputText: null,
};
const initialLegacyRegisterState = {
  usernameInputText: '',
  passwordInputText: '',
  confirmPasswordInputText: '',
};

type Mode = {
  +curMode: LoggedOutMode,
  +nextMode: LoggedOutMode,
};

const ConnectedLoggedOutModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedLoggedOutModal(props: BaseProps) {
    const mountedRef = React.useRef(false);
    React.useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    const [logInState, baseSetLogInState] =
      React.useState<LogInState>(initialLogInState);
    const setLogInState = React.useCallback(
      (newLogInState: Partial<LogInState>) => {
        if (!mountedRef.current) {
          return;
        }
        baseSetLogInState(prevLogInState => ({
          ...prevLogInState,
          ...newLogInState,
        }));
      },
      [],
    );
    const logInStateContainer = React.useMemo(
      () => ({
        state: logInState,
        setState: setLogInState,
      }),
      [logInState, setLogInState],
    );

    const [legacyRegisterState, baseSetLegacyRegisterState] =
      React.useState<LegacyRegisterState>(initialLegacyRegisterState);
    const setLegacyRegisterState = React.useCallback(
      (newLegacyRegisterState: Partial<LegacyRegisterState>) => {
        if (!mountedRef.current) {
          return;
        }
        baseSetLegacyRegisterState(prevLegacyRegisterState => ({
          ...prevLegacyRegisterState,
          ...newLegacyRegisterState,
        }));
      },
      [],
    );
    const legacyRegisterStateContainer = React.useMemo(
      () => ({
        state: legacyRegisterState,
        setState: setLegacyRegisterState,
      }),
      [legacyRegisterState, setLegacyRegisterState],
    );

    const persistedStateLoaded = usePersistedStateLoaded();
    const initialMode = persistedStateLoaded ? 'prompt' : 'loading';
    const [mode, baseSetMode] = React.useState(() => ({
      curMode: initialMode,
      nextMode: initialMode,
    }));
    const setMode = React.useCallback((newMode: Partial<Mode>) => {
      if (!mountedRef.current) {
        return;
      }
      baseSetMode(prevMode => ({
        ...prevMode,
        ...newMode,
      }));
    }, []);

    const nextModeRef = React.useRef<LoggedOutMode>(initialMode);

    const dimensions = useSelector(derivedDimensionsInfoSelector);
    const contentHeight = useValue(dimensions.safeAreaHeight);
    const keyboardHeightValue = useValue(0);
    const modeValue = useValue(modeNumbers[initialMode]);
    const buttonOpacity = useValue(persistedStateLoaded ? 1 : 0);

    const prevModeValue = useValue(modeNumbers[initialMode]);
    const panelPaddingTop = React.useMemo(() => {
      const headerHeight = Platform.OS === 'ios' ? 62.33 : 58.54;
      const promptButtonsSize = Platform.OS === 'ios' ? 40 : 61;
      const logInContainerSize = 140;
      const registerPanelSize = Platform.OS === 'ios' ? 181 : 180;
      const siwePanelSize = 250;

      const containerSize = add(
        headerHeight,
        cond(not(isPastPrompt(modeValue)), promptButtonsSize, 0),
        cond(eq(modeValue, modeNumbers['log-in']), logInContainerSize, 0),
        cond(eq(modeValue, modeNumbers['register']), registerPanelSize, 0),
        cond(eq(modeValue, modeNumbers['siwe']), siwePanelSize, 0),
      );
      const potentialPanelPaddingTop = divide(
        max(sub(contentHeight, keyboardHeightValue, containerSize), 0),
        2,
      );

      const panelPaddingTopValue = new Value(-1);
      const targetPanelPaddingTop = new Value(-1);
      const clock = new Clock();
      const keyboardTimeoutClock = new Clock();
      return block([
        cond(lessThan(panelPaddingTopValue, 0), [
          set(panelPaddingTopValue, potentialPanelPaddingTop),
          set(targetPanelPaddingTop, potentialPanelPaddingTop),
        ]),
        cond(
          lessThan(keyboardHeightValue, 0),
          [
            runTiming(keyboardTimeoutClock, 0, 1, true, { duration: 500 }),
            cond(
              not(clockRunning(keyboardTimeoutClock)),
              set(keyboardHeightValue, 0),
            ),
          ],
          stopClock(keyboardTimeoutClock),
        ),
        cond(
          and(
            greaterOrEq(keyboardHeightValue, 0),
            neq(prevModeValue, modeValue),
          ),
          [
            stopClock(clock),
            cond(
              neq(isPastPrompt(prevModeValue), isPastPrompt(modeValue)),
              set(targetPanelPaddingTop, potentialPanelPaddingTop),
            ),
            set(prevModeValue, modeValue),
          ],
        ),
        ratchetAlongWithKeyboardHeight(keyboardHeightValue, [
          stopClock(clock),
          set(targetPanelPaddingTop, potentialPanelPaddingTop),
        ]),
        cond(
          neq(panelPaddingTopValue, targetPanelPaddingTop),
          set(
            panelPaddingTopValue,
            runTiming(clock, panelPaddingTopValue, targetPanelPaddingTop),
          ),
        ),
        panelPaddingTopValue,
      ]);
    }, [modeValue, contentHeight, keyboardHeightValue, prevModeValue]);

    const proceedToNextMode = React.useCallback(() => {
      setMode({ curMode: nextModeRef.current });
    }, [setMode]);
    const panelOpacity = React.useMemo(() => {
      const targetPanelOpacity = isPastPrompt(modeValue);

      const panelOpacityValue = new Value(-1);
      const prevPanelOpacity = new Value(-1);
      const prevTargetPanelOpacity = new Value(-1);
      const clock = new Clock();
      return block([
        cond(lessThan(panelOpacityValue, 0), [
          set(panelOpacityValue, targetPanelOpacity),
          set(prevPanelOpacity, targetPanelOpacity),
          set(prevTargetPanelOpacity, targetPanelOpacity),
        ]),
        cond(greaterOrEq(keyboardHeightValue, 0), [
          cond(neq(targetPanelOpacity, prevTargetPanelOpacity), [
            stopClock(clock),
            set(prevTargetPanelOpacity, targetPanelOpacity),
          ]),
          cond(
            neq(panelOpacityValue, targetPanelOpacity),
            set(
              panelOpacityValue,
              runTiming(clock, panelOpacityValue, targetPanelOpacity),
            ),
          ),
        ]),
        cond(
          and(eq(panelOpacityValue, 0), neq(prevPanelOpacity, 0)),
          call([], proceedToNextMode),
        ),
        set(prevPanelOpacity, panelOpacityValue),
        panelOpacityValue,
      ]);
    }, [modeValue, keyboardHeightValue, proceedToNextMode]);

    const combinedSetMode = React.useCallback(
      (newMode: LoggedOutMode) => {
        nextModeRef.current = newMode;
        setMode({ curMode: newMode, nextMode: newMode });
        modeValue.setValue(modeNumbers[newMode]);
      },
      [setMode, modeValue],
    );

    const goBackToPrompt = React.useCallback(() => {
      nextModeRef.current = 'prompt';
      setMode({ nextMode: 'prompt' });
      keyboardHeightValue.setValue(0);
      modeValue.setValue(modeNumbers['prompt']);
      Keyboard.dismiss();
    }, [setMode, keyboardHeightValue, modeValue]);

    const loadingCompleteRef = React.useRef(persistedStateLoaded);
    React.useEffect(() => {
      if (!loadingCompleteRef.current && persistedStateLoaded) {
        combinedSetMode('prompt');
        loadingCompleteRef.current = true;
      }
    }, [persistedStateLoaded, combinedSetMode]);

    const navContext = React.useContext(NavContext);
    const isForeground = isForegroundSelector(navContext);

    const rehydrateConcluded = useSelector(
      state => !!(state._persist && state._persist.rehydrated && navContext),
    );
    const cookie = useSelector(cookieSelector(authoritativeKeyserverID));
    const loggedIn = useSelector(isLoggedIn);
    const splashStyle = useSelector(splashStyleSelector);
    const styles = useStyles(unboundStyles);

    const dispatch = useDispatch();
    return (
      <LoggedOutModal
        {...props}
        logInStateContainer={logInStateContainer}
        legacyRegisterStateContainer={legacyRegisterStateContainer}
        mode={mode}
        nextModeRef={nextModeRef}
        contentHeight={contentHeight}
        keyboardHeightValue={keyboardHeightValue}
        buttonOpacity={buttonOpacity}
        panelPaddingTop={panelPaddingTop}
        panelOpacity={panelOpacity}
        combinedSetMode={combinedSetMode}
        goBackToPrompt={goBackToPrompt}
        isForeground={isForeground}
        rehydrateConcluded={rehydrateConcluded}
        cookie={cookie}
        loggedIn={loggedIn}
        dimensions={dimensions}
        splashStyle={splashStyle}
        styles={styles}
        dispatch={dispatch}
      />
    );
  });

export default ConnectedLoggedOutModal;
