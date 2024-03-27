// @flow

import * as React from 'react';

import { NeynarClient } from '../utils/neynar-client.js';

type NeynarClientContextType = {
  +client: NeynarClient,
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
    return {
      client: neynarClient,
    };
  }, [neynarClient]);

  return (
    <NeynarClientContext.Provider value={context}>
      {children}
    </NeynarClientContext.Provider>
  );
}

export { NeynarClientContext, NeynarClientProvider };
