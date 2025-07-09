// @flow

import * as React from 'react';

import { useSignFarcasterAuthMessage } from 'lib/components/farcaster-auth-context.js';

function useGetAuthToken(): (
  fid: string,
  walletMnemonic: string,
) => Promise<string> {
  const signAuthMessage = useSignFarcasterAuthMessage();

  return React.useCallback(
    async (fid: string, walletMnemonic: string) => {
      const nonceResponse = await fetch(
        'https://client.farcaster.xyz/v2/get-dc-nonce',
      );
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.result.nonce;

      const signResult = await signAuthMessage({
        nonce,
        fid,
        walletMnemonic,
      });

      const params = new URLSearchParams({
        message: signResult.message,
        signature: signResult.signature,
      });
      const tokenResponse = await fetch(
        `https://client.farcaster.xyz/v2/get-dc-auth-token?${params.toString()}`,
      );
      const tokenData = await tokenResponse.json();
      return tokenData.result.token;
    },
    [signAuthMessage],
  );
}

export { useGetAuthToken };
