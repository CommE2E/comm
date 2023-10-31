// @flow

import * as React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  deleteAccountActionTypes,
  useDeleteAccount,
} from 'lib/actions/user-actions.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/action-utils.js';

import { deleteNativeCredentialsFor } from '../account/native-credentials.js';
import Button from '../components/button.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

const loadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);

const DeleteAccount: React.ComponentType<{ ... }> = React.memo<{ ... }>(
  function DeleteAccount() {
    const loadingStatus = useSelector(loadingStatusSelector);
    const preRequestUserState = useSelector(preRequestUserStateSelector);
    const styles = useStyles(unboundStyles);

    const dispatchActionPromise = useDispatchActionPromise();
    const callDeleteAccount = useDeleteAccount();

    const buttonContent =
      loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text style={styles.saveText}>Delete account</Text>
      );

    const noWayToReverseThisStyles = React.useMemo(
      () => [styles.warningText, styles.lastWarningText],
      [styles.warningText, styles.lastWarningText],
    );

    const deleteAction = React.useCallback(async () => {
      try {
        await deleteNativeCredentialsFor();
        return await callDeleteAccount(preRequestUserState);
      } catch (e) {
        Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }], {
          cancelable: false,
        });
        throw e;
      }
    }, [callDeleteAccount, preRequestUserState]);

    const onDelete = React.useCallback(() => {
      dispatchActionPromise(deleteAccountActionTypes, deleteAction());
    }, [dispatchActionPromise, deleteAction]);

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
        <Button onPress={onDelete} style={styles.deleteButton}>
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
