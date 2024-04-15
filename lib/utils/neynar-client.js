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
      +cursor: ?string,
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
  async fetchFriendFIDs(fid: string): Promise<$ReadOnlyArray<string>> {
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
        throw new Error(`Failed to fetch friend FIDs: ${error}`);
      }
    } while (paginationCursor);

    return fids;
  }
}

export { NeynarClient };
