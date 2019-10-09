// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { AppState } from '../redux/redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import {
  type VerifyField,
  verifyField,
  type HandleVerificationCodeResult,
} from 'lib/types/verify-types';
import type { KeyboardEvent } from '../keyboard';
import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';
import type { ImageStyle } from '../types/styles';

import * as React from 'react';
import {
  Image,
  Text,
  View,
  StyleSheet,
  BackHandler,
  ActivityIndicator,
  Animated,
  Platform,
  Keyboard,
  TouchableHighlight,
  Easing,
  DeviceInfo,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';
import PropTypes from 'prop-types';

import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { connect } from 'lib/utils/redux-utils';
import {
  handleVerificationCodeActionTypes,
  handleVerificationCode,
} from 'lib/actions/user-actions';
import sleep from 'lib/utils/sleep';

import { dimensionsSelector } from '../selectors/dimension-selectors';
import ConnectedStatusBar from '../connected-status-bar.react';
import ResetPasswordPanel from './reset-password-panel.react';
import { createIsForegroundSelector } from '../selectors/nav-selectors';
import { navigateToAppActionType } from '../redux/action-types';
import { splashBackgroundURI } from './background-info';
import { splashStyleSelector } from '../splash';
import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from '../keyboard';
import { VerificationModalRouteName } from '../navigation/route-names';
import SafeAreaView from '../components/safe-area-view.react';

type VerificationModalMode = "simple-text" | "reset-password";
type Props = {
  navigation:
    & { state: { params: { verifyCode: string } } }
    & NavigationScreenProp<NavigationLeafRoute>,
  // Redux state
  isForeground: bool,
  dimensions: Dimensions,
  splashStyle: ImageStyle,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  handleVerificationCode:
    (code: string) => Promise<HandleVerificationCodeResult>,
};
type State = {
  mode: VerificationModalMode,
  paddingTop: Animated.Value,
  verifyField: ?VerifyField,
  errorMessage: ?string,
  resetPasswordUsername: ?string,
  resetPasswordPanelOpacityValue: Animated.Value,
  onePasswordSupported: bool,
};
class InnerVerificationModal extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          verifyCode: PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    isForeground: PropTypes.bool.isRequired,
    dimensions: dimensionsPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    handleVerificationCode: PropTypes.func.isRequired,
  };

  state = {
    mode: "simple-text",
    paddingTop: new Animated.Value(
      this.currentPaddingTop("simple-text", 0),
    ),
    verifyField: null,
    errorMessage: null,
    resetPasswordUsername: null,
    resetPasswordPanelOpacityValue: new Animated.Value(0),
    onePasswordSupported: false,
  };

  keyboardShowListener: ?Object;
  keyboardHideListener: ?Object;
  expectingKeyboardToAppear = false;

  activeAlert = false;
  activeKeyboard = false;
  opacityChangeQueued = false;
  keyboardHeight = 0;
  nextMode: VerificationModalMode = "simple-text";

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
      sleep(1500).then(this.hardwareBack);
    }

    const prevCode = prevProps.navigation.state.params.verifyCode;
    const code = this.props.navigation.state.params.verifyCode;
    if (code !== prevCode) {
      Keyboard.dismiss();
      this.setState({
        mode: "simple-text",
        paddingTop: new Animated.Value(
          this.currentPaddingTop("simple-text", 0),
        ),
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

  hardwareBack = () => {
    this.props.navigation.goBack();
    return true;
  }

  onResetPasswordSuccess = () => {
    let opacityListenerID: ?string = null;
    const opacityListener = (animatedUpdate: { value: number }) => {
      if (animatedUpdate.value === 0) {
        this.setState({ mode: this.nextMode });
        invariant(opacityListenerID, "should be set");
        this.state.resetPasswordPanelOpacityValue.removeListener(
          opacityListenerID,
        );
      }
    }
    opacityListenerID = this.state.resetPasswordPanelOpacityValue.addListener(
      opacityListener,
    );

    this.opacityChangeQueued = true;
    this.nextMode = "simple-text";

    if (this.activeKeyboard) {
      // If keyboard is currently active, keyboardHide will handle the
      // animation. This is so we can run all animations in parallel
      Keyboard.dismiss();
    } else {
      this.animateKeyboardDownOrBackToSimpleText(null);
    }

    this.inCoupleSecondsNavigateToApp();
  }

  async inCoupleSecondsNavigateToApp() {
    await sleep(1750);
    this.props.dispatchActionPayload(navigateToAppActionType, null);
  }

  async handleVerificationCodeAction() {
    const code = this.props.navigation.state.params.verifyCode;
    try {
      const result = await this.props.handleVerificationCode(code);
      if (result.verifyField === verifyField.EMAIL) {
        this.setState({ verifyField: result.verifyField });
      } else if (result.verifyField === verifyField.RESET_PASSWORD) {
        this.opacityChangeQueued = true;
        this.nextMode = "reset-password";
        this.setState({
          verifyField: result.verifyField,
          mode: "reset-password",
          resetPasswordUsername: result.resetPasswordUsername,
        });
        if (this.activeKeyboard) {
          // If keyboard isn't currently active, keyboardShow will handle the
          // animation. This is so we can run all animations in parallel
          this.animateToResetPassword();
        } else if (Platform.OS === "ios") {
          this.expectingKeyboardToAppear = true;
        }
      }
    } catch (e) {
      if (e.message === 'invalid_code') {
        this.setState({ errorMessage: "Invalid verification code" });
      } else {
        this.setState({ errorMessage: "Unknown error occurred" });
      }
      throw e;
    }
  }

  currentPaddingTop(
    mode: VerificationModalMode,
    keyboardHeight: number,
  ) {
    const windowHeight = this.props.dimensions.height;
    let containerSize = 0;
    if (mode === "simple-text") {
      containerSize = 90;
    } else if (mode === "reset-password") {
      containerSize = 165;
    }
    return (windowHeight - containerSize - keyboardHeight) / 2;
  }

  animateToResetPassword(inputDuration: ?number = null) {
    const duration = inputDuration ? inputDuration : 150;
    const animations = [
      Animated.timing(
        this.state.paddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: this.currentPaddingTop(
            this.state.mode,
            this.keyboardHeight,
          ),
        },
      ),
    ];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(
          this.state.resetPasswordPanelOpacityValue,
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
    if (this.expectingKeyboardToAppear) {
      this.expectingKeyboardToAppear = false;
    }
    this.keyboardHeight = event.endCoordinates.height;
    if (this.activeKeyboard) {
      // We do this because the Android keyboard can change in height and we
      // don't want to bother animating between those events
      return;
    }
    this.activeKeyboard = true;
    this.animateToResetPassword(event.duration);
    this.opacityChangeQueued = false;
  }

  animateKeyboardDownOrBackToSimpleText(inputDuration: ?number) {
    const duration = inputDuration ? inputDuration : 250;
    const animations = [
      Animated.timing(
        this.state.paddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: this.currentPaddingTop(this.nextMode, 0),
        },
      ),
    ];
    if (this.opacityChangeQueued) {
      animations.push(
        Animated.timing(
          this.state.resetPasswordPanelOpacityValue,
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
  }

  setActiveAlert = (activeAlert: bool) => {
    this.activeAlert = activeAlert;
  }

  render() {
    const statusBar = <ConnectedStatusBar barStyle="light-content" />;
    const background = (
      <Image
        source={{ uri: splashBackgroundURI }}
        style={[ styles.modalBackground, this.props.splashStyle ]}
      />
    );
    const closeButton = (
      <TouchableHighlight
        onPress={this.hardwareBack}
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
    if (this.state.mode === "reset-password") {
      const code = this.props.navigation.state.params.verifyCode;
      invariant(this.state.resetPasswordUsername, "should be set");
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
        message = "Thanks for verifying your email!";
      } else {
        message = "Your password has been reset.";
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
    const padding = { paddingTop: this.state.paddingTop };
    const animatedContent = (
      <Animated.View style={[styles.animationContainer, padding]}>
        {content}
      </Animated.View>
    );
    return (
      <React.Fragment>
        {background}
        <SafeAreaView style={styles.container}>
          {statusBar}
          {animatedContent}
          {closeButton}
        </SafeAreaView>
      </React.Fragment>
    );
  }

}

const closeButtonTop = Platform.OS === "ios"
  ? (DeviceInfo.isIPhoneX_deprecated ? 49 : 25)
  : 15;

const styles = StyleSheet.create({
  modalBackground: {
    position: 'absolute',
    width: ('100%': number | string),
    height: ('100%': number | string),
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    height: 90,
  },
  animationContainer: {
  },
  loadingText: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'white',
    fontSize: 20,
  },
  icon: {
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    backgroundColor: "#D0D0D055",
    top: closeButtonTop,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 3,
  },
  closeButtonIcon: {
    position: 'absolute',
    left: 10,
    top: 8,
  },
});

registerFetchKey(handleVerificationCodeActionTypes);

const isForegroundSelector =
  createIsForegroundSelector(VerificationModalRouteName);
const VerificationModal = connect(
  (state: AppState) => ({
    isForeground: isForegroundSelector(state),
    dimensions: dimensionsSelector(state),
    splashStyle: splashStyleSelector(state),
  }),
  { handleVerificationCode },
)(InnerVerificationModal);

export default VerificationModal;
