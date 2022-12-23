// @flow

export type SIWENonceResponse = {
  +nonce: string,
};

// This is a message that the rendered webpage (landing/siwe.react.js) uses to
// communicate back to the React Native WebView that is rendering it
// (native/account/siwe-panel.react.js)
export type SIWEWebViewMessage = {
  +type: 'siwe_success',
  +address: string,
  +message: string,
  +signature: string,
};
