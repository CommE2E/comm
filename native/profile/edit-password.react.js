// @flow

import { CommonActions } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import {
  Text,
  View,
  TextInput as BaseTextInput,
  ActivityIndicator,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  useChangeIdentityUserPassword,
  changeIdentityUserPasswordActionTypes,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import {
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { setNativeCredentials } from '../account/native-credentials.js';
import Button from '../components/button.react.js';
import TextInput from '../components/text-input.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

const unboundStyles = {
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  hr: {
    backgroundColor: 'panelForegroundBorder',
    height: 1,
    marginHorizontal: 15,
  },
  input: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 9,
  },
  saveButton: {
    backgroundColor: 'vibrantGreenButton',
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 24,
    marginVertical: 12,
    padding: 12,
  },
  saveText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingVertical: 3,
  },
};

type BaseProps = {
  +navigation: ProfileNavigationProp<'EditPassword'>,
  +route: NavigationRoute<'EditPassword'>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +loadingStatus: LoadingStatus,
  +username: ?string,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +changeIdentityUserPassword: (
    oldPassword: string,
    newPassword: string,
  ) => Promise<void>,
};
type State = {
  +currentPassword: string,
  +newPassword: string,
  +confirmPassword: string,
};
class EditPassword extends React.PureComponent<Props, State> {
  state: State = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  mounted = false;
  currentPasswordInput: ?React.ElementRef<typeof BaseTextInput>;
  newPasswordInput: ?React.ElementRef<typeof BaseTextInput>;
  confirmPasswordInput: ?React.ElementRef<typeof BaseTextInput>;

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render(): React.Node {
    const buttonContent =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text style={this.props.styles.saveText}>Save</Text>
      );
    const { panelForegroundTertiaryLabel } = this.props.colors;
    return (
      <ScrollView
        contentContainerStyle={this.props.styles.scrollViewContentContainer}
        style={this.props.styles.scrollView}
      >
        <Text style={this.props.styles.header}>CURRENT PASSWORD</Text>
        <View style={this.props.styles.section}>
          <View style={this.props.styles.row}>
            <TextInput
              style={this.props.styles.input}
              value={this.state.currentPassword}
              onChangeText={this.onChangeCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={panelForegroundTertiaryLabel}
              secureTextEntry={true}
              textContentType="password"
              autoComplete="password"
              autoCapitalize="none"
              autoFocus={true}
              returnKeyType="next"
              onSubmitEditing={this.focusNewPassword}
              ref={this.currentPasswordRef}
            />
          </View>
        </View>
        <Text style={this.props.styles.header}>NEW PASSWORD</Text>
        <View style={this.props.styles.section}>
          <View style={this.props.styles.row}>
            <TextInput
              style={this.props.styles.input}
              value={this.state.newPassword}
              onChangeText={this.onChangeNewPassword}
              placeholder="New password"
              placeholderTextColor={panelForegroundTertiaryLabel}
              secureTextEntry={true}
              textContentType="newPassword"
              autoComplete="password-new"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={this.focusConfirmPassword}
              ref={this.newPasswordRef}
            />
          </View>
          <View style={this.props.styles.hr} />
          <View style={this.props.styles.row}>
            <TextInput
              style={this.props.styles.input}
              value={this.state.confirmPassword}
              onChangeText={this.onChangeConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={panelForegroundTertiaryLabel}
              secureTextEntry={true}
              textContentType="newPassword"
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={this.submitPassword}
              ref={this.confirmPasswordRef}
            />
          </View>
        </View>
        <Button
          onPress={this.submitPassword}
          style={this.props.styles.saveButton}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  onChangeCurrentPassword = (currentPassword: string) => {
    this.setState({ currentPassword });
  };

  currentPasswordRef = (
    currentPasswordInput: ?React.ElementRef<typeof BaseTextInput>,
  ) => {
    this.currentPasswordInput = currentPasswordInput;
  };

  focusCurrentPassword = () => {
    invariant(this.currentPasswordInput, 'currentPasswordInput should be set');
    this.currentPasswordInput.focus();
  };

  onChangeNewPassword = (newPassword: string) => {
    this.setState({ newPassword });
  };

  newPasswordRef = (
    newPasswordInput: ?React.ElementRef<typeof BaseTextInput>,
  ) => {
    this.newPasswordInput = newPasswordInput;
  };

  focusNewPassword = () => {
    invariant(this.newPasswordInput, 'newPasswordInput should be set');
    this.newPasswordInput.focus();
  };

  onChangeConfirmPassword = (confirmPassword: string) => {
    this.setState({ confirmPassword });
  };

  confirmPasswordRef = (
    confirmPasswordInput: ?React.ElementRef<typeof BaseTextInput>,
  ) => {
    this.confirmPasswordInput = confirmPasswordInput;
  };

  focusConfirmPassword = () => {
    invariant(this.confirmPasswordInput, 'confirmPasswordInput should be set');
    this.confirmPasswordInput.focus();
  };

  goBackOnce() {
    this.props.navigation.dispatch(state => ({
      ...CommonActions.goBack(),
      target: state.key,
    }));
  }

  submitPassword = () => {
    if (this.state.newPassword === '') {
      Alert.alert(
        'Empty password',
        'New password cannot be empty',
        [{ text: 'OK', onPress: this.onNewPasswordAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (this.state.newPassword !== this.state.confirmPassword) {
      Alert.alert(
        'Passwords don’t match',
        'New password fields must contain the same password',
        [{ text: 'OK', onPress: this.onNewPasswordAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (this.state.newPassword === this.state.currentPassword) {
      this.goBackOnce();
    } else {
      void this.props.dispatchActionPromise(
        changeIdentityUserPasswordActionTypes,
        this.savePassword(),
      );
    }
  };

  async savePassword() {
    const { username } = this.props;
    if (!username) {
      return;
    }
    try {
      await this.props.changeIdentityUserPassword(
        this.state.currentPassword,
        this.state.newPassword,
      );
      await setNativeCredentials({
        username,
        password: this.state.newPassword,
      });
      this.goBackOnce();
    } catch (e) {
      const messageForException = getMessageForException(e);
      if (
        messageForException === 'invalid_credentials' ||
        messageForException === 'login_failed'
      ) {
        Alert.alert(
          'Incorrect password',
          'The current password you entered is incorrect',
          [{ text: 'OK', onPress: this.onCurrentPasswordAlertAcknowledged }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          unknownErrorAlertDetails.title,
          unknownErrorAlertDetails.message,
          [{ text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged }],
          { cancelable: false },
        );
      }
    }
  }

  onNewPasswordAlertAcknowledged = () => {
    this.setState(
      { newPassword: '', confirmPassword: '' },
      this.focusNewPassword,
    );
  };

  onCurrentPasswordAlertAcknowledged = () => {
    this.setState({ currentPassword: '' }, this.focusCurrentPassword);
  };

  onUnknownErrorAlertAcknowledged = () => {
    this.setState(
      { currentPassword: '', newPassword: '', confirmPassword: '' },
      this.focusCurrentPassword,
    );
  };
}

const loadingStatusSelector = createLoadingStatusSelector(
  changeIdentityUserPasswordActionTypes,
);

const ConnectedEditPassword: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedEditPassword(props: BaseProps) {
    const loadingStatus = useSelector(loadingStatusSelector);
    const username = useSelector(state => {
      if (state.currentUserInfo && !state.currentUserInfo.anonymous) {
        return state.currentUserInfo.username;
      }
      return undefined;
    });
    const colors = useColors();
    const styles = useStyles(unboundStyles);

    const dispatchActionPromise = useDispatchActionPromise();
    const callChangeIdentityUserPassword = useChangeIdentityUserPassword();

    return (
      <EditPassword
        {...props}
        loadingStatus={loadingStatus}
        username={username}
        colors={colors}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        changeIdentityUserPassword={callChangeIdentityUserPassword}
      />
    );
  });

export default ConnectedEditPassword;
