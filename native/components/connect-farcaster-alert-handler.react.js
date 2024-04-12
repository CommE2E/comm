// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { recordAlertActionType } from 'lib/actions/alert-actions.js';
import { FIDContext } from 'lib/components/fid-provider.react.js';
import { cookieSelector } from 'lib/selectors/keyserver-selectors.js';
import {
  alertTypes,
  type RecordAlertActionPayload,
} from 'lib/types/alert-types.js';
import { authoritativeKeyserverID } from 'lib/utils/authoritative-keyserver.js';
import { shouldSkipConnectFarcasterAlert } from 'lib/utils/push-alerts.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import sleep from 'lib/utils/sleep.js';

import { ConnectFarcasterBottomSheetRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function ConnectFarcasterAlertHandler(): React.Node {
  const { navigate } = useNavigation();

  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const currentUserID = useSelector(state => state.currentUserInfo?.id);
  const cookie = useSelector(cookieSelector(authoritativeKeyserverID()));
  const hasUserCookie = !!(cookie && cookie.startsWith('user='));
  const loggedIn = !!currentUserID && hasUserCookie;

  const fid = React.useContext(FIDContext)?.fid;

  const connectFarcasterAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.CONNECT_FARCASTER],
  );

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (
      !loggedIn ||
      !isActive ||
      !!fid ||
      shouldSkipConnectFarcasterAlert(connectFarcasterAlertInfo)
    ) {
      return;
    }

    void (async () => {
      await sleep(1000);

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
  }, [connectFarcasterAlertInfo, dispatch, fid, isActive, loggedIn, navigate]);

  return null;
}

export default ConnectFarcasterAlertHandler;
