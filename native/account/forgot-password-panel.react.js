// @flow

import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import { connect } from 'react-redux';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  TouchableNativeFeedback,
  TouchableHighlight,
  Text,
  Animated,
  Alert,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import invariant from 'invariant';

import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  forgotPasswordActionType,
  forgotPassword,
} from 'lib/actions/user-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';

import { TextInput } from '../modal-components.react';

class ForgotPasswordPanel extends React.PureComponent {

  props: {
    setActiveAlert: (activeAlert: bool) => void,
    opacityValue: Animated.Value,
    onSuccess: () => void,
    // Redux state
    loadingStatus: LoadingStatus,
    // Redux dispatch functions
    dispatchActionPromise: DispatchActionPromise,
    // async functions that hit server APIs
    forgotPassword: (usernameOrEmail: string) => Promise<void>,
  };
  static propTypes = {
    setActiveAlert: React.PropTypes.func.isRequired,
    opacityValue: React.PropTypes.object.isRequired,
    onSuccess: React.PropTypes.func.isRequired,
    loadingStatus: React.PropTypes.string.isRequired,
    dispatchActionPromise: React.PropTypes.func.isRequired,
    forgotPassword: React.PropTypes.func.isRequired,
  };
  state: {
    usernameOrEmailInputText: string,
  } = {
    usernameOrEmailInputText: "",
  };
  usernameOrEmailInput: ?TextInput;

  render() {
    let buttonIcon;
    if (this.props.loadingStatus === "loading") {
      buttonIcon = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator color="#555" />
        </View>
      );
    } else {
      buttonIcon = (
        <View style={styles.submitContentIconContainer}>
          <Icon name="arrow-right" size={16} color="#555" />
        </View>
      );
    }
    let submitButton;
    if (Platform.OS === "android") {
      submitButton = (
        <TouchableNativeFeedback
          onPress={this.onSubmit}
          disabled={this.props.loadingStatus === "loading"}
        >
          <View style={[styles.submitContentContainer, styles.submitButton]}>
            <Text style={styles.submitContentText}>RESET PASSWORD</Text>
            {buttonIcon}
          </View>
        </TouchableNativeFeedback>
      );
    } else {
      submitButton = (
        <TouchableHighlight
          onPress={this.onSubmit}
          style={styles.submitButton}
          underlayColor="#A0A0A0DD"
          disabled={this.props.loadingStatus === "loading"}
        >
          <View style={styles.submitContentContainer}>
            <Text style={styles.submitContentText}>RESET PASSWORD</Text>
            {buttonIcon}
          </View>
        </TouchableHighlight>
      );
    }
    const opacityStyle = { opacity: this.props.opacityValue };
    return (
      <Animated.View style={[styles.container, opacityStyle]}>
        <View>
          <Icon name="user" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.state.usernameOrEmailInputText}
            onChangeText={this.onChangeUsernameOrEmailInputText}
            placeholder="Username or email address"
            autoFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            returnKeyType='go'
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.usernameOrEmailInputRef}
          />
        </View>
        {submitButton}
      </Animated.View>
    );
  }

  usernameOrEmailInputRef = (usernameOrEmailInput: ?TextInput) => {
    this.usernameOrEmailInput = usernameOrEmailInput;
  }

  onChangeUsernameOrEmailInputText = (text: string) => {
    this.setState({ usernameOrEmailInputText: text });
  }

  onSubmit = () => {
    this.props.setActiveAlert(true);
    if (
      this.state.usernameOrEmailInputText.search(validUsernameRegex) === -1 &&
      this.state.usernameOrEmailInputText.search(validEmailRegex) === -1
    ) {
      Alert.alert(
        "Invalid username",
        "Alphanumeric usernames or emails only",
        [
          { text: 'OK', onPress: this.onUsernameOrEmailAlertAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    }

    Keyboard.dismiss();
    this.props.dispatchActionPromise(
      forgotPasswordActionType,
      this.forgotPasswordAction(),
    );
  }

  onUsernameOrEmailAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.setState(
      {
        usernameOrEmailInputText: "",
      },
      () => {
        invariant(this.usernameOrEmailInput, "ref should exist");
        this.usernameOrEmailInput.focus();
      },
    );
  }
  
  async forgotPasswordAction() {
    try {
      await this.props.forgotPassword(this.state.usernameOrEmailInputText);
      this.props.setActiveAlert(false);
      this.props.onSuccess();
    } catch (e) {
      if (e.message === 'invalid_user') {
        Alert.alert(
          "User doesn't exist",
          "No user with that username or email exists",
          [
            { text: 'OK', onPress: this.onUsernameOrEmailAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "Unknown error",
          "Uhh... try again?",
          [
            { text: 'OK', onPress: this.onUsernameOrEmailAlertAcknowledged },
          ],
          { cancelable: false },
        );
      }
      throw e;
    }
  }

}

const styles = StyleSheet.create({
  submitContentIconContainer: {
    width: 14,
    paddingBottom: 5,
  },
  loadingIndicatorContainer: {
    width: 14,
    paddingBottom: 2,
  },
  submitButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 6,
  },
  submitContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 18,
    paddingTop: 6,
    paddingRight: 18,
    paddingBottom: 6,
  },
  submitContentText: {
    fontSize: 18,
    fontFamily: 'OpenSans-Semibold',
    color: "#555",
    paddingRight: 7,
  },
  container: {
    paddingBottom: 37,
    paddingTop: 6,
    paddingLeft: 18,
    paddingRight: 18,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 40,
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
  },
  input: {
    paddingLeft: 35,
  },
  icon: {
    position: 'absolute',
    bottom: 8,
    left: 4,
  },
});

const loadingStatusSelector
  = createLoadingStatusSelector(forgotPasswordActionType);

export default connect(
  (state: AppState) => ({
    cookie: state.cookie,
    loadingStatus: loadingStatusSelector(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ forgotPassword }),
)(ForgotPasswordPanel);
