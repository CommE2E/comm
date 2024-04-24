// @flow

// This is a message that the rendered webpage
// (landing/connect-farcaster.react.js) uses to communicate back
// to the React Native WebView that is rendering it
// (native/components/farcaster-web-view.react.js)
export type FarcasterWebViewMessage =
  | {
      +type: 'farcaster_url',
      +url: string,
    }
  | {
      +type: 'farcaster_data',
      +fid: string,
    };

export type FarcasterUser = {
  +fid: number,
  +viewerContext: {
    +following: boolean,
  },
  ...
};

export type FarcasterChannel = {
  +id: string,
  +name: string,
  ...
};
