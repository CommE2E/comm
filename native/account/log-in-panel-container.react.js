// @flow

import type { InnerLogInPanel } from './log-in-panel.react';

import React from 'react';
import {
  View,
  Animated,
  Text,
  Easing,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import sleep from 'lib/utils/sleep';

import { windowWidth } from '../dimensions';
import LogInPanel from './log-in-panel.react';
import ForgotPasswordPanel from './forgot-password-panel.react';

type LogInMode = "log-in" | "forgot-password" | "forgot-password-success";

class LogInPanelContainer extends React.PureComponent {

  props: {
    onePasswordSupported: bool,
    setActiveAlert: (activeAlert: bool) => void,
    opacityValue: Animated.Value,
    forgotPasswordLinkOpacity: Animated.Value,
  };
  static propTypes = {
    onePasswordSupported: PropTypes.bool.isRequired,
    setActiveAlert: PropTypes.func.isRequired,
    opacityValue: PropTypes.object.isRequired,
    forgotPasswordLinkOpacity: PropTypes.object.isRequired,
  };
  state: {
    panelTransition: Animated.Value,
    logInMode: LogInMode,
    nextLogInMode: LogInMode,
  } = {
    panelTransition: new Animated.Value(0),
    logInMode: "log-in",
    nextLogInMode: "log-in",
  };
  logInPanel: ?InnerLogInPanel = null;

  render() {
    const logInPanelDynamicStyle = {
      left: this.state.panelTransition.interpolate({
        inputRange: [0, 2],
        outputRange: [0, windowWidth * -2],
      }),
      right: this.state.panelTransition.interpolate({
        inputRange: [0, 2],
        outputRange: [0, windowWidth * 2],
      }),
    };
    const logInPanel = (
      <Animated.View style={[styles.panel, logInPanelDynamicStyle]}>
        <LogInPanel
          setActiveAlert={this.props.setActiveAlert}
          opacityValue={this.props.opacityValue}
          onePasswordSupported={this.props.onePasswordSupported}
          innerRef={this.logInPanelRef}
        />
      </Animated.View>
    );
    let forgotPasswordPanel = null;
    if (
      this.state.nextLogInMode !== "log-in" ||
        this.state.logInMode !== "log-in"
    ) {
      const forgotPasswordPanelDynamicStyle = {
        left: this.state.panelTransition.interpolate({
          inputRange: [0, 2],
          outputRange: [windowWidth, windowWidth * -1],
        }),
        right: this.state.panelTransition.interpolate({
          inputRange: [0, 2],
          outputRange: [windowWidth * -1, windowWidth],
        }),
      };
      forgotPasswordPanel = (
        <Animated.View style={[styles.panel, forgotPasswordPanelDynamicStyle]}>
          <ForgotPasswordPanel
            setActiveAlert={this.props.setActiveAlert}
            opacityValue={this.props.opacityValue}
            onSuccess={this.onForgotPasswordSuccess}
          />
        </Animated.View>
      );
    }
    let forgotPasswordSuccess = null;
    if (
      this.state.nextLogInMode === "forgot-password-success" ||
        this.state.logInMode === "forgot-password-success"
    ) {
      const forgotPasswordSuccessDynamicStyle = {
        left: this.state.panelTransition.interpolate({
          inputRange: [0, 2],
          outputRange: [windowWidth * 2, 0],
        }),
        right: this.state.panelTransition.interpolate({
          inputRange: [0, 2],
          outputRange: [windowWidth * -2, 0],
        }),
      };
      forgotPasswordSuccess = (
        <Animated.View
          style={[styles.panel, forgotPasswordSuccessDynamicStyle]}
        >
          <Icon
            name="check-circle"
            size={48}
            color="#88FF88DD"
            style={styles.forgotPasswordSuccessIcon}
          />
          <Text style={styles.forgotPasswordSuccessText}>
            Okay, we've sent that account an email. Check your inbox to
            complete the process.
          </Text>
        </Animated.View>
      );
    }
    return (
      <View>
        {logInPanel}
        {forgotPasswordPanel}
        {forgotPasswordSuccess}
      </View>
    );
  }

  logInPanelRef = (logInPanel: ?InnerLogInPanel) => {
    this.logInPanel = logInPanel;
  }

  onPressForgotPassword = () => {
    this.setState({ nextLogInMode: "forgot-password" });

    const duration = 350;
    const animations = [
      Animated.timing(
        this.props.forgotPasswordLinkOpacity,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: 0,
        },
      ),
      Animated.timing(
        this.state.panelTransition,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: 1,
        },
      ),
    ];

    let listenerID = -1;
    const listener = (animatedUpdate: { value: number }) => {
      if (animatedUpdate.value === 1) {
        this.setState({ logInMode: this.state.nextLogInMode });
        this.state.panelTransition.removeListener(listenerID);
      }
    }
    listenerID = this.state.panelTransition.addListener(listener);

    Animated.parallel(animations).start();
  }

  backFromLogInMode = () => {
    if (this.state.nextLogInMode === "log-in") {
      return false;
    }

    this.setState({
      logInMode: this.state.nextLogInMode,
      nextLogInMode: "log-in",
    });
    invariant(this.logInPanel, "ref should be set");
    this.logInPanel.focusUsernameOrEmailInput();

    const duration = 350;
    const animations = [
      Animated.timing(
        this.props.forgotPasswordLinkOpacity,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: 1,
        },
      ),
      Animated.timing(
        this.state.panelTransition,
        {
          duration,
          easing: Easing.out(Easing.ease),
          toValue: 0,
        },
      ),
    ];

    let listenerID = -1;
    const listener = (animatedUpdate: { value: number }) => {
      if (animatedUpdate.value === 0) {
        this.setState({ logInMode: this.state.nextLogInMode });
        this.state.panelTransition.removeListener(listenerID);
      }
    }
    listenerID = this.state.panelTransition.addListener(listener);

    Animated.parallel(animations).start();
    return true;
  }

  onForgotPasswordSuccess = () => {
    if (this.state.nextLogInMode === "log-in") {
      return;
    }

    this.setState({ nextLogInMode: "forgot-password-success" });

    const duration = 350;

    let listenerID = -1;
    const listener = (animatedUpdate: { value: number }) => {
      if (animatedUpdate.value === 2) {
        this.setState({ logInMode: this.state.nextLogInMode });
        this.state.panelTransition.removeListener(listenerID);
      }
    }
    listenerID = this.state.panelTransition.addListener(listener);

    Animated.timing(
      this.state.panelTransition,
      {
        duration,
        easing: Easing.out(Easing.ease),
        toValue: 2,
      },
    ).start();

    this.inCoupleSecondsNavigateToLogIn().then();
  }

  async inCoupleSecondsNavigateToLogIn() {
    await sleep(2350);
    this.backFromLogInMode();
  }

}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  forgotPasswordSuccessIcon: {
    marginTop: 40,
    textAlign: 'center',
  },
  forgotPasswordSuccessText: {
    marginTop: 10,
    marginLeft: 20,
    marginRight: 20,
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
  },
});

export default LogInPanelContainer;
