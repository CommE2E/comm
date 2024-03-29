// @flow

import invariant from 'invariant';

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
      +cursor: string,
    },
  },
};

const neynarBaseURL = 'https://api.neynar.com/';
const neynarURLs = {
  '1': `${neynarBaseURL}v1/farcaster/`,
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

class NeynarClient {
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // We're using the term "friend" for a bidirectional follow
  async fetchFriendFIDs(fid: string): Promise<string[]> {
    const fids = [];
    const params: { [string]: string } = {
      fid,
      viewerFid: fid,
      limit: fetchFollowerLimit.toString(),
    };
    while (true) {
      const url = getNeynarURL('1', 'followers', params);
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
        if (!user.viewerContext.following) {
          continue;
        }
        fids.push(user.fid.toString());
      }
      if (users.length < fetchFollowerLimit) {
        return fids;
      }
      params.cursor = json.result.next.cursor;
    }
    // eslint-disable-next-line no-unreachable
    throw new Error('should not get here');
  }
}

export { NeynarClient };
