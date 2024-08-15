// @flow

import * as React from 'react';

import {
  getFCNames as baseGetFCNames,
  getFCAvatarURLs as baseGetFCAvatarURLs,
  type BaseFCNamesInfo,
  type BaseFCAvatarInfo,
  type GetFCNames,
  type GetFCAvatarURLs,
} from '../utils/farcaster-helpers.js';
import { FCCache } from '../utils/fc-cache.js';
import { NeynarClient } from '../utils/neynar-client.js';

type NeynarClientContextType = {
  +client: NeynarClient,
  +fcCache: FCCache,
  +getFCNames: GetFCNames,
  +getFCAvatarURLs: GetFCAvatarURLs,
};

const NeynarClientContext: React.Context<?NeynarClientContextType> =
  React.createContext<?NeynarClientContextType>();

type Props = {
  +apiKey: ?string,
  +children: React.Node,
};
function NeynarClientProvider(props: Props): React.Node {
  const { apiKey, children } = props;

  const neynarClient = React.useMemo(() => {
    if (!apiKey) {
      return null;
    }
    return new NeynarClient(apiKey);
  }, [apiKey]);

  const context = React.useMemo(() => {
    if (!neynarClient) {
      return null;
    }
    const fcCache = new FCCache(neynarClient);
    const getFCNames: GetFCNames = <T: ?BaseFCNamesInfo>(
      users: $ReadOnlyArray<T>,
    ): Promise<T[]> => baseGetFCNames(fcCache, users);
    const getFCAvatarURLs: GetFCAvatarURLs = (
      fids: $ReadOnlyArray<string>,
    ): Promise<BaseFCAvatarInfo[]> => baseGetFCAvatarURLs(fcCache, fids);
    return {
      client: neynarClient,
      fcCache,
      getFCNames,
      getFCAvatarURLs,
    };
  }, [neynarClient]);

  return (
    <NeynarClientContext.Provider value={context}>
      {children}
    </NeynarClientContext.Provider>
  );
}

export { NeynarClientContext, NeynarClientProvider };
