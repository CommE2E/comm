// @flow

import * as React from 'react';

import { useLightweightSyncOnAppStart } from 'lib/shared/farcaster/farcaster-hooks.js';
import {
  useCurrentUserSupportsDCs,
  useFarcasterDCsLoaded,
  useFarcasterDCsSyncCanceled,
} from 'lib/utils/farcaster-utils.js';

import FarcasterSyncLoadingScreen from '../farcaster/farcaster-sync-loading-screen.react.js';

type Props = {
  +children: React.Node,
};

function FarcasterSyncOverlay(props: Props): React.Node {
  const { children } = props;
  const farcasterDCsLoaded = useFarcasterDCsLoaded();
  const isFarcasterSyncCanceled = useFarcasterDCsSyncCanceled();
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();

  const isFullSyncInProgress =
    currentUserSupportsDCs &&
    farcasterDCsLoaded === false &&
    !isFarcasterSyncCanceled;

  useLightweightSyncOnAppStart();

  const style = React.useMemo(() => {
    if (!isFullSyncInProgress) {
      return {};
    }
    return { opacity: 0 };
  }, [isFullSyncInProgress]);

  const loadingScreen = React.useMemo(() => {
    if (!isFullSyncInProgress) {
      return null;
    }
    return <FarcasterSyncLoadingScreen />;
  }, [isFullSyncInProgress]);

  return (
    <>
      <div style={style}>{children}</div>
      {loadingScreen}
    </>
  );
}

export default FarcasterSyncOverlay;
