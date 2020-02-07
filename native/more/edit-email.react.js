// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { NavigationScreenProp } from 'react-navigation';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AccountUpdate } from 'lib/types/user-types';
import type { ChangeUserSettingsResult } from 'lib/types/account-types';
import { type GlobalTheme, globalThemePropType } from '../types/themes';
import type { Styles } from '../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Text,
  View,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';

import { connect } from 'lib/utils/redux-utils';
import {
  changeUserSettingsActionTypes,
  changeUserSettings,
} from 'lib/actions/user-actions';
import { validEmailRegex } from 'lib/shared/account-utils';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';
import { styleSelector } from '../themes/colors';

type Props = {|
  navigation: NavigationScreenProp<*>,
  // Redux state
  email: ?string,
  loadingStatus: LoadingStatus,
  activeTheme: ?GlobalTheme,
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeUserSettings: (
    accountUpdate: AccountUpdate,
  ) => Promise<ChangeUserSettingsResult>,
|};
type State = {|
  email: string,
  password: string,
  onePasswordSupported: bool,
|};
class EditEmail extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    email: PropTypes.string,
    loadingStatus: loadingStatusPropType.isRequired,
    activeTheme: globalThemePropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeUserSettings: PropTypes.func.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    headerTitle: "Change email",
  });
  mounted = false;
  passwordInput: ?TextInput;
  emailInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
      email: props.email ? props.email : "",
      password: "",
      onePasswordSupported: false,
    };
    this.determineOnePasswordSupport();
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  async determineOnePasswordSupport() {
    let onePasswordSupported;
    try {
      onePasswordSupported = await OnePassword.isSupported();
    } catch (e) {
      onePasswordSupported = false;
    }
    if (this.mounted) {
      this.setState({ onePasswordSupported });
    }
  }

  render() {
    let onePasswordButton = null;
    if (this.state.onePasswordSupported) {
      const theme = this.props.activeTheme ? this.props.activeTheme : 'light';
      onePasswordButton = (
        <OnePasswordButton
          onPress={this.onPressOnePassword}
          theme={theme}
          style={this.props.styles.onePasswordButton}
        />
      );
    }
    const buttonContent = this.props.loadingStatus === "loading"
      ? <ActivityIndicator size="small" color="white" />
      : <Text style={this.props.styles.saveText}>Save</Text>;
    return (
      <ScrollView
        contentContainerStyle={this.props.styles.scrollViewContentContainer}
        style={this.props.styles.scrollView}
      >
        <Text style={this.props.styles.header}>EMAIL</Text>
        <View style={this.props.styles.section}>
          <TextInput
            style={this.props.styles.input}
            underlineColorAndroid="transparent"
            value={this.state.email}
            onChangeText={this.onChangeEmailText}
            placeholder="Email"
            autoFocus={true}
            selectTextOnFocus={true}
            returnKeyType="next"
            onSubmitEditing={this.focusPasswordInput}
            ref={this.emailInputRef}
          />
        </View>
        <Text style={this.props.styles.header}>PASSWORD</Text>
        <View style={this.props.styles.section}>
          <TextInput
            style={this.props.styles.input}
            underlineColorAndroid="transparent"
            value={this.state.password}
            onChangeText={this.onChangePasswordText}
            placeholder="Password"
            secureTextEntry={true}
            returnKeyType="go"
            onSubmitEditing={this.submitEmail}
            ref={this.passwordInputRef}
          />
          {onePasswordButton}
        </View>
        <Button
          onPress={this.submitEmail}
          style={this.props.styles.saveButton}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  onChangeEmailText = (newEmail: string) => {
    this.setState({ email: newEmail });
  }

  emailInputRef = (emailInput: ?TextInput) => {
    this.emailInput = emailInput;
  }

  focusEmailInput = () => {
    invariant(this.emailInput, "emailInput should be set");
    this.emailInput.focus();
  }

  onChangePasswordText = (newPassword: string) => {
    this.setState({ password: newPassword });
  }

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  }

  focusPasswordInput = () => {
    invariant(this.passwordInput, "passwordInput should be set");
    this.passwordInput.focus();
  }

  onPressOnePassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.setState(
        { password: credentials.password },
        () => {
          if (this.state.email && this.state.email !== this.props.email) {
            this.submitEmail();
          }
        },
      );
    } catch (e) { }
  }

  submitEmail = () => {
    if (this.state.email.search(validEmailRegex) === -1) {
      Alert.alert(
        "Invalid email address",
        "Valid email addresses only",
        [
          { text: 'OK', onPress: this.onEmailAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (this.state.password === "") {
      Alert.alert(
        "Empty password",
        "Password cannot be empty",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (this.state.email === this.props.email) {
      this.props.navigation.goBack();
    } else {
      this.props.dispatchActionPromise(
        changeUserSettingsActionTypes,
        this.saveEmail(),
      );
    }
  }

  async saveEmail() {
    try {
      const result = await this.props.changeUserSettings({
        updatedFields: {
          email: this.state.email,
        },
        currentPassword: this.state.password,
      });
      this.props.navigation.goBack();
      Alert.alert(
        "Verify email",
        "We've sent you an email to verify your email address. Just click on " +
          "the link in the email to complete the verification process.",
      );
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          "Incorrect password",
          "The password you entered is incorrect",
          [
            { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "Unknown error",
          "Uhh... try again?",
          [
            { text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      }
    }
  }

  onEmailAlertAcknowledged = () => {
    const resetEmail = this.props.email ? this.props.email : "";
    this.setState(
      { email: resetEmail },
      this.focusEmailInput,
    );
  }

  onPasswordAlertAcknowledged = () => {
    this.setState(
      { password: "" },
      this.focusPasswordInput,
    );
  }

  onUnknownErrorAlertAcknowledged = () => {
    const resetEmail = this.props.email ? this.props.email : "";
    this.setState(
      { email: resetEmail, password: "" },
      this.focusEmailInput,
    );
  }

}

const styles = {
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: 'panelBackgroundLabel',
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
    backgroundColor: 'panelForeground',
    borderColor: 'panelForegroundBorder',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'modalBackgroundLabel',
    fontFamily: 'Arial',
    paddingVertical: 0,
  },
  saveButton: {
    flex: 1,
    backgroundColor: 'greenButton',
    marginVertical: 12,
    marginHorizontal: 24,
    borderRadius: 5,
    padding: 12,
  },
  saveText: {
    fontSize: 18,
    textAlign: 'center',
    color: 'panelForegroundLabel',
  },
  onePasswordButton: {
    marginLeft: 6,
  },
};
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(
  changeUserSettingsActionTypes,
);

export default connect(
  (state: AppState) => ({
    email: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.email
      : undefined,
    loadingStatus: loadingStatusSelector(state),
    activeTheme: state.globalThemeInfo.activeTheme,
    styles: stylesSelector(state),
  }),
  { changeUserSettings },
)(EditEmail);
