// @flow

import type { NeynarChannel } from 'lib/types/farcaster-types.js';

import { main } from './utils.js';
import { neynarClient } from '../utils/fc-cache.js';

async function fetchAllFarcasterChannelsAndPrintSortedByFollowerCount() {
  const allChannels = await neynarClient.getAllChannels();
  allChannels.sort(
    (channelA: NeynarChannel, channelB: NeynarChannel) =>
      channelB.follower_count - channelA.follower_count,
  );
  const simplifiedChannelInfo = allChannels.map(({ id, follower_count }) => ({
    id,
    follower_count,
  }));
  simplifiedChannelInfo.splice(1000);
  console.log(JSON.stringify(simplifiedChannelInfo, undefined, '  '));
}

main([fetchAllFarcasterChannelsAndPrintSortedByFollowerCount]);
