// @flow

import * as React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  deleteIdentityAccountActionTypes,
  deleteKeyserverAccountActionTypes,
  useDeleteIdentityAccount,
  useDeleteKeyserverAccount,
} from 'lib/actions/user-actions.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { useDispatchActionPromise } from 'lib/utils/action-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { deleteNativeCredentialsFor } from '../account/native-credentials.js';
import Button from '../components/button.react.js';
import { commRustModule } from '../native-modules.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';

const loadingStatusSelector = createLoadingStatusSelector(
  deleteKeyserverAccountActionTypes,
);

type Props = {
  +navigation: ProfileNavigationProp<'DeleteAccount'>,
  +route: NavigationRoute<'DeleteAccount'>,
};
const DeleteAccount: React.ComponentType<Props> = React.memo<Props>(
  function DeleteAccount() {
    const [deviceID, setDeviceID] = React.useState<?string>();
    const loadingStatus = useSelector(loadingStatusSelector);
    const preRequestUserState = useSelector(preRequestUserStateSelector);

    React.useEffect(() => {
      void (async () => {
        const contentSigningKey = await getContentSigningKey();
        setDeviceID(contentSigningKey);
      })();
    }, []);
    const styles = useStyles(unboundStyles);

    const dispatchActionPromise = useDispatchActionPromise();
    const callDeleteKeyserverAccount = useDeleteKeyserverAccount();
    const callDeleteIdentityAccount = useDeleteIdentityAccount(
      commRustModule,
      deviceID,
    );

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

    const deleteKeyserverAction = React.useCallback(async () => {
      try {
        await deleteNativeCredentialsFor();
        return await callDeleteKeyserverAccount(preRequestUserState);
      } catch (e) {
        Alert.alert(
          'Unknown error deleting keyserver account',
          'Uhh... try again?',
          [{ text: 'OK' }],
          {
            cancelable: false,
          },
        );
        throw e;
      }
    }, [callDeleteKeyserverAccount, preRequestUserState]);

    const deleteIdentityAction = React.useCallback(async () => {
      try {
        return await callDeleteIdentityAccount();
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
    }, [callDeleteIdentityAccount]);

    const onDelete = React.useCallback(() => {
      void dispatchActionPromise(
        deleteKeyserverAccountActionTypes,
        deleteKeyserverAction(),
      );
      if (usingCommServicesAccessToken) {
        void dispatchActionPromise(
          deleteIdentityAccountActionTypes,
          deleteIdentityAction(),
        );
      }
    }, [dispatchActionPromise, deleteKeyserverAction, deleteIdentityAction]);

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
        {deviceID ? (
          <Button onPress={onDelete} style={styles.deleteButton}>
            {buttonContent}
          </Button>
        ) : (
          <ActivityIndicator size="large" color="white" />
        )}
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
