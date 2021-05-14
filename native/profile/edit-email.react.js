// @flow

import { CommonActions } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import {
  Text,
  View,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  changeUserSettingsActionTypes,
  changeUserSettings,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { validEmailRegex } from 'lib/shared/account-utils';
import type { ChangeUserSettingsResult } from 'lib/types/account-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { AccountUpdate } from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../components/button.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { type Colors, useColors, useStyles } from '../themes/colors';
import { type GlobalTheme } from '../types/themes';
import type { ProfileNavigationProp } from './profile.react';

type BaseProps = {|
  +navigation: ProfileNavigationProp<'EditEmail'>,
  +route: NavigationRoute<'EditEmail'>,
|};
type Props = {|
  ...BaseProps,
  +email: ?string,
  +loadingStatus: LoadingStatus,
  +activeTheme: ?GlobalTheme,
  +colors: Colors,
  +styles: typeof unboundStyles,
  +dispatchActionPromise: DispatchActionPromise,
  +changeUserSettings: (
    accountUpdate: AccountUpdate,
  ) => Promise<ChangeUserSettingsResult>,
|};
type State = {|
  +email: string,
  +password: string,
|};
class EditEmail extends React.PureComponent<Props, State> {
  mounted = false;
  passwordInput: ?React.ElementRef<typeof TextInput>;
  emailInput: ?React.ElementRef<typeof TextInput>;

  constructor(props: Props) {
    super(props);
    this.state = {
      email: props.email ? props.email : '',
      password: '',
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
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
        <Text style={this.props.styles.header}>EMAIL</Text>
        <View style={this.props.styles.section}>
          <TextInput
            style={this.props.styles.input}
            value={this.state.email}
            onChangeText={this.onChangeEmailText}
            placeholder="Email address"
            placeholderTextColor={panelForegroundTertiaryLabel}
            autoFocus={true}
            selectTextOnFocus={true}
            returnKeyType="next"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCompleteType="email"
            onSubmitEditing={this.focusPasswordInput}
            ref={this.emailInputRef}
          />
        </View>
        <Text style={this.props.styles.header}>PASSWORD</Text>
        <View style={this.props.styles.section}>
          <TextInput
            style={this.props.styles.input}
            value={this.state.password}
            onChangeText={this.onChangePasswordText}
            placeholder="Password"
            placeholderTextColor={panelForegroundTertiaryLabel}
            secureTextEntry={true}
            textContentType="password"
            autoCompleteType="password"
            returnKeyType="go"
            onSubmitEditing={this.submitEmail}
            ref={this.passwordInputRef}
          />
        </View>
        <Button onPress={this.submitEmail} style={this.props.styles.saveButton}>
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  onChangeEmailText = (newEmail: string) => {
    this.setState({ email: newEmail });
  };

  emailInputRef = (emailInput: ?React.ElementRef<typeof TextInput>) => {
    this.emailInput = emailInput;
  };

  focusEmailInput = () => {
    invariant(this.emailInput, 'emailInput should be set');
    this.emailInput.focus();
  };

  onChangePasswordText = (newPassword: string) => {
    this.setState({ password: newPassword });
  };

  passwordInputRef = (passwordInput: ?React.ElementRef<typeof TextInput>) => {
    this.passwordInput = passwordInput;
  };

  focusPasswordInput = () => {
    invariant(this.passwordInput, 'passwordInput should be set');
    this.passwordInput.focus();
  };

  goBackOnce() {
    this.props.navigation.dispatch((state) => ({
      ...CommonActions.goBack(),
      target: state.key,
    }));
  }

  submitEmail = () => {
    if (this.state.email.search(validEmailRegex) === -1) {
      Alert.alert(
        'Invalid email address',
        'Valid email addresses only',
        [{ text: 'OK', onPress: this.onEmailAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (this.state.password === '') {
      Alert.alert(
        'Empty password',
        'Password cannot be empty',
        [{ text: 'OK', onPress: this.onPasswordAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (this.state.email === this.props.email) {
      this.goBackOnce();
    } else {
      this.props.dispatchActionPromise(
        changeUserSettingsActionTypes,
        this.saveEmail(),
      );
    }
  };

  async saveEmail() {
    try {
      const result = await this.props.changeUserSettings({
        updatedFields: {
          email: this.state.email,
        },
        currentPassword: this.state.password,
      });
      this.goBackOnce();
      Alert.alert(
        'Verify email',
        "We've sent you an email to verify your email address. Just click on " +
          'the link in the email to complete the verification process.',
        undefined,
        { cancelable: true },
      );
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          'Incorrect password',
          'The password you entered is incorrect',
          [{ text: 'OK', onPress: this.onPasswordAlertAcknowledged }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          'Unknown error',
          'Uhh... try again?',
          [{ text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged }],
          { cancelable: false },
        );
      }
    }
  }

  onEmailAlertAcknowledged = () => {
    const resetEmail = this.props.email ? this.props.email : '';
    this.setState({ email: resetEmail }, this.focusEmailInput);
  };

  onPasswordAlertAcknowledged = () => {
    this.setState({ password: '' }, this.focusPasswordInput);
  };

  onUnknownErrorAlertAcknowledged = () => {
    const resetEmail = this.props.email ? this.props.email : '';
    this.setState({ email: resetEmail, password: '' }, this.focusEmailInput);
  };
}

const unboundStyles = {
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  input: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
  },
  saveButton: {
    backgroundColor: 'greenButton',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
};

const loadingStatusSelector = createLoadingStatusSelector(
  changeUserSettingsActionTypes,
);

export default React.memo<BaseProps>(function ConnectedEditEmail(
  props: BaseProps,
) {
  const email = useSelector((state) =>
    state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.email
      : undefined,
  );
  const loadingStatus = useSelector(loadingStatusSelector);
  const activeTheme = useSelector((state) => state.globalThemeInfo.activeTheme);
  const colors = useColors();
  const styles = useStyles(unboundStyles);
  const callChangeUserSettings = useServerCall(changeUserSettings);
  const dispatchActionPromise = useDispatchActionPromise();

  return (
    <EditEmail
      {...props}
      email={email}
      loadingStatus={loadingStatus}
      activeTheme={activeTheme}
      colors={colors}
      styles={styles}
      changeUserSettings={callChangeUserSettings}
      dispatchActionPromise={dispatchActionPromise}
    />
  );
});
