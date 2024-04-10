// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { FarcasterDataHandler } from 'lib/components/farcaster-data-handler.react.js';
import { FIDContext } from 'lib/components/fid-provider.react.js';
import { cookieSelector } from 'lib/selectors/keyserver-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { alertTypes } from 'lib/types/alert-types.js';
import { authoritativeKeyserverID } from 'lib/utils/authoritative-keyserver.js';
import { shouldSkipConnectFarcasterAlert } from 'lib/utils/push-alerts.js';
import sleep from 'lib/utils/sleep.js';

import { ConnectFarcasterBottomSheetRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

function FacasterHandler(): React.Node {
  const { navigate } = useNavigation();

  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const hasCurrentUserInfo = useSelector(isLoggedIn);
  const cookie = useSelector(cookieSelector(authoritativeKeyserverID()));
  const hasUserCookie = !!(cookie && cookie.startsWith('user='));
  const loggedIn = hasCurrentUserInfo && hasUserCookie;

  const fid = React.useContext(FIDContext)?.fid;

  const connectFarcasterAlertInfo = useSelector(
    state => state.alertStore.alertInfos[alertTypes.CONNECT_FARCASTER],
  );

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
      await sleep(500);

      navigate(ConnectFarcasterBottomSheetRouteName);
    })();
  }, [connectFarcasterAlertInfo, fid, isActive, loggedIn, navigate]);

  return <FarcasterDataHandler />;
}

export default FacasterHandler;
