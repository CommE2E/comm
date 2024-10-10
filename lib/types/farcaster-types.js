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

export type NeynarUser = {
  +fid: number,
  +username: string,
  +pfp_url: string,
  ...
};

export type NeynarUserWithViewerContext = $ReadOnly<{
  ...NeynarUser,
  +viewerContext: {
    +following: boolean,
  },
  ...
}>;

export type NeynarChannel = {
  +id: string,
  +name: string,
  +follower_count: number,
  +lead: {
    +fid: number,
    ...
  },
  +image_url: string,
  +description: string,
  ...
};
