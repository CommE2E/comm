// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { NavigationScreenProp } from 'react-navigation';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { LogOutResult } from 'lib/types/account-types';
import { type GlobalTheme, globalThemePropType } from '../types/themes';
import type { Styles } from '../types/styles';
import {
  type CurrentUserInfo,
  currentUserPropType,
} from 'lib/types/user-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Text,
  View,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';

import { connect } from 'lib/utils/redux-utils';
import {
  deleteAccountActionTypes,
  deleteAccount,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';
import { deleteNativeCredentialsFor } from '../account/native-credentials';
import { styleSelector } from '../themes/colors';

type Props = {|
  navigation: NavigationScreenProp<*>,
  // Redux state
  loadingStatus: LoadingStatus,
  currentUserInfo: ?CurrentUserInfo,
  activeTheme: ?GlobalTheme,
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  deleteAccount: (
    password: string,
    requestCurrentUserInfo: ?CurrentUserInfo,
  ) => Promise<LogOutResult>,
|};
type State = {|
  password: string,
  onePasswordSupported: bool,
|};
class DeleteAccount extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    currentUserInfo: currentUserPropType,
    activeTheme: globalThemePropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    deleteAccount: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Delete account",
  };
  mounted = false;
  passwordInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
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

  get username() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.username
      : undefined;
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
      : <Text style={this.props.styles.saveText}>Delete account</Text>;
    return (
      <ScrollView
        contentContainerStyle={this.props.styles.scrollViewContentContainer}
        style={this.props.styles.scrollView}
      >
        <View>
          <Text style={this.props.styles.warningText}>
            Your account will be permanently deleted.
          </Text>
        </View>
        <View>
          <Text style={[
            this.props.styles.warningText,
            this.props.styles.lastWarningText,
          ]}>
            There is no way to reverse this.
          </Text>
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
            onSubmitEditing={this.submitDeletion}
            ref={this.passwordInputRef}
          />
          {onePasswordButton}
        </View>
        <Button
          onPress={this.submitDeletion}
          style={this.props.styles.deleteButton}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
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
      this.setState({ password: credentials.password });
    } catch (e) { }
  }

  submitDeletion = () => {
    this.props.dispatchActionPromise(
      deleteAccountActionTypes,
      this.deleteAccount(),
    );
  }

  async deleteAccount() {
    try {
      if (this.username) {
        await deleteNativeCredentialsFor(this.username);
      }
      const result = await this.props.deleteAccount(
        this.state.password,
        this.props.currentUserInfo,
      );
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          "Incorrect password",
          "The password you entered is incorrect",
          [
            { text: 'OK', onPress: this.onErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "Unknown error",
          "Uhh... try again?",
          [
            { text: 'OK', onPress: this.onErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      }
    }
  }

  onErrorAlertAcknowledged = () => {
    this.setState(
      { password: "" },
      this.focusPasswordInput,
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
    paddingVertical: Platform.select({
      ios: 12,
      default: 8,
    }),
    paddingHorizontal: 24,
    marginBottom: 24,
    backgroundColor: 'panelForeground',
    borderColor: 'panelForegroundBorder',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: 'panelModalBackgroundLabel',
    fontFamily: 'Arial',
    paddingVertical: 0,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: 'redButton',
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
  warningText: {
    marginHorizontal: 24,
    textAlign: 'center',
    color: 'modalBackgroundLabel',
    fontSize: 16,
  },
  lastWarningText: {
    marginBottom: 24,
  },
};
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    currentUserInfo: state.currentUserInfo,
    activeTheme: state.globalThemeInfo.activeTheme,
    styles: stylesSelector(state),
  }),
  { deleteAccount },
)(DeleteAccount);
