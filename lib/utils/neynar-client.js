// @flow

import invariant from 'invariant';

import { getMessageForException } from './errors.js';
import type {
  NeynarChannel,
  NeynarUser,
  NeynarCast,
  NeynarPostCastResponse,
} from '../types/farcaster-types.js';

type FetchRelevantFollowersResponse = {
  +all_relevant_followers_dehydrated: $ReadOnlyArray<{
    +user: {
      +fid: number,
      ...
    },
    ...
  }>,
  ...
};

type FetchFarcasterChannelsPagedResponse = {
  +channels: $ReadOnlyArray<NeynarChannel>,
  +next: {
    +cursor: ?string,
  },
};

type FetchFarcasterChannelsResponse = {
  +channels: $ReadOnlyArray<NeynarChannel>,
  ...
};

type FetchUsersResponse = {
  +users: $ReadOnlyArray<NeynarUser>,
};

type FetchFarcasterChannelInfoResponse = {
  +channel: NeynarChannel,
};

type FetchFarcasterCastByHashResponse = {
  +cast: NeynarCast,
};

export type FarcasterUser = {
  +username: string,
  +pfpURL: string,
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

const fetchFollowedChannelsLimit = 100;
const fetchChannelsLimit = 50;

class NeynarClient {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // We're using the term "friend" for a bidirectional follow
  async fetchFriendFIDs(fid: string): Promise<string[]> {
    const params: { [string]: string } = {
      target_fid: fid,
      viewer_fid: fid,
    };

    const url = getNeynarURL('2', 'followers/relevant', params);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          api_key: this.apiKey,
        },
      });

      const json: FetchRelevantFollowersResponse = await response.json();
      const { all_relevant_followers_dehydrated } = json;

      return all_relevant_followers_dehydrated.map(follower =>
        follower.user.fid.toString(),
      );
    } catch (error) {
      console.log(
        'Failed to fetch friend FIDs:',
        getMessageForException(error) ?? 'unknown',
      );
      throw error;
    }
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

        const json: FetchFarcasterChannelsPagedResponse = await response.json();

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

  async fetchFarcasterChannelByID(channelID: string): Promise<?NeynarChannel> {
    const params: { [string]: string } = {
      id: channelID,
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

  async fetchFarcasterChannelsByIDs(
    channelIDs: $ReadOnlyArray<string>,
  ): Promise<NeynarChannel[]> {
    const params: { [string]: string } = {
      ids: channelIDs.join(','),
    };

    const url = getNeynarURL('2', 'channel/bulk', params);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          api_key: this.apiKey,
        },
      });

      const json: FetchFarcasterChannelsResponse = await response.json();

      return json.channels ? [...json.channels] : [];
    } catch (error) {
      console.log(
        'Failed to fetch Farcaster channel infos:',
        getMessageForException(error) ?? 'unknown',
      );
      throw error;
    }
  }

  async getFarcasterUsers(
    fids: $ReadOnlyArray<string>,
  ): Promise<Array<?FarcasterUser>> {
    const fidsLeft = [...fids];
    const results: Array<?FarcasterUser> = [];
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
          results.push(
            neynarUser
              ? { username: neynarUser.username, pfpURL: neynarUser.pfp_url }
              : null,
          );
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

        const json: FetchFarcasterChannelsPagedResponse = await response.json();

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

  async fetchFarcasterCastByHash(hash: string): Promise<NeynarCast> {
    const url = getNeynarURL('2', 'cast', { identifier: hash, type: 'hash' });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          api_key: this.apiKey,
        },
      });

      const json: FetchFarcasterCastByHashResponse = await response.json();

      return json.cast;
    } catch (error) {
      console.log(
        'Failed to fetch Farcaster cast:',
        getMessageForException(error) ?? 'unknown',
      );
      throw error;
    }
  }

  async postCast(params: {
    +signerUUID: string,
    +parent: string,
    +text?: ?string,
    +embeds?: ?$ReadOnlyArray<{ +url: string }>,
  }): Promise<NeynarPostCastResponse> {
    const url = getNeynarURL('2', 'cast', {});
    const body: {
      signer_uuid: string,
      parent: string,
      text?: string,
      embeds?: $ReadOnlyArray<{ +url: string }>,
    } = {
      signer_uuid: params.signerUUID,
      parent: params.parent,
    };

    if (params.embeds) {
      body.embeds = params.embeds;
    }
    if (params.text) {
      body.text = params.text;
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'api_key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error) {
      console.log(
        'Failed to post Farcaster cast:',
        getMessageForException(error) ?? 'unknown',
      );
      throw error;
    }
  }
}

export { NeynarClient };
