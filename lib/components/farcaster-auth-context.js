// @flow

import invariant from 'invariant';
import * as React from 'react';

export type AuthMessageSigningInput = {
  +fid: string,
  +walletMnemonic: string,
  +nonce: string,
};

export type SignedMessage = {
  +message: string,
  +signature: string,
};

export type FarcasterAuthContextType = {
  +signAuthMessage: (input: AuthMessageSigningInput) => Promise<SignedMessage>,
};

const FarcasterAuthContext: React.Context<FarcasterAuthContextType> =
  React.createContext<FarcasterAuthContextType>({
    signAuthMessage: async () => '',
  });

function useSignFarcasterAuthMessage(): AuthMessageSigningInput => Promise<SignedMessage> {
  const farcasterAuthContext = React.useContext(FarcasterAuthContext);
  invariant(farcasterAuthContext, 'Farcaster auth context should be present');
  return farcasterAuthContext.signAuthMessage;
}

export { FarcasterAuthContext, useSignFarcasterAuthMessage };
