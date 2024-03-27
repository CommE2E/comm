// @flow

export type WebViewMessageEvent = {
  +nativeEvent: {
    +data: string,
    ...
  },
  ...
};
