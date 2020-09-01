// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import {
  type VerifyField,
  verifyField,
  type HandleVerificationCodeResult,
} from 'lib/types/verify-types';
import type { KeyboardEvent } from '../keyboard/keyboard';
import {
  type DimensionsInfo,
  dimensionsInfoPropType,
} from '../redux/dimensions-updater.react';
import type { ImageStyle } from '../types/styles';
import type { RootNavigationProp } from '../navigation/root-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';

import * as React from 'react';
import {
  Image,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
  Keyboard,
  TouchableHighlight,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';
import PropTypes from 'prop-types';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated from 'react-native-reanimated';

import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { connect } from 'lib/utils/redux-utils';
import {
  handleVerificationCodeActionTypes,
  handleVerificationCode,
} from 'lib/actions/user-actions';
import sleep from 'lib/utils/sleep';

import ConnectedStatusBar from '../connected-status-bar.react';
import ResetPasswordPanel from './reset-password-panel.react';
import { createIsForegroundSelector } from '../navigation/nav-selectors';
import { splashBackgroundURI } from './background-info';
import { splashStyleSelector } from '../splash';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard/keyboard';
import { VerificationModalRouteName } from '../navigation/route-names';
import {
  connectNav,
  type NavContextType,
} from '../navigation/navigation-context';
import { runTiming } from '../utils/animation-utils';

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
  lessThan,
  greaterOrEq,
  sub,
  divide,
  max,
  stopClock,
  clockRunning,
} = Reanimated;
/* eslint-enable import/no-named-as-default-member */

export type VerificationModalParams = {|
  verifyCode: string,
|};

type VerificationModalMode = 'simple-text' | 'reset-password';
type Props = {
  navigation: RootNavigationProp<'VerificationModal'>,
  route: NavigationRoute<'VerificationModal'>,
  // Navigation state
  isForeground: boolean,
  // Redux state
  dimensions: DimensionsInfo,
  splashStyle: ImageStyle,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  handleVerificationCode: (
    code: string,
  ) => Promise<HandleVerificationCodeResult>,
};
type State = {
  mode: VerificationModalMode,
  verifyField: ?VerifyField,
  errorMessage: ?string,
  resetPasswordUsername: ?string,
  resetPasswordPanelOpacityValue: Animated.Value,
  onePasswordSupported: boolean,
};
class VerificationModal extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      clearRootModals: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
      key: PropTypes.string.isRequired,
      params: PropTypes.shape({
        verifyCode: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
    isForeground: PropTypes.bool.isRequired,
    dimensions: dimensionsInfoPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    handleVerificationCode: PropTypes.func.isRequired,
  };

  keyboardShowListener: ?Object;
  keyboardHideListener: ?Object;
  expectingKeyboardToAppear = false;

  activeAlert = false;
  activeKeyboard = false;
  opacityChangeQueued = false;
  keyboardHeight = 0;
  nextMode: VerificationModalMode = 'simple-text';

  contentHeight: Reanimated.Value;
  keyboardHeightValue = new Reanimated.Value(0);
  modeValue: Reanimated.Value;

  paddingTopValue: Reanimated.Value;

  constructor(props: Props) {
    super(props);
    this.state = {
      mode: 'simple-text',
      verifyField: null,
      errorMessage: null,
      resetPasswordUsername: null,
      resetPasswordPanelOpacityValue: new Animated.Value(0),
      onePasswordSupported: false,
    };
    const { height: windowHeight, topInset, bottomInset } = props.dimensions;

    this.contentHeight = new Reanimated.Value(
      windowHeight - topInset - bottomInset,
    );
    this.modeValue = new Reanimated.Value(
      VerificationModal.getModeNumber(this.nextMode),
    );

    this.paddingTopValue = this.paddingTop();
  }

  static getModeNumber(mode: VerificationModalMode) {
    if (mode === 'simple-text') {
      return 0;
    } else if (mode === 'reset-password') {
      return 1;
    }
    invariant(false, `${mode} is not a valid VerificationModalMode`);
  }

  paddingTop() {
    const potentialPaddingTop = divide(
      max(
        sub(
          this.contentHeight,
          cond(eq(this.modeValue, 0), 90),
          cond(eq(this.modeValue, 1), 165),
          this.keyboardHeightValue,
        ),
        0,
      ),
      2,
    );

    const paddingTop = new Reanimated.Value(-1);
    const targetPaddingTop = new Reanimated.Value(-1);
    const prevModeValue = new Reanimated.Value(
      VerificationModal.getModeNumber(this.nextMode),
    );
    const clock = new Clock();
    const keyboardTimeoutClock = new Clock();
    return block([
      cond(lessThan(paddingTop, 0), [
        set(paddingTop, potentialPaddingTop),
        set(targetPaddingTop, potentialPaddingTop),
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
          set(targetPaddingTop, potentialPaddingTop),
          set(prevModeValue, this.modeValue),
        ],
      ),
      cond(
        neq(paddingTop, targetPaddingTop),
        set(paddingTop, runTiming(clock, paddingTop, targetPaddingTop)),
      ),
      paddingTop,
    ]);
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

  componentDidMount() {
    this.determineOnePasswordSupport();

    this.props.dispatchActionPromise(
      handleVerificationCodeActionTypes,
      this.handleVerificationCodeAction(),
    );

    Keyboard.dismiss();

    if (this.props.isForeground) {
      this.onForeground();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      this.state.verifyField === verifyField.EMAIL &&
      prevState.verifyField !== verifyField.EMAIL
    ) {
      sleep(1500).then(this.dismiss);
    }

    const prevCode = prevProps.route.params.verifyCode;
    const code = this.props.route.params.verifyCode;
    if (code !== prevCode) {
      Keyboard.dismiss();
      this.nextMode = 'simple-text';
      this.modeValue.setValue(VerificationModal.getModeNumber(this.nextMode));
      this.keyboardHeightValue.setValue(0);
      this.setState({
        mode: this.nextMode,
        verifyField: null,
        errorMessage: null,
        resetPasswordUsername: null,
      });
      this.props.dispatchActionPromise(
        handleVerificationCodeActionTypes,
        this.handleVerificationCodeAction(),
      );
    }

    if (this.props.isForeground && !prevProps.isForeground) {
      this.onForeground();
    } else if (!this.props.isForeground && prevProps.isForeground) {
      this.onBackground();
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
  }

  dismiss = () => {
    this.props.navigation.clearRootModals([this.props.route.key]);
  };

  onResetPasswordSuccess = async () => {
    let opacityListenerID: ?string = null;
    const opacityListener = (animatedUpdate: { value: number }) => {
      if (animatedUpdate.value === 0) {
        this.setState({ mode: this.nextMode });
        invariant(opacityListenerID, 'should be set');
        this.state.resetPasswordPanelOpacityValue.removeListener(
          opacityListenerID,
        );
      }
    };
    opacityListenerID = this.state.resetPasswordPanelOpacityValue.addListener(
      opacityListener,
    );

    this.opacityChangeQueued = true;
    this.nextMode = 'simple-text';
    this.modeValue.setValue(VerificationModal.getModeNumber(this.nextMode));
    this.keyboardHeightValue.setValue(0);

    if (this.activeKeyboard) {
      // If keyboard is currently active, keyboardHide will handle the
      // animation. This is so we can run all animations in parallel
      Keyboard.dismiss();
    } else {
      this.animateKeyboardDownOrBackToSimpleText(null);
    }

    // Wait a couple seconds before letting the SUCCESS action propagate and
    // clear VerificationModal
    await sleep(1750);

    this.dismiss();
  };

  async handleVerificationCodeAction() {
    const code = this.props.route.params.verifyCode;
    try {
      const result = await this.props.handleVerificationCode(code);
      if (result.verifyField === verifyField.EMAIL) {
        this.setState({ verifyField: result.verifyField });
      } else if (result.verifyField === verifyField.RESET_PASSWORD) {
        this.opacityChangeQueued = true;
        this.nextMode = 'reset-password';
        this.modeValue.setValue(VerificationModal.getModeNumber(this.nextMode));
        this.keyboardHeightValue.setValue(-1);
        this.setState({
          verifyField: result.verifyField,
          mode: 'reset-password',
          resetPasswordUsername: result.resetPasswordUsername,
        });
        if (this.activeKeyboard) {
          // If keyboard isn't currently active, keyboardShow will handle the
          // animation. This is so we can run all animations in parallel
          this.animateToResetPassword();
        } else if (Platform.OS === 'ios') {
          this.expectingKeyboardToAppear = true;
        }
      }
    } catch (e) {
      if (e.message === 'invalid_code') {
        this.setState({ errorMessage: 'Invalid verification code' });
      } else {
        this.setState({ errorMessage: 'Unknown error occurred' });
      }
      throw e;
    }
  }

  animateToResetPassword(inputDuration: ?number = null) {
    const duration = inputDuration ? inputDuration : 150;
    const animations = [];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(this.state.resetPasswordPanelOpacityValue, {
          ...animatedSpec,
          duration,
          toValue: 1,
        }),
      );
    }
    Animated.parallel(animations).start();
  }

  keyboardShow = (event: KeyboardEvent) => {
    if (this.expectingKeyboardToAppear) {
      this.expectingKeyboardToAppear = false;
    }
    this.keyboardHeight = Platform.select({
      // Android doesn't include the bottomInset in this height measurement
      android: event.endCoordinates.height,
      default: Math.max(
        event.endCoordinates.height - this.props.dimensions.bottomInset,
        0,
      ),
    });
    this.keyboardHeightValue.setValue(this.keyboardHeight);
    if (this.activeKeyboard) {
      // We do this because the Android keyboard can change in height and we
      // don't want to bother animating between those events
      return;
    }
    this.activeKeyboard = true;
    this.animateToResetPassword(event.duration);
    this.opacityChangeQueued = false;
  };

  animateKeyboardDownOrBackToSimpleText(inputDuration: ?number) {
    const duration = inputDuration ? inputDuration : 250;
    const animations = [];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(this.state.resetPasswordPanelOpacityValue, {
          ...animatedSpec,
          duration,
          toValue: 0,
        }),
      );
    }
    Animated.parallel(animations).start();
  }

  keyboardHide = (event: ?KeyboardEvent) => {
    if (!this.activeAlert) {
      this.keyboardHeightValue.setValue(0);
    }
    if (this.expectingKeyboardToAppear) {
      // On the iOS simulator, it's possible to disable the keyboard. In this
      // case, when a TextInput's autoFocus would normally cause keyboardShow
      // to trigger, keyboardHide is instead triggered. Since the Apple app
      // testers seem to use the iOS simulator, we need to support this case.
      this.expectingKeyboardToAppear = false;
      this.animateToResetPassword();
      return;
    }
    this.keyboardHeight = 0;
    this.activeKeyboard = false;
    if (this.activeAlert) {
      return;
    }
    this.animateKeyboardDownOrBackToSimpleText(event && event.duration);
    this.opacityChangeQueued = false;
  };

  setActiveAlert = (activeAlert: boolean) => {
    this.activeAlert = activeAlert;
  };

  render() {
    const statusBar = <ConnectedStatusBar barStyle="light-content" />;
    const background = (
      <Image
        source={{ uri: splashBackgroundURI }}
        style={[styles.modalBackground, this.props.splashStyle]}
      />
    );
    const closeButton = (
      <TouchableHighlight
        onPress={this.dismiss}
        style={styles.closeButton}
        underlayColor="#A0A0A0DD"
      >
        <Icon
          name="close"
          size={20}
          color="white"
          style={styles.closeButtonIcon}
        />
      </TouchableHighlight>
    );
    let content;
    if (this.state.mode === 'reset-password') {
      const code = this.props.route.params.verifyCode;
      invariant(this.state.resetPasswordUsername, 'should be set');
      content = (
        <ResetPasswordPanel
          verifyCode={code}
          username={this.state.resetPasswordUsername}
          onePasswordSupported={this.state.onePasswordSupported}
          onSuccess={this.onResetPasswordSuccess}
          setActiveAlert={this.setActiveAlert}
          opacityValue={this.state.resetPasswordPanelOpacityValue}
        />
      );
    } else if (this.state.errorMessage) {
      content = (
        <View style={styles.contentContainer}>
          <Icon
            name="exclamation"
            size={48}
            color="#FF0000DD"
            style={styles.icon}
          />
          <Text style={styles.loadingText}>{this.state.errorMessage}</Text>
        </View>
      );
    } else if (this.state.verifyField !== null) {
      let message;
      if (this.state.verifyField === verifyField.EMAIL) {
        message = 'Thanks for verifying your email!';
      } else {
        message = 'Your password has been reset.';
      }
      content = (
        <View style={styles.contentContainer}>
          <Icon
            name="check-circle"
            size={48}
            color="#88FF88DD"
            style={styles.icon}
          />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      );
    } else {
      content = (
        <View style={styles.contentContainer}>
          <ActivityIndicator color="white" size="large" />
          <Text style={styles.loadingText}>Verifying code...</Text>
        </View>
      );
    }
    const padding = { paddingTop: this.paddingTopValue };
    const animatedContent = (
      <Reanimated.View style={padding}>{content}</Reanimated.View>
    );
    return (
      <React.Fragment>
        {background}
        <SafeAreaView style={styles.container} edges={safeAreaEdges}>
          <View style={styles.container}>
            {statusBar}
            {animatedContent}
            {closeButton}
          </View>
        </SafeAreaView>
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  closeButton: {
    backgroundColor: '#D0D0D055',
    borderRadius: 3,
    height: 36,
    position: 'absolute',
    right: 15,
    top: 15,
    width: 36,
  },
  closeButtonIcon: {
    left: 10,
    position: 'absolute',
    top: 8,
  },
  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  contentContainer: {
    height: 90,
  },
  icon: {
    textAlign: 'center',
  },
  loadingText: {
    bottom: 0,
    color: 'white',
    fontSize: 20,
    left: 0,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
  },
  modalBackground: {
    height: ('100%': number | string),
    position: 'absolute',
    width: ('100%': number | string),
  },
});

registerFetchKey(handleVerificationCodeActionTypes);

const isForegroundSelector = createIsForegroundSelector(
  VerificationModalRouteName,
);
export default connectNav((context: ?NavContextType) => ({
  isForeground: isForegroundSelector(context),
}))(
  connect(
    (state: AppState) => ({
      dimensions: state.dimensions,
      splashStyle: splashStyleSelector(state),
    }),
    { handleVerificationCode },
  )(VerificationModal),
);
