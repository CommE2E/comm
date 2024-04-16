// @flow

import invariant from 'invariant';

import { getMessageForException } from './errors.js';

type FarcasterUser = {
  +fid: number,
  +viewerContext: {
    +following: boolean,
  },
  ...
};

type FetchFollowersResponse = {
  +result: {
    +users: $ReadOnlyArray<FarcasterUser>,
    +next: {
      +cursor: ?string,
    },
  },
};

type FarcasterChannel = {
  +id: string,
  +name: string,
  ...
};

type FetchFollowedFarcasterChannelsResponse = {
  +channels: $ReadOnlyArray<FarcasterChannel>,
  +next: {
    +cursor: ?string,
  },
};

const neynarBaseURL = 'https://api.neynar.com/';
const neynarURLs = {
  '1': `${neynarBaseURL}v1/farcaster/`,
  '2': `${neynarBaseURL}v2/farcaster/`,
};
function getNeynarURL(
  apiVersion: string,
  apiCall: string,
  params: { [string]: string },
): string {
  const neynarURL = neynarURLs[apiVersion];
  invariant(
    neynarURL,
    `could not find Neynar URL for apiVersion ${apiVersion}`,
  );
  return `${neynarURL}${apiCall}?${new URLSearchParams(params).toString()}`;
}

const fetchFollowerLimit = 150;
const fetchFollowedChannelsLimit = 100;

class NeynarClient {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // We're using the term "friend" for a bidirectional follow
  async fetchFriendFIDs(fid: string): Promise<string[]> {
    const fids = [];
    let paginationCursor = null;

    do {
      const params: { [string]: string } = {
        fid,
        viewerFid: fid,
        limit: fetchFollowerLimit.toString(),
        ...(paginationCursor ? { cursor: paginationCursor } : null),
      };

      const url = getNeynarURL('1', 'followers', params);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            api_key: this.apiKey,
          },
        });

        const json: FetchFollowersResponse = await response.json();
        const { users } = json.result;

        for (const user of users) {
          if (user.viewerContext.following) {
            fids.push(user.fid.toString());
          }
        }

        paginationCursor = json.result.next.cursor;
      } catch (error) {
        console.log('Failed to fetch friend FIDs:', error);
        throw new Error(getMessageForException(error) ?? 'unknown');
      }
    } while (paginationCursor);

    return fids;
  }

  async fetchFollowedFarcasterChannels(
    fid: string,
  ): Promise<FarcasterChannel[]> {
    const farcasterChannels = [];
    let paginationCursor = null;

    do {
      const params: { [string]: string } = {
        fid,
        limit: fetchFollowedChannelsLimit.toString(),
        ...(paginationCursor ? { cursor: paginationCursor } : null),
      };

      const url = getNeynarURL('2', 'user/channels', params);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            api_key: this.apiKey,
          },
        });

        const json: FetchFollowedFarcasterChannelsResponse =
          await response.json();

        const { channels, next } = json;

        channels.forEach(channel => {
          farcasterChannels.push(channel);
        });

        paginationCursor = next.cursor;
      } catch (error) {
        console.log('Failed to fetch followed Farcaster channels:', error);
        throw new Error(getMessageForException(error) ?? 'unknown');
      }
    } while (paginationCursor);

    return farcasterChannels;
  }
}

export { NeynarClient };
