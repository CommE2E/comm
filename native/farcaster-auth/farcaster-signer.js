// @flow

// eslint-disable-next-line import/extensions
import { mnemonicToAccount } from 'viem/accounts';

window.onDataCallback = async function (message: string, mnemonic: string) {
  try {
    const account = mnemonicToAccount(mnemonic);
    const signature = await account.signMessage({
      message: message,
    });

    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        result: 'success',
        signature: signature,
      }),
    );
  } catch (error) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        result: 'failure',
        error: error.message,
      }),
    );
  }
};
