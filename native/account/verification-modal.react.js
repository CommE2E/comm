// @flow

import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { AppState } from '../redux-setup';
import type { HandleVerificationCodeResult } from 'lib/actions/user-actions';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import type { VerifyField } from 'lib/utils/verify-utils';
import type { KeyboardEvent } from '../keyboard';

import React from 'react';
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
} from 'react-native';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';
import PropTypes from 'prop-types';

import { registerFetchKey } from 'lib/reducers/loading-reducer';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  handleVerificationCodeActionTypes,
  handleVerificationCode,
} from 'lib/actions/user-actions';
import { verifyField } from 'lib/utils/verify-utils';
import sleep from 'lib/utils/sleep';

import { windowHeight } from '../dimensions';
import ConnectedStatusBar from '../connected-status-bar.react';
import ResetPasswordPanel from './reset-password-panel.react';
import { createIsForegroundSelector } from '../selectors/nav-selectors';
import { navigateToAppActionType } from '../navigation-setup';

type VerificationModalMode = "simple-text" | "reset-password";
type Props = {
  navigation: NavigationScreenProp<NavigationLeafRoute>
    & { state: { params: { verifyCode: string } } },
  // Redux state
  isForeground: bool,
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
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    handleVerificationCode: PropTypes.func.isRequired,
  };
  state = {
    mode: "simple-text",
    paddingTop: new Animated.Value(
      InnerVerificationModal.currentPaddingTop("simple-text", 0),
    ),
    verifyField: null,
    errorMessage: null,
    resetPasswordUsername: null,
    resetPasswordPanelOpacityValue: new Animated.Value(0),
    onePasswordSupported: false,
  };
  activeAlert = false;
  keyboardShowListener: ?Object;
  keyboardHideListener: ?Object;
  activeKeyboard = false;
  opacityChangeQueued = false;
  keyboardHeight = 0;
  nextMode: VerificationModalMode = "simple-text";

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
    const code = this.props.navigation.state.params.verifyCode;
    this.props.dispatchActionPromise(
      handleVerificationCodeActionTypes,
      this.handleVerificationCodeAction(code),
    );
    Keyboard.dismiss();
  }

  componentDidMount() {
    if (this.props.isForeground) {
      this.onForeground();
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    const nextCode = nextProps.navigation.state.params.verifyCode;
    if (nextCode !== this.props.navigation.state.params.verifyCode) {
      Keyboard.dismiss();
      this.setState({
        mode: "simple-text",
        paddingTop: new Animated.Value(
          InnerVerificationModal.currentPaddingTop("simple-text", 0),
        ),
        verifyField: null,
        errorMessage: null,
        resetPasswordUsername: null,
      });
      this.props.dispatchActionPromise(
        handleVerificationCodeActionTypes,
        this.handleVerificationCodeAction(nextCode),
      );
    }
    if (!this.props.isForeground && nextProps.isForeground) {
      this.onForeground();
    } else if (this.props.isForeground && !nextProps.isForeground) {
      this.onBackground();
    }
  }

  onForeground() {
    this.keyboardShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      this.keyboardShow,
    );
    this.keyboardHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      this.keyboardHide,
    );
    BackHandler.addEventListener('hardwareBackPress', this.hardwareBack);
  }

  onBackground() {
    if (this.keyboardShowListener) {
      this.keyboardShowListener.remove();
      this.keyboardShowListener = null;
    }
    if (this.keyboardHideListener) {
      this.keyboardHideListener.remove();
      this.keyboardHideListener = null;
    }
    BackHandler.removeEventListener('hardwareBackPress', this.hardwareBack);
  }

  hardwareBack = () => {
    this.props.navigation.goBack();
    return true;
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (nextState.verifyField === verifyField.EMAIL) {
      sleep(1500).then(this.hardwareBack);
    }
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

    this.inCoupleSecondsNavigateToApp().then();
  }

  async inCoupleSecondsNavigateToApp() {
    await sleep(1750);
    this.props.dispatchActionPayload(navigateToAppActionType, null);
  }

  async handleVerificationCodeAction(code: string) {
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
          this.animateToResetPassword(null);
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

  static currentPaddingTop(
    mode: VerificationModalMode,
    keyboardHeight: number,
  ) {
    let containerSize = 0;
    if (mode === "simple-text") {
      containerSize = 90;
    } else if (mode === "reset-password") {
      containerSize = 165;
    }
    return (windowHeight - containerSize - keyboardHeight) / 2;
  }

  animateToResetPassword(inputDuration: ?number) {
    const duration = inputDuration ? inputDuration : 150;
    const animations = [
      Animated.timing(
        this.state.paddingTop,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: InnerVerificationModal.currentPaddingTop(
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
          toValue: InnerVerificationModal.currentPaddingTop(this.nextMode, 0),
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
        source={require("../img/logged-out-modal-background.jpg")}
        style={styles.modalBackgroundContainer}
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
      <View style={styles.container}>
        {statusBar}
        {background}
        {animatedContent}
        {closeButton}
      </View>
    );
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
    top: Platform.OS === "ios" ? 25 : 15,
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

const VerificationModalRouteName = 'VerificationModal';
const isForegroundSelector =
  createIsForegroundSelector(VerificationModalRouteName);
const VerificationModal = connect(
  (state: AppState) => ({
    cookie: state.cookie,
    isForeground: isForegroundSelector(state),
  }),
  includeDispatchActionProps,
  bindServerCalls({ handleVerificationCode }),
)(InnerVerificationModal);

export {
  VerificationModal,
  VerificationModalRouteName,
};
