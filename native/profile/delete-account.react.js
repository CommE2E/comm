// @flow

import * as React from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  TextInput as BaseTextInput,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  deleteAccountActionTypes,
  useDeleteAccount,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { deleteNativeCredentialsFor } from '../account/native-credentials.js';
import Button from '../components/button.react.js';
import TextInput from '../components/text-input.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles, useColors } from '../themes/colors.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

const deleteAccountLoadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);

type Props = {
  +navigation: ProfileNavigationProp<'DeleteAccount'>,
  +route: NavigationRoute<'DeleteAccount'>,
};
const DeleteAccount: React.ComponentType<Props> = React.memo<Props>(
  function DeleteAccount() {
    const deleteAccountLoadingStatus = useSelector(
      deleteAccountLoadingStatusSelector,
    );

    const styles = useStyles(unboundStyles);
    const isAccountWithPassword = useSelector(state =>
      accountHasPassword(state.currentUserInfo),
    );
    const { panelForegroundTertiaryLabel } = useColors();
    const [password, setPassword] = React.useState('');

    const dispatchActionPromise = useDispatchActionPromise();
    const callDeleteAccount = useDeleteAccount();

    const isButtonDisabled = deleteAccountLoadingStatus === 'loading';

    const buttonContent = isButtonDisabled ? (
      <ActivityIndicator size="small" color="white" />
    ) : (
      <Text style={styles.saveText}>Delete account</Text>
    );

    const noWayToReverseThisStyles = React.useMemo(
      () => [styles.warningText, styles.lastWarningText],
      [styles.warningText, styles.lastWarningText],
    );
    const passwordInputRef =
      React.useRef<?React.ElementRef<typeof BaseTextInput>>(null);

    const onErrorAlertAcknowledged = React.useCallback(() => {
      passwordInputRef.current?.focus();
    }, []);

    const deleteAccountAction = React.useCallback(async () => {
      try {
        await deleteNativeCredentialsFor();
        return await callDeleteAccount(password);
      } catch (e) {
        if (getMessageForException(e) === 'login_failed') {
          Alert.alert(
            'Incorrect password',
            'The password you entered is incorrect',
            [{ text: 'OK', onPress: onErrorAlertAcknowledged }],
            { cancelable: false },
          );
        } else {
          Alert.alert(
            unknownErrorAlertDetails.title,
            unknownErrorAlertDetails.message,
            [{ text: 'OK', onPress: onErrorAlertAcknowledged }],
            { cancelable: false },
          );
        }
        throw e;
      }
    }, [callDeleteAccount, onErrorAlertAcknowledged, password]);

    const onDelete = React.useCallback(() => {
      if (!password && isAccountWithPassword) {
        Alert.alert('Password required', 'Please enter your password.', [
          { text: 'OK', onPress: onErrorAlertAcknowledged },
        ]);
        return;
      }
      void dispatchActionPromise(
        deleteAccountActionTypes,
        deleteAccountAction(),
      );
    }, [
      password,
      isAccountWithPassword,
      dispatchActionPromise,
      deleteAccountAction,
      onErrorAlertAcknowledged,
    ]);

    let inputPasswordPrompt;
    if (isAccountWithPassword) {
      inputPasswordPrompt = (
        <>
          <Text style={styles.header}>PASSWORD</Text>
          <View style={styles.section}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={panelForegroundTertiaryLabel}
              secureTextEntry={true}
              textContentType="password"
              autoComplete="password"
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={onDelete}
              ref={passwordInputRef}
            />
          </View>
        </>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollViewContentContainer}
        style={styles.scrollView}
      >
        <View>
          <Text style={styles.warningText}>
            Your account will be permanently deleted.
          </Text>
        </View>
        <View>
          <Text style={noWayToReverseThisStyles}>
            There is no way to reverse this.
          </Text>
        </View>
        {inputPasswordPrompt}
        <Button
          onPress={onDelete}
          style={styles.deleteButton}
          disabled={isButtonDisabled}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  },
);

const unboundStyles = {
  deleteButton: {
    backgroundColor: 'vibrantRedButton',
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 24,
    marginVertical: 12,
    padding: 12,
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
  warningText: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    marginHorizontal: 24,
    textAlign: 'center',
  },
  input: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
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
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
};

export default DeleteAccount;
