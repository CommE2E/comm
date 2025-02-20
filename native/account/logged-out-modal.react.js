// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import { useNavigation } from '@react-navigation/native';
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
import {
  Easing,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsLoggedInToAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { setActiveSessionRecoveryActionType } from 'lib/keyserver-conn/keyserver-conn-types.js';
import { usePersistedStateLoaded } from 'lib/selectors/app-state-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { useTunnelbroker } from 'lib/tunnelbroker/tunnelbroker-context.js';
import { recoveryFromReduxActionSources } from 'lib/types/account-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  usingCommServicesAccessToken,
  useIsRestoreFlowEnabled,
} from 'lib/utils/services-utils.js';

import { splashBackgroundURI } from './background-info.js';
import FullscreenSIWEPanel from './fullscreen-siwe-panel.react.js';
import LogInPanel from './log-in-panel.react.js';
import type { LogInState } from './log-in-panel.react.js';
import LoggedOutStaffInfo from './logged-out-staff-info.react.js';
import PromptButton from './prompt-button.react.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react.js';
import ConnectedStatusBar from '../connected-status-bar.react.js';
import { useRatchetingKeyboardHeight } from '../keyboard/animated-keyboard.js';
import { createIsForegroundSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  LoggedOutModalRouteName,
  AuthRouteName,
  QRCodeScreenRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { derivedDimensionsInfoSelector } from '../selectors/dimensions-selectors.js';
import { splashStyleSelector } from '../splash.js';
import { useStyles } from '../themes/colors.js';
import { AnimatedView } from '../types/styles.js';

let initialAppLoad = true;
const safeAreaEdges = ['top', 'bottom'];

export type LoggedOutMode = 'loading' | 'prompt' | 'log-in' | 'siwe';

const timingConfig = {
  duration: 250,
  easing: Easing.out(Easing.ease),
};

function getPanelPaddingTop(
  modeValue: string,
  keyboardHeightValue: number,
  contentHeightValue: number,
): number {
  'worklet';
  const headerHeight = Platform.OS === 'ios' ? 62.33 : 58.54;
  let containerSize = headerHeight;
  if (modeValue === 'loading' || modeValue === 'prompt') {
    containerSize += Platform.OS === 'ios' ? 40 : 61;
  } else if (modeValue === 'log-in') {
    containerSize += 140;
  } else if (modeValue === 'siwe') {
    containerSize += 250;
  }

  const freeSpace = contentHeightValue - keyboardHeightValue - containerSize;
  const targetPanelPaddingTop = Math.max(freeSpace, 0) / 2;
  return withTiming(targetPanelPaddingTop, timingConfig);
}

function getPanelOpacity(
  modeValue: string,
  finishResettingToPrompt: () => void,
): number {
  'worklet';
  const targetPanelOpacity =
    modeValue === 'loading' || modeValue === 'prompt' ? 0 : 1;
  return withTiming(
    targetPanelOpacity,
    timingConfig,
    (succeeded /*?: boolean */) => {
      if (succeeded && targetPanelOpacity === 0) {
        runOnJS(finishResettingToPrompt)();
      }
    },
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
  buttonContainer: {
    bottom: 0,
    left: 0,
    marginLeft: 26,
    marginRight: 26,
    paddingBottom: 20,
    position: 'absolute',
    right: 0,
  },
  signInButtons: {
    flexDirection: 'row',
  },
  firstSignInButton: {
    marginRight: 8,
    flex: 1,
  },
  lastSignInButton: {
    marginLeft: 8,
    flex: 1,
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
};

const isForegroundSelector = createIsForegroundSelector(
  LoggedOutModalRouteName,
);

const backgroundSource = { uri: splashBackgroundURI };

const initialLogInState = {
  usernameInputText: null,
  passwordInputText: null,
};

type Mode = {
  +curMode: LoggedOutMode,
  +nextMode: LoggedOutMode,
};

type Props = {
  +navigation: RootNavigationProp<'LoggedOutModal'>,
  +route: NavigationRoute<'LoggedOutModal'>,
};
// eslint-disable-next-line no-unused-vars
function LoggedOutModal(props: Props) {
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

  const { socketState } = useTunnelbroker();
  const persistedStateLoaded = usePersistedStateLoaded();
  const canStartAuth = !socketState.isAuthorized && persistedStateLoaded;
  const initialMode = canStartAuth ? 'prompt' : 'loading';
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
  const contentHeight = useSharedValue(dimensions.safeAreaHeight);
  const modeValue = useSharedValue(initialMode);
  const buttonOpacity = useSharedValue(canStartAuth ? 1 : 0);

  const onPrompt = mode.curMode === 'prompt';
  const prevOnPromptRef = React.useRef(onPrompt);
  React.useEffect(() => {
    if (onPrompt && !prevOnPromptRef.current) {
      buttonOpacity.value = withTiming(1, {
        easing: Easing.out(Easing.ease),
      });
    }
    prevOnPromptRef.current = onPrompt;
  }, [onPrompt, buttonOpacity]);

  const curContentHeight = dimensions.safeAreaHeight;
  const prevContentHeightRef = React.useRef(curContentHeight);
  React.useEffect(() => {
    if (curContentHeight === prevContentHeightRef.current) {
      return;
    }
    prevContentHeightRef.current = curContentHeight;
    contentHeight.value = curContentHeight;
  }, [curContentHeight, contentHeight]);

  const combinedSetMode = React.useCallback(
    (newMode: LoggedOutMode) => {
      nextModeRef.current = newMode;
      setMode({ curMode: newMode, nextMode: newMode });
      modeValue.value = newMode;
    },
    [setMode, modeValue],
  );

  const goBackToPrompt = React.useCallback(() => {
    nextModeRef.current = 'prompt';
    setMode({ nextMode: 'prompt' });
    modeValue.value = 'prompt';
    Keyboard.dismiss();
  }, [setMode, modeValue]);

  const loadingCompleteRef = React.useRef(canStartAuth);
  React.useEffect(() => {
    if (!loadingCompleteRef.current && canStartAuth) {
      combinedSetMode('prompt');
      loadingCompleteRef.current = true;
    }
  }, [canStartAuth, combinedSetMode]);

  const [activeAlert, setActiveAlert] = React.useState(false);

  const navContext = React.useContext(NavContext);
  const isForeground = isForegroundSelector(navContext);

  const ratchetingKeyboardHeightInput = React.useMemo(
    () => ({
      ignoreKeyboardDismissal: activeAlert,
      disabled: !isForeground,
    }),
    [activeAlert, isForeground],
  );
  const keyboardHeightValue = useRatchetingKeyboardHeight(
    ratchetingKeyboardHeightInput,
  );

  // We remove the password from the TextInput on iOS before dismissing it,
  // because otherwise iOS will prompt the user to save the password if the
  // iCloud password manager is enabled. We'll put the password back after the
  // dismissal concludes.
  const temporarilyHiddenPassword = React.useRef<?string>();

  const curLogInPassword = logInState.passwordInputText;
  const resetToPrompt = React.useCallback(() => {
    if (nextModeRef.current === 'prompt') {
      return false;
    }
    if (Platform.OS === 'ios' && curLogInPassword) {
      temporarilyHiddenPassword.current = curLogInPassword;
      setLogInState({ passwordInputText: null });
    }
    goBackToPrompt();
    return true;
  }, [goBackToPrompt, curLogInPassword, setLogInState]);

  const finishResettingToPrompt = React.useCallback(() => {
    setMode({ curMode: nextModeRef.current });
    if (temporarilyHiddenPassword.current) {
      setLogInState({ passwordInputText: temporarilyHiddenPassword.current });
      temporarilyHiddenPassword.current = null;
    }
  }, [setMode, setLogInState]);

  React.useEffect(() => {
    if (!isForeground) {
      return undefined;
    }
    BackHandler.addEventListener('hardwareBackPress', resetToPrompt);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', resetToPrompt);
    };
  }, [isForeground, resetToPrompt]);

  const rehydrateConcluded = useSelector(
    state => !!(state._persist && state._persist.rehydrated && navContext),
  );
  const isLoggedInToAuthKeyserver = useIsLoggedInToAuthoritativeKeyserver();
  const loggedIn = useSelector(isLoggedIn);
  const dispatch = useDispatch();
  React.useEffect(() => {
    // This gets triggered when an app is killed and restarted
    // Not when it is returned from being backgrounded
    if (!initialAppLoad || !rehydrateConcluded) {
      return;
    }
    initialAppLoad = false;

    if (usingCommServicesAccessToken || __DEV__) {
      return;
    }

    if (loggedIn === isLoggedInToAuthKeyserver) {
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
  }, [rehydrateConcluded, loggedIn, isLoggedInToAuthKeyserver, dispatch]);

  const onPressSIWE = React.useCallback(() => {
    combinedSetMode('siwe');
  }, [combinedSetMode]);

  const onPressLogIn = React.useCallback(() => {
    combinedSetMode('log-in');
  }, [combinedSetMode]);

  const { navigate } = useNavigation();
  const onPressQRCodeSignIn = React.useCallback(() => {
    navigate(AuthRouteName, {
      screen: QRCodeScreenRouteName,
    });
  }, [navigate]);

  const onPressNewRegister = React.useCallback(() => {
    navigate(AuthRouteName);
  }, [navigate]);

  const opacityStyle = useAnimatedStyle(() => ({
    opacity: getPanelOpacity(modeValue.value, finishResettingToPrompt),
  }));

  const styles = useStyles(unboundStyles);
  const panel = React.useMemo(() => {
    if (mode.curMode === 'log-in') {
      return (
        <LogInPanel
          setActiveAlert={setActiveAlert}
          opacityStyle={opacityStyle}
          logInState={logInStateContainer}
        />
      );
    } else if (mode.curMode === 'loading') {
      return (
        <ActivityIndicator
          color="white"
          size="large"
          style={styles.loadingIndicator}
        />
      );
    }
    return null;
  }, [
    mode.curMode,
    setActiveAlert,
    opacityStyle,
    logInStateContainer,
    styles.loadingIndicator,
  ]);

  const usingRestoreFlow = useIsRestoreFlowEnabled();

  const buttonsViewOpacity = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));
  const buttonsViewStyle = React.useMemo(
    () => [styles.buttonContainer, buttonsViewOpacity],
    [styles.buttonContainer, buttonsViewOpacity],
  );
  const buttons = React.useMemo(() => {
    if (mode.curMode !== 'prompt') {
      return null;
    }

    const signInButtons: Array<React.Element<any>> = [];
    if (!usingRestoreFlow) {
      signInButtons.push(
        <PromptButton
          text="Sign in"
          onPress={onPressLogIn}
          variant="enabled"
          key="login-form"
        />,
      );
    }
    if (__DEV__ || usingRestoreFlow) {
      const buttonText = usingRestoreFlow ? 'Sign in' : 'Sign in (QR)';
      signInButtons.push(
        <PromptButton
          text={buttonText}
          onPress={onPressQRCodeSignIn}
          variant="enabled"
          key="qr-code-login"
        />,
      );
    }

    if (signInButtons.length === 2) {
      signInButtons[0] = (
        <View style={styles.firstSignInButton} key="login-form">
          {signInButtons[0]}
        </View>
      );
      signInButtons[1] = (
        <View style={styles.lastSignInButton} key="qr-code-login">
          {signInButtons[1]}
        </View>
      );
    }

    let siweSection = null;
    if (!usingRestoreFlow) {
      siweSection = (
        <>
          <PromptButton
            text="Sign in with Ethereum"
            onPress={onPressSIWE}
            variant="siwe"
          />
          <View style={styles.siweOr}>
            <View style={styles.siweOrLeftHR} />
            <Text style={styles.siweOrText}>or</Text>
            <View style={styles.siweOrRightHR} />
          </View>
        </>
      );
    }

    return (
      <AnimatedView style={buttonsViewStyle}>
        <LoggedOutStaffInfo />
        {siweSection}
        <View style={styles.signInButtons}>{signInButtons}</View>
        <PromptButton
          text="Register"
          onPress={onPressNewRegister}
          variant="enabled"
        />
      </AnimatedView>
    );
  }, [
    mode.curMode,
    onPressNewRegister,
    onPressLogIn,
    onPressQRCodeSignIn,
    onPressSIWE,
    buttonsViewStyle,
    styles.firstSignInButton,
    styles.lastSignInButton,
    styles.siweOr,
    styles.siweOrLeftHR,
    styles.siweOrText,
    styles.siweOrRightHR,
    styles.signInButtons,
    usingRestoreFlow,
  ]);

  const windowWidth = dimensions.width;
  const backButtonStyle = React.useMemo(
    () => [
      styles.backButton,
      opacityStyle,
      { left: windowWidth < 360 ? 28 : 40 },
    ],
    [styles.backButton, opacityStyle, windowWidth],
  );

  const paddingTopStyle = useAnimatedStyle(() => ({
    paddingTop: getPanelPaddingTop(
      modeValue.value,
      keyboardHeightValue.value,
      contentHeight.value,
    ),
  }));
  const animatedContentStyle = React.useMemo(
    () => [styles.animationContainer, paddingTopStyle],
    [styles.animationContainer, paddingTopStyle],
  );
  const animatedContent = React.useMemo(
    () => (
      <AnimatedView style={animatedContentStyle}>
        <View>
          <Text style={styles.header}>Comm</Text>
          <AnimatedView style={backButtonStyle}>
            <TouchableOpacity activeOpacity={0.6} onPress={resetToPrompt}>
              <Icon name="arrow-circle-o-left" size={36} color="#FFFFFFAA" />
            </TouchableOpacity>
          </AnimatedView>
        </View>
        {panel}
      </AnimatedView>
    ),
    [
      animatedContentStyle,
      styles.header,
      backButtonStyle,
      resetToPrompt,
      panel,
    ],
  );

  const curModeIsSIWE = mode.curMode === 'siwe';
  const nextModeIsPrompt = mode.nextMode === 'prompt';
  const siwePanel = React.useMemo(() => {
    if (!curModeIsSIWE) {
      return null;
    }
    return (
      <FullscreenSIWEPanel
        goBackToPrompt={goBackToPrompt}
        closing={nextModeIsPrompt}
      />
    );
  }, [curModeIsSIWE, goBackToPrompt, nextModeIsPrompt]);

  const splashStyle = useSelector(splashStyleSelector);
  const backgroundStyle = React.useMemo(
    () => [styles.modalBackground, splashStyle],
    [styles.modalBackground, splashStyle],
  );
  return React.useMemo(
    () => (
      <>
        <ConnectedStatusBar barStyle="light-content" />
        <Image source={backgroundSource} style={backgroundStyle} />
        <SafeAreaView style={styles.container} edges={safeAreaEdges}>
          <KeyboardAvoidingView behavior="padding" style={styles.container}>
            {animatedContent}
            {buttons}
          </KeyboardAvoidingView>
        </SafeAreaView>
        {siwePanel}
      </>
    ),
    [backgroundStyle, styles.container, animatedContent, buttons, siwePanel],
  );
}

const MemoizedLoggedOutModal: React.ComponentType<Props> =
  React.memo<Props>(LoggedOutModal);

export default MemoizedLoggedOutModal;
