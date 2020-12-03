// @flow

import invariant from 'invariant';
import PropTypes from 'prop-types';
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
  deleteAccountActionTypes,
  deleteAccount,
} from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type { LogOutResult } from 'lib/types/account-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import {
  type PreRequestUserState,
  preRequestUserStatePropType,
} from 'lib/types/session-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import { connect } from 'lib/utils/redux-utils';

import { deleteNativeCredentialsFor } from '../account/native-credentials';
import Button from '../components/button.react';
import type { AppState } from '../redux/redux-setup';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import { type GlobalTheme, globalThemePropType } from '../types/themes';

type Props = {|
  // Redux state
  loadingStatus: LoadingStatus,
  username: ?string,
  preRequestUserState: PreRequestUserState,
  activeTheme: ?GlobalTheme,
  colors: Colors,
  styles: typeof styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  deleteAccount: (
    password: string,
    preRequestUserState: PreRequestUserState,
  ) => Promise<LogOutResult>,
|};
type State = {|
  password: string,
|};
class DeleteAccount extends React.PureComponent<Props, State> {
  static propTypes = {
    loadingStatus: loadingStatusPropType.isRequired,
    username: PropTypes.string,
    preRequestUserState: preRequestUserStatePropType.isRequired,
    activeTheme: globalThemePropType,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    deleteAccount: PropTypes.func.isRequired,
  };
  state: State = {
    password: '',
  };
  mounted = false;
  passwordInput: ?React.ElementRef<typeof TextInput>;

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
        <Text style={this.props.styles.saveText}>Delete account</Text>
      );
    const { panelForegroundTertiaryLabel } = this.props.colors;
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
          <Text
            style={[
              this.props.styles.warningText,
              this.props.styles.lastWarningText,
            ]}
          >
            There is no way to reverse this.
          </Text>
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
            onSubmitEditing={this.submitDeletion}
            ref={this.passwordInputRef}
          />
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
  };

  passwordInputRef = (passwordInput: ?React.ElementRef<typeof TextInput>) => {
    this.passwordInput = passwordInput;
  };

  focusPasswordInput = () => {
    invariant(this.passwordInput, 'passwordInput should be set');
    this.passwordInput.focus();
  };

  submitDeletion = () => {
    this.props.dispatchActionPromise(
      deleteAccountActionTypes,
      this.deleteAccount(),
    );
  };

  async deleteAccount() {
    try {
      if (this.props.username) {
        await deleteNativeCredentialsFor(this.props.username);
      }
      const result = await this.props.deleteAccount(
        this.state.password,
        this.props.preRequestUserState,
      );
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          'Incorrect password',
          'The password you entered is incorrect',
          [{ text: 'OK', onPress: this.onErrorAlertAcknowledged }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          'Unknown error',
          'Uhh... try again?',
          [{ text: 'OK', onPress: this.onErrorAlertAcknowledged }],
          { cancelable: false },
        );
      }
    }
  }

  onErrorAlertAcknowledged = () => {
    this.setState({ password: '' }, this.focusPasswordInput);
  };
}

const styles = {
  deleteButton: {
    backgroundColor: 'redButton',
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 24,
    marginVertical: 12,
    padding: 12,
  },
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
  lastWarningText: {
    marginBottom: 24,
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
  warningText: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    marginHorizontal: 24,
    textAlign: 'center',
  },
};
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    username:
      state.currentUserInfo && !state.currentUserInfo.anonymous
        ? state.currentUserInfo.username
        : undefined,
    preRequestUserState: preRequestUserStateSelector(state),
    activeTheme: state.globalThemeInfo.activeTheme,
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
  { deleteAccount },
)(DeleteAccount);
