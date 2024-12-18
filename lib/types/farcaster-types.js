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
  +header_image_url?: string,
  +description: string,
  ...
};

export type NeynarCast = {
  +hash: string,
  +thread_hash: string,
  +text: string,
  +author: NeynarUser,
  ...
};

export type NeynarWebhookCastAuthor = {
  +object: 'user',
  +fid: number,
  +custody_address: string,
  +username: string,
  +display_name: string,
  +pfp_url: string,
  ...
};

export type NeynarWebhookCastCreatedData = {
  +object: 'cast',
  +hash: string,
  +thread_hash: string,
  +text: string,
  +channel?: ?NeynarWebhookChannel,
  +parent_hash?: ?string,
  +author: NeynarWebhookCastAuthor,
  ...
};

export type NeynarWebhookChannel = {
  +id: string,
  +name: string,
  +image_url: string,
  ...
};

export type NeynarWebhookCastCreatedEvent = {
  +created_at: number,
  +type: 'cast.created',
  +data: NeynarWebhookCastCreatedData,
  ...
};

export type NeynarPostCastResponse = {
  +success: boolean,
  ...
};
