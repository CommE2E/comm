// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function fetchCommCommunityIDsByFarcasterChannelIDs(
  farcasterChannelIDs: $ReadOnlyArray<string>,
): Promise<{
  communityMappings: $ReadOnlyArray<[string, string]>,
  unresolvedFarcasterChannelIDs: $ReadOnlyArray<string>,
}> {
  if (farcasterChannelIDs.length === 0) {
    return { communityMappings: [], unresolvedFarcasterChannelIDs: [] };
  }

  const query = SQL`
    SELECT id, farcaster_channel_id
    FROM communities
    WHERE farcaster_channel_id IN (${farcasterChannelIDs})
  `;

  const [result] = await dbQuery(query);

  const resolvedFarcasterChannelIDs = result.map(
    row => row.farcaster_channel_id,
  );
  const communityMappings = result.map(row => [
    row.farcaster_channel_id,
    row.id.toString(),
  ]);
  const unresolvedFarcasterChannelIDs = farcasterChannelIDs.filter(
    farcasterChannelID =>
      !resolvedFarcasterChannelIDs.includes(farcasterChannelID),
  );

  return { communityMappings, unresolvedFarcasterChannelIDs };
}

async function fetchCommunityIDsByFarcasterChannelIDsScript() {
  const farcasterChannelIDs: $ReadOnlyArray<string> = [
    'coop-recs',
    'memes',
    'farcaster',
    'design',
    'zk',
    'founders',
    'dev',
    'frontend',
    'fc-updates',
    'fitness',
    'food',
    'frames',
    'nouns',
    'tabletop',
    'warpcast',
    'books',
    'music',
    'gaming',
    'new-york',
    'art',
    'travel',
    'ted',
    'farcasther',
    'screens',
    'op-stack',
    'outcasts',
    'tropical-house',
    'farcon',
    'skininthegame',
    'football',
    'coop',
    'lifeisgood',
    'running',
    'product',
    'rust',
    'cameron',
    'f1',
    'design-everydays',
    'quilibrium',
    'regen',
    'commitment',
    'history',
    'itookaphoto',
    'ai',
    'nouns-animators',
    'raycast',
    'photography',
    'adhd',
    'aerospace',
    'america',
    'apple',
    'appreciation',
    'backend',
    'classical',
    'cypherpunk',
    'jobs',
    'geopolitics',
    'homelabs',
    'kismetcasa',
    'light',
    'mike',
    'mlb',
    'nba',
    'nfl',
    'olympics',
    'privacy',
    'roastcaster',
    'south-korea',
    'sovereignty',
  ];
  //const farcasterCryptoChannelIDs: $ReadOnlyArray<string> = [
  //  "base",
  //  "ethereum",
  //  "zora",
  //  "degen",
  //  "whoami",
  //  "wearesoearly",
  //  "lp",
  //  "replyguys",
  //  "perl",
  //  "talent",
  //  "superrare",
  //  "build",
  //  "airstack",
  //  "paidgroup",
  //  "mfers",
  //  "onchain-blocks",
  //  "evm",
  //  "higher",
  //  "enjoy",
  //  "farcards",
  //  "base-builds",
  //  "rainbow",
  //  "swatches",
  //  "layer3",
  //  "drakula",
  //  "yellow",
  //  "ogs",
  //  "onchainsummer",
  //  "fabric",
  //  "berachain",
  //  "bracket",
  //  "alfafrens",
  //  "cryptoart",
  //  "degentokenbase",
  //  "solana",
  //  "wildcardclub",
  //  "farcastles",
  //  "imagine-infra",
  //  "imagine",
  //  "onchain",
  //  "sharetoearn",
  //  "goat",
  //  "matcha",
  //  "basecolors",
  //  "crypto-news",
  //  "launchcaster",
  //  "neynar",
  //  "party",
  //  "purple",
  //  "saloon",
  //  "sofi",
  //  "theblockexp",
  //  "zora-devs",
  //];
  const { communityMappings, unresolvedFarcasterChannelIDs } =
    await fetchCommCommunityIDsByFarcasterChannelIDs(farcasterChannelIDs);

  console.log('Comm community ID mappings (FarcasterChannelID, CommunityID):');
  communityMappings.forEach(([farcasterChannelID, communityID]) =>
    console.log(`(${farcasterChannelID}, ${communityID})`),
  );

  if (unresolvedFarcasterChannelIDs.length > 0) {
    console.log(
      'Unresolved Farcaster channel IDs:',
      unresolvedFarcasterChannelIDs,
    );
  }
}

main([fetchCommunityIDsByFarcasterChannelIDsScript]);
