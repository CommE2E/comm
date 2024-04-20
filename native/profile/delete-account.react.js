// @flow

import * as React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  deleteAccountActionTypes,
  useDeleteWalletAccount as useDeleteAccount,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { deleteNativeCredentialsFor } from '../account/native-credentials.js';
import Button from '../components/button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
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

    const deleteAccountAction = React.useCallback(async () => {
      try {
        await deleteNativeCredentialsFor();
        return await callDeleteAccount();
      } catch (e) {
        Alert.alert(
          'Unknown error deleting account',
          'Uhh... try again?',
          [{ text: 'OK' }],
          {
            cancelable: false,
          },
        );
        throw e;
      }
    }, [callDeleteAccount]);

    const onDelete = React.useCallback(() => {
      void dispatchActionPromise(
        deleteAccountActionTypes,
        deleteAccountAction(),
      );
    }, [dispatchActionPromise, deleteAccountAction]);

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
};

export default DeleteAccount;
