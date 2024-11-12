// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
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
import { recoveryFromReduxActionSources } from 'lib/types/account-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  usingCommServicesAccessToken,
  usingRestoreFlow,
} from 'lib/utils/services-utils.js';

import { splashBackgroundURI } from './background-info.js';
import FullscreenSIWEPanel from './fullscreen-siwe-panel.react.js';
import LogInPanel from './log-in-panel.react.js';
import type { LogInState } from './log-in-panel.react.js';
import LoggedOutStaffInfo from './logged-out-staff-info.react.js';
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
  RegistrationRouteName,
  QRCodeSignInNavigatorRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { derivedDimensionsInfoSelector } from '../selectors/dimensions-selectors.js';
import { splashStyleSelector } from '../splash.js';
import { useStyles } from '../themes/colors.js';
import { AnimatedView } from '../types/styles.js';
import EthereumLogo from '../vectors/ethereum-logo.react.js';

let initialAppLoad = true;
const safeAreaEdges = ['top', 'bottom'];

export type LoggedOutMode =
  | 'loading'
  | 'prompt'
  | 'log-in'
  | 'siwe'
  | 'restore';

const timingConfig = {
  duration: 250,
  easing: Easing.out(Easing.ease),
};

// prettier-ignore
function getPanelPaddingTop(
  modeValue /*: string */,
  keyboardHeightValue /*: number */,
  contentHeightValue /*: number */,
) /*: number */ {
  'worklet';
  const headerHeight = Platform.OS === 'ios' ? 62.33 : 58.54;
  let containerSize = headerHeight;
  if (
    modeValue === 'loading' ||
    modeValue === 'prompt' ||
    modeValue === 'restore'
  ) {
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

// prettier-ignore
function getPanelOpacity(
  modeValue /*: string */,
  finishResettingToPrompt/*: () => void */,
) /*: number */ {
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
  const contentHeight = useSharedValue(dimensions.safeAreaHeight);
  const modeValue = useSharedValue(initialMode);
  const buttonOpacity = useSharedValue(persistedStateLoaded ? 1 : 0);

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

  const loadingCompleteRef = React.useRef(persistedStateLoaded);
  React.useEffect(() => {
    if (!loadingCompleteRef.current && persistedStateLoaded) {
      combinedSetMode('prompt');
      loadingCompleteRef.current = true;
    }
  }, [persistedStateLoaded, combinedSetMode]);

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

  const { navigate } = props.navigation;
  const onPressQRCodeSignIn = React.useCallback(() => {
    navigate(QRCodeSignInNavigatorRouteName);
  }, [navigate]);

  const onPressNewRegister = React.useCallback(() => {
    navigate(RegistrationRouteName);
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

  const classicAuthButtonStyle = React.useMemo(
    () => [styles.button, styles.classicAuthButton],
    [styles.button, styles.classicAuthButton],
  );
  const classicAuthButtonTextStyle = React.useMemo(
    () => [styles.buttonText, styles.classicAuthButtonText],
    [styles.buttonText, styles.classicAuthButtonText],
  );
  const siweAuthButtonStyle = React.useMemo(
    () => [styles.button, styles.siweButton],
    [styles.button, styles.siweButton],
  );
  const siweAuthButtonTextStyle = React.useMemo(
    () => [styles.buttonText, styles.siweButtonText],
    [styles.buttonText, styles.siweButtonText],
  );
  const buttonsViewOpacity = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));
  const buttonsViewStyle = React.useMemo(
    () => [styles.buttonContainer, buttonsViewOpacity],
    [styles.buttonContainer, buttonsViewOpacity],
  );
  const buttons = React.useMemo(() => {
    if (mode.curMode !== 'prompt' && mode.curMode !== 'restore') {
      return null;
    }

    const signInButtons = [];
    if (!usingRestoreFlow || mode.curMode === 'restore') {
      const buttonText =
        mode.curMode === 'restore' ? 'Sign in with password' : 'Sign in';
      signInButtons.push(
        <TouchableOpacity
          onPress={onPressLogIn}
          style={classicAuthButtonStyle}
          activeOpacity={0.6}
          key="login-form"
        >
          <Text style={classicAuthButtonTextStyle}>{buttonText}</Text>
        </TouchableOpacity>,
      );
    }
    if ((__DEV__ || usingRestoreFlow) && mode.curMode === 'prompt') {
      const buttonText = usingRestoreFlow ? 'Sign in' : 'Sign in (QR)';
      signInButtons.push(
        <TouchableOpacity
          onPress={onPressQRCodeSignIn}
          style={classicAuthButtonStyle}
          activeOpacity={0.6}
          key="qr-code-login"
        >
          <Text style={classicAuthButtonTextStyle}>{buttonText}</Text>
        </TouchableOpacity>,
      );
    }

    let siweSection = null;
    if (!usingRestoreFlow || mode.curMode === 'restore') {
      let siweOr = null;
      if (mode.curMode !== 'restore') {
        siweOr = (
          <View style={styles.siweOr}>
            <View style={styles.siweOrLeftHR} />
            <Text style={styles.siweOrText}>or</Text>
            <View style={styles.siweOrRightHR} />
          </View>
        );
      }
      siweSection = (
        <>
          <TouchableOpacity
            onPress={onPressSIWE}
            style={siweAuthButtonStyle}
            activeOpacity={0.6}
          >
            <View style={styles.siweIcon}>
              <EthereumLogo />
            </View>
            <Text style={siweAuthButtonTextStyle}>Sign in with Ethereum</Text>
          </TouchableOpacity>
          {siweOr}
        </>
      );
    }

    let registerButtons = null;
    if (mode.curMode === 'prompt') {
      registerButtons = (
        <View style={styles.registerButtons}>
          <TouchableOpacity
            onPress={onPressNewRegister}
            style={classicAuthButtonStyle}
            activeOpacity={0.6}
            key="new"
          >
            <Text style={classicAuthButtonTextStyle}>Register</Text>
          </TouchableOpacity>
        </View>
      );
    }

    let loggedOutStaffInfo = null;
    if (mode.curMode === 'prompt') {
      loggedOutStaffInfo = <LoggedOutStaffInfo />;
    }

    return (
      <AnimatedView style={buttonsViewStyle}>
        {loggedOutStaffInfo}
        {siweSection}
        <View style={styles.signInButtons}>{signInButtons}</View>
        {registerButtons}
      </AnimatedView>
    );
  }, [
    mode.curMode,
    onPressNewRegister,
    onPressLogIn,
    onPressQRCodeSignIn,
    onPressSIWE,
    classicAuthButtonStyle,
    classicAuthButtonTextStyle,
    siweAuthButtonStyle,
    siweAuthButtonTextStyle,
    buttonsViewStyle,
    styles.siweIcon,
    styles.siweOr,
    styles.siweOrLeftHR,
    styles.siweOrText,
    styles.siweOrRightHR,
    styles.signInButtons,
    styles.registerButtons,
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
