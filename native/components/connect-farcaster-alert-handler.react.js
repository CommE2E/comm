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
  useSetLocalFID,
} from 'lib/utils/farcaster-utils.js';
import { shouldSkipConnectFarcasterAlert } from 'lib/utils/push-alerts.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import sleep from 'lib/utils/sleep.js';

import { ConnectFarcasterBottomSheetRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function ConnectFarcasterAlertHandler(): React.Node {
  const { navigate } = useNavigation();

  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();

  const fid = useCurrentUserFID();

  const setLocalFID = useSetLocalFID();

  const connectFarcasterAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.CONNECT_FARCASTER],
  );

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (
      !loggedIn ||
      !isActive ||
      shouldSkipConnectFarcasterAlert(connectFarcasterAlertInfo, fid)
    ) {
      return;
    }

    void (async () => {
      await sleep(1000);

      // We set the local FID to null to prevent the prompt from being displayed
      // again. We set it here, rather than in the bottom sheet itself, to avoid
      // the scenario where the user connects their Farcaster account but we
      // accidentally overwrite the FID on close and set it to null.
      setLocalFID(null);
      navigate(ConnectFarcasterBottomSheetRouteName);

      const payload: RecordAlertActionPayload = {
        alertType: alertTypes.CONNECT_FARCASTER,
        time: Date.now(),
      };

      dispatch({
        type: recordAlertActionType,
        payload,
      });
    })();
  }, [
    connectFarcasterAlertInfo,
    dispatch,
    fid,
    isActive,
    loggedIn,
    navigate,
    setLocalFID,
  ]);

  return null;
}

export default ConnectFarcasterAlertHandler;
