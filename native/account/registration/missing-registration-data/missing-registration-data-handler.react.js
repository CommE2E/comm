// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import { getOwnPeerDevices, isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import {
  alertTypes,
  type RecordAlertActionPayload,
} from 'lib/types/alert-types.js';
import { shouldSkipCreateSIWEBackupMessageAlert } from 'lib/utils/push-alerts.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { commCoreModule } from '../../../native-modules.js';
import { CreateMissingSIWEBackupMessageRouteName } from '../../../navigation/route-names.js';
import { useSelector } from '../../../redux/redux-utils.js';
import { RegistrationContext } from '../registration-context.js';

function MissingRegistrationDataHandler(): React.Node {
  const loggedIn = useSelector(isLoggedIn);
  const navigation = useNavigation();
  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const userDevicesInfos = useSelector(getOwnPeerDevices);

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections } = registrationContext;
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'identity context not set');
  const { getAuthMetadata } = identityContext;

  const createSIWEBAckupMessageAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.SIWE_BACKUP_MESSAGE],
  );
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (
      !loggedIn ||
      accountHasPassword(currentUserInfo) ||
      cachedSelections.siweBackupSecrets ||
      shouldSkipCreateSIWEBackupMessageAlert(createSIWEBAckupMessageAlertInfo)
    ) {
      return;
    }

    void (async () => {
      if (userDevicesInfos.length === 0) {
        return;
      }
      const primaryDeviceID = userDevicesInfos[0].deviceID;
      const { deviceID } = await getAuthMetadata();
      if (primaryDeviceID !== deviceID) {
        return;
      }

      const nativeSIWEBackupSecrets =
        await commCoreModule.getSIWEBackupSecrets();

      if (nativeSIWEBackupSecrets) {
        return;
      }

      navigation.navigate<'CreateMissingSIWEBackupMessage'>({
        name: CreateMissingSIWEBackupMessageRouteName,
      });

      const payload: RecordAlertActionPayload = {
        alertType: alertTypes.SIWE_BACKUP_MESSAGE,
        time: Date.now(),
      };

      dispatch({
        type: recordAlertActionType,
        payload,
      });
    })();
  }, [
    currentUserInfo,
    loggedIn,
    cachedSelections.siweBackupSecrets,
    navigation,
    createSIWEBAckupMessageAlertInfo,
    dispatch,
    userDevicesInfos,
    getAuthMetadata,
  ]);

  return null;
}

export { MissingRegistrationDataHandler };
