// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import { useCheckIfPrimaryDevice } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
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

  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections } = registrationContext;

  const checkIfPrimaryDevice = useCheckIfPrimaryDevice();

  const createSIWEBAckupMessageAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.SIWE_BACKUP_MESSAGE],
  );
  const dispatch = useDispatch();

  const lastAlertInfo = React.useRef(createSIWEBAckupMessageAlertInfo);
  React.useEffect(() => {
    lastAlertInfo.current = createSIWEBAckupMessageAlertInfo;
  }, [createSIWEBAckupMessageAlertInfo]);

  React.useEffect(() => {
    if (
      !loggedIn ||
      accountHasPassword(currentUserInfo) ||
      cachedSelections.siweBackupSecrets ||
      shouldSkipCreateSIWEBackupMessageAlert(lastAlertInfo.current)
    ) {
      return;
    }

    void (async () => {
      const isPrimaryDevice = await checkIfPrimaryDevice();
      if (!isPrimaryDevice) {
        return;
      }

      const nativeSIWEBackupSecrets =
        await commCoreModule.getSIWEBackupSecrets();

      if (
        nativeSIWEBackupSecrets ||
        shouldSkipCreateSIWEBackupMessageAlert(lastAlertInfo.current)
      ) {
        return;
      }

      navigation.navigate<'CreateMissingSIWEBackupMessage'>({
        name: CreateMissingSIWEBackupMessageRouteName,
      });

      const payload: RecordAlertActionPayload = {
        alertType: alertTypes.SIWE_BACKUP_MESSAGE,
        time: Date.now(),
      };
      lastAlertInfo.current = {
        totalAlerts: lastAlertInfo.current.totalAlerts + 1,
        lastAlertTime: payload.time,
      };

      dispatch({
        type: recordAlertActionType,
        payload,
      });
    })();
  }, [
    cachedSelections.siweBackupSecrets,
    checkIfPrimaryDevice,
    currentUserInfo,
    dispatch,
    loggedIn,
    navigation,
  ]);

  return null;
}

export { MissingRegistrationDataHandler };
