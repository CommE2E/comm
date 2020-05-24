// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AccountUpdate } from 'lib/types/user-types';
import type { ChangeUserSettingsResult } from 'lib/types/account-types';
import { type GlobalTheme, globalThemePropType } from '../types/themes';
import type { MoreNavigationProp } from './more.react';

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
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';
import { setNativeCredentials } from '../account/native-credentials';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';

type Props = {
  navigation: MoreNavigationProp<'EditPassword'>,
  // Redux state
  loadingStatus: LoadingStatus,
  activeTheme: ?GlobalTheme,
  colors: Colors,
  styles: typeof styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeUserSettings: (
    accountUpdate: AccountUpdate,
  ) => Promise<ChangeUserSettingsResult>,
};
type State = {|
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  onePasswordSupported: boolean,
|};
class EditPassword extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    activeTheme: globalThemePropType,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeUserSettings: PropTypes.func.isRequired,
  };
  mounted = false;
  currentPasswordInput: ?TextInput;
  newPasswordInput: ?TextInput;
  confirmPasswordInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
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
    let onePasswordCurrentPasswordButton = null;
    let onePasswordNewPasswordButton = null;
    if (this.state.onePasswordSupported) {
      const theme = this.props.activeTheme ? this.props.activeTheme : 'light';
      onePasswordCurrentPasswordButton = (
        <OnePasswordButton
          onPress={this.onPressOnePasswordCurrentPassword}
          theme={theme}
          style={this.props.styles.onePasswordButton}
        />
      );
      onePasswordNewPasswordButton = (
        <OnePasswordButton
          onPress={this.onPressOnePasswordNewPassword}
          theme={theme}
          style={this.props.styles.onePasswordButton}
        />
      );
    }
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
              underlineColorAndroid="transparent"
              value={this.state.currentPassword}
              onChangeText={this.onChangeCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={panelForegroundTertiaryLabel}
              secureTextEntry={true}
              autoFocus={true}
              returnKeyType="next"
              onSubmitEditing={this.focusNewPassword}
              ref={this.currentPasswordRef}
            />
            {onePasswordCurrentPasswordButton}
          </View>
        </View>
        <Text style={this.props.styles.header}>NEW PASSWORD</Text>
        <View style={this.props.styles.section}>
          <View style={this.props.styles.row}>
            <TextInput
              style={this.props.styles.input}
              underlineColorAndroid="transparent"
              value={this.state.newPassword}
              onChangeText={this.onChangeNewPassword}
              placeholder="New password"
              placeholderTextColor={panelForegroundTertiaryLabel}
              secureTextEntry={true}
              returnKeyType="next"
              onSubmitEditing={this.focusConfirmPassword}
              ref={this.newPasswordRef}
            />
            {onePasswordNewPasswordButton}
          </View>
          <View style={this.props.styles.hr} />
          <View style={this.props.styles.row}>
            <TextInput
              style={this.props.styles.input}
              underlineColorAndroid="transparent"
              value={this.state.confirmPassword}
              onChangeText={this.onChangeConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={panelForegroundTertiaryLabel}
              secureTextEntry={true}
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

  currentPasswordRef = (currentPasswordInput: ?TextInput) => {
    this.currentPasswordInput = currentPasswordInput;
  };

  focusCurrentPassword = () => {
    invariant(this.currentPasswordInput, 'currentPasswordInput should be set');
    this.currentPasswordInput.focus();
  };

  onChangeNewPassword = (newPassword: string) => {
    this.setState({ newPassword });
  };

  newPasswordRef = (newPasswordInput: ?TextInput) => {
    this.newPasswordInput = newPasswordInput;
  };

  focusNewPassword = () => {
    invariant(this.newPasswordInput, 'newPasswordInput should be set');
    this.newPasswordInput.focus();
  };

  onChangeConfirmPassword = (confirmPassword: string) => {
    this.setState({ confirmPassword });
  };

  confirmPasswordRef = (confirmPasswordInput: ?TextInput) => {
    this.confirmPasswordInput = confirmPasswordInput;
  };

  focusConfirmPassword = () => {
    invariant(this.confirmPasswordInput, 'confirmPasswordInput should be set');
    this.confirmPasswordInput.focus();
  };

  onPressOnePasswordCurrentPassword = async () => {
    try {
      const credentials = await OnePassword.findLogin('https://squadcal.org');
      this.setState({ currentPassword: credentials.password }, () => {
        if (
          this.state.newPassword &&
          this.state.newPassword === this.state.confirmPassword
        ) {
          this.submitPassword();
        }
      });
    } catch (e) {}
  };

  onPressOnePasswordNewPassword = async () => {
    try {
      const credentials = await OnePassword.findLogin('https://squadcal.org');
      this.setState(
        {
          newPassword: credentials.password,
          confirmPassword: credentials.password,
        },
        () => {
          if (this.state.currentPassword) {
            this.submitPassword();
          }
        },
      );
    } catch (e) {}
  };

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
        "Passwords don't match",
        'New password fields must contain the same password',
        [{ text: 'OK', onPress: this.onNewPasswordAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (this.state.newPassword === this.state.currentPassword) {
      this.props.navigation.goBack();
    } else {
      this.props.dispatchActionPromise(
        changeUserSettingsActionTypes,
        this.savePassword(),
      );
    }
  };

  async savePassword() {
    try {
      const result = await this.props.changeUserSettings({
        updatedFields: {
          password: this.state.newPassword,
        },
        currentPassword: this.state.currentPassword,
      });
      await setNativeCredentials({
        password: this.state.newPassword,
      });
      this.props.navigation.goBack();
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          'Incorrect password',
          'The current password you entered is incorrect',
          [{ text: 'OK', onPress: this.onCurrentPasswordAlertAcknowledged }],
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

const styles = {
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
  },
  onePasswordButton: {
    marginLeft: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 9,
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
    marginBottom: 24,
    paddingVertical: 3,
  },
};
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(
  changeUserSettingsActionTypes,
);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    activeTheme: state.globalThemeInfo.activeTheme,
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
  { changeUserSettings },
)(EditPassword);
