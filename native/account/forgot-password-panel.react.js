// @flow

import type { AppState } from '../redux-setup';
import type { Action } from '../navigation/navigation-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Alert,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  forgotPasswordActionTypes,
  forgotPassword,
} from 'lib/actions/user-actions';
import { connect } from 'lib/utils/redux-utils';
import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';

import { TextInput, usernamePlaceholder } from './modal-components.react';
import { PanelButton, Panel } from './panel-components.react';

type Props = {
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
type State = {
  usernameOrEmailInputText: string,
};
class ForgotPasswordPanel extends React.PureComponent<Props, State> {

  static propTypes = {
    setActiveAlert: PropTypes.func.isRequired,
    opacityValue: PropTypes.object.isRequired,
    onSuccess: PropTypes.func.isRequired,
    loadingStatus: PropTypes.string.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    forgotPassword: PropTypes.func.isRequired,
  };
  state = {
    usernameOrEmailInputText: "",
  };
  usernameOrEmailInput: ?TextInput;

  render() {
    return (
      <Panel opacityValue={this.props.opacityValue}>
        <View>
          <Icon name="user" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.state.usernameOrEmailInputText}
            onChangeText={this.onChangeUsernameOrEmailInputText}
            placeholder={usernamePlaceholder}
            autoFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            returnKeyType="go"
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.usernameOrEmailInputRef}
          />
        </View>
        <PanelButton
          text="RESET PASSWORD"
          loadingStatus={this.props.loadingStatus}
          onSubmit={this.onSubmit}
        />
      </Panel>
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
      forgotPasswordActionTypes,
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
  = createLoadingStatusSelector(forgotPasswordActionTypes);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
  }),
  { forgotPassword },
)(ForgotPasswordPanel);
