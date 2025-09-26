// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import {
  alertTypes,
  type RecordAlertActionPayload,
} from 'lib/types/alert-types.js';
import {
  useCurrentUserFID,
  useCurrentUserSupportsDCs,
  useSetLocalFID,
} from 'lib/utils/farcaster-utils.js';
import { shouldSkipConnectFarcasterAlert } from 'lib/utils/push-alerts.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { useIsFarcasterDCsIntegrationEnabled } from 'lib/utils/services-utils.js';
import sleep from 'lib/utils/sleep.js';

import { ConnectFarcasterBottomSheetRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function ConnectFarcasterAlertHandler(): React.Node {
  const { navigate } = useNavigation();

  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();

  const fid = useCurrentUserFID();
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();
  const isFarcasterDCsIntegrationEnabled =
    useIsFarcasterDCsIntegrationEnabled();

  const setLocalFID = useSetLocalFID();

  const connectFarcasterAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.CONNECT_FARCASTER],
  );
  const connectFarcasterDCsAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.CONNECT_FARCASTER_DCS],
  );

  const dispatch = useDispatch();

  React.useEffect(() => {
    const shouldShowForDCs =
      isFarcasterDCsIntegrationEnabled && fid && !currentUserSupportsDCs;
    const shouldShowForInitialConnection = fid === undefined;

    if (!loggedIn || !isActive) {
      return;
    }

    let reasonToShow: void | 'initial_connection' | 'dcs';
    if (
      shouldShowForInitialConnection &&
      !shouldSkipConnectFarcasterAlert(connectFarcasterAlertInfo, fid) &&
      connectFarcasterAlertInfo.coldStartCount >= 2
    ) {
      reasonToShow = 'initial_connection';
    } else if (
      shouldShowForDCs &&
      !shouldSkipConnectFarcasterAlert(connectFarcasterDCsAlertInfo, fid) &&
      connectFarcasterDCsAlertInfo.coldStartCount >= 2
    ) {
      reasonToShow = 'dcs';
    }

    if (!reasonToShow) {
      return;
    }

    void (async () => {
      await sleep(1000);

      // If the user hasn't been prompted to connect Farcaster yet, then their
      // FID will be undefined. We set it to null here to avoid a race
      // condition. If they reject the prompt, then it will be the same result.
      // But if they accept the prompt, this avoids a race if they accept and
      // then close out of the bottom sheet.
      if (fid === undefined) {
        setLocalFID(null);
      }

      navigate(ConnectFarcasterBottomSheetRouteName);

      const payload: RecordAlertActionPayload = {
        alertType:
          reasonToShow === 'dcs'
            ? alertTypes.CONNECT_FARCASTER_DCS
            : alertTypes.CONNECT_FARCASTER,
        time: Date.now(),
      };
      dispatch({
        type: recordAlertActionType,
        payload,
      });
    })();
  }, [
    connectFarcasterAlertInfo,
    connectFarcasterDCsAlertInfo,
    currentUserSupportsDCs,
    dispatch,
    fid,
    isFarcasterDCsIntegrationEnabled,
    isActive,
    loggedIn,
    navigate,
    setLocalFID,
  ]);

  return null;
}

export default ConnectFarcasterAlertHandler;
