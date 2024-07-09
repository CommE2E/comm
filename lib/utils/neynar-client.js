// @flow

import invariant from 'invariant';

import { getMessageForException } from './errors.js';
import type {
  NeynarChannel,
  NeynarUser,
  NeynarUserWithViewerContext,
} from '../types/farcaster-types.js';

type FetchFollowersResponse = {
  +result: {
    +users: $ReadOnlyArray<NeynarUserWithViewerContext>,
    +next: {
      +cursor: ?string,
    },
  },
};

type FetchFarcasterChannelsResponse = {
  +channels: $ReadOnlyArray<NeynarChannel>,
  +next: {
    +cursor: ?string,
  },
};

type FetchFarcasterChannelByNameResponse = {
  +channels: $ReadOnlyArray<NeynarChannel>,
};

type FetchUsersResponse = {
  +users: $ReadOnlyArray<NeynarUser>,
};

type FetchFarcasterChannelInfoResponse = {
  +channel: NeynarChannel,
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
const fetchChannelsLimit = 50;

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
        console.log(
          'Failed to fetch friend FIDs:',
          getMessageForException(error) ?? 'unknown',
        );
        throw error;
      }
    } while (paginationCursor);

    return fids;
  }

  async fetchFollowedFarcasterChannels(fid: string): Promise<NeynarChannel[]> {
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

        const json: FetchFarcasterChannelsResponse = await response.json();

        const { channels, next } = json;

        channels.forEach(channel => {
          farcasterChannels.push(channel);
        });

        paginationCursor = next.cursor;
      } catch (error) {
        console.log(
          'Failed to fetch followed Farcaster channels:',
          getMessageForException(error) ?? 'unknown',
        );
        throw error;
      }
    } while (paginationCursor);

    return farcasterChannels;
  }

  async fetchFarcasterChannelByName(
    channelName: string,
  ): Promise<?NeynarChannel> {
    const params: { [string]: string } = {
      q: channelName,
    };

    const url = getNeynarURL('2', 'channel/search', params);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          api_key: this.apiKey,
        },
      });

      const json: FetchFarcasterChannelByNameResponse = await response.json();

      const { channels } = json;

      for (const channel of channels) {
        if (channel.name.toLowerCase() === channelName.toLowerCase()) {
          return channel;
        }
      }

      return null;
    } catch (error) {
      console.log(
        'Failed to search Farcaster channel by name:',
        getMessageForException(error) ?? 'unknown',
      );
      throw error;
    }
  }

  async getFarcasterUsernames(
    fids: $ReadOnlyArray<string>,
  ): Promise<Array<?string>> {
    const fidsLeft = [...fids];
    const results: Array<?string> = [];
    do {
      // Neynar API allows querying 100 at a time
      const batch = fidsLeft.splice(0, 100);
      const url = getNeynarURL('2', 'user/bulk', { fids: batch.join(',') });
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            api_key: this.apiKey,
          },
        });

        const json: FetchUsersResponse = await response.json();
        const { users } = json;

        const neynarUserMap = new Map<number, NeynarUser>();
        for (const neynarUser of users) {
          neynarUserMap.set(neynarUser.fid, neynarUser);
        }

        for (const fid of batch) {
          const neynarUser = neynarUserMap.get(parseInt(fid));
          results.push(neynarUser ? neynarUser.username : null);
        }
      } catch (error) {
        console.log(
          'Failed to fetch Farcaster usernames:',
          getMessageForException(error) ?? 'unknown',
        );
        throw error;
      }
    } while (fidsLeft.length > 0);
    return results;
  }

  async getAllChannels(): Promise<Array<NeynarChannel>> {
    const farcasterChannels = [];
    let paginationCursor = null;

    do {
      const params: { [string]: string } = {
        limit: fetchChannelsLimit.toString(),
        ...(paginationCursor ? { cursor: paginationCursor } : null),
      };

      const url = getNeynarURL('2', 'channel/list', params);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            api_key: this.apiKey,
          },
        });

        const json: FetchFarcasterChannelsResponse = await response.json();

        const { channels, next } = json;

        channels.forEach(channel => {
          farcasterChannels.push(channel);
        });

        paginationCursor = next.cursor;
      } catch (error) {
        console.log(
          'Failed to fetch all Farcaster channels:',
          getMessageForException(error) ?? 'unknown',
        );
        throw error;
      }
    } while (paginationCursor);

    return farcasterChannels;
  }

  async fetchFarcasterChannelInfo(
    channelID: string,
    viewerFID: string,
  ): Promise<NeynarChannel> {
    const params: { [string]: string } = {
      id: channelID,
      type: 'id',
      viewer_fid: viewerFID,
    };

    const url = getNeynarURL('2', 'channel', params);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          api_key: this.apiKey,
        },
      });

      const json: FetchFarcasterChannelInfoResponse = await response.json();

      return json.channel;
    } catch (error) {
      console.log(
        'Failed to fetch Farcaster channel info:',
        getMessageForException(error) ?? 'unknown',
      );
      throw error;
    }
  }

  async checkIfCurrentUserFIDIsValid(fid: string): Promise<boolean> {
    const url = getNeynarURL('2', 'user/bulk', { fids: fid });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          api_key: this.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      console.log(
        'Failed to check if current user FID is valid:',
        getMessageForException(error) ?? 'unknown',
      );
      throw error;
    }
  }
}

export { NeynarClient };
