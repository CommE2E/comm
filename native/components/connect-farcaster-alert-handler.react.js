// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import { isLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/selectors/user-selectors.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import {
  alertTypes,
  type RecordAlertActionPayload,
} from 'lib/types/alert-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { shouldSkipConnectFarcasterAlert } from 'lib/utils/push-alerts.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import sleep from 'lib/utils/sleep.js';

import { ConnectFarcasterBottomSheetRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function ConnectFarcasterAlertHandler(): React.Node {
  const { navigate } = useNavigation();

  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const loggedIn = useSelector(isLoggedInToIdentityAndAuthoritativeKeyserver);

  const currentUserID = useSelector(state => state.currentUserInfo?.id);

  const fid = useCurrentUserFID();

  const identityServiceClient = React.useContext(IdentityClientContext);
  const findUserIdentities =
    identityServiceClient?.identityClient.findUserIdentities;

  const connectFarcasterAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.CONNECT_FARCASTER],
  );

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (
      !loggedIn ||
      !isActive ||
      !findUserIdentities ||
      !currentUserID ||
      shouldSkipConnectFarcasterAlert(connectFarcasterAlertInfo, fid)
    ) {
      return;
    }

    void (async () => {
      const findUserIdentitiesPromise = findUserIdentities([currentUserID]);
      const sleepPromise = await sleep(1000);

      const [currentUserIdentityObj] = await Promise.all([
        findUserIdentitiesPromise,
        sleepPromise,
      ]);

      const { farcasterID } = currentUserIdentityObj[currentUserID];

      if (farcasterID) {
        return;
      }

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
    currentUserID,
    dispatch,
    fid,
    findUserIdentities,
    isActive,
    loggedIn,
    navigate,
  ]);

  return null;
}

export default ConnectFarcasterAlertHandler;
