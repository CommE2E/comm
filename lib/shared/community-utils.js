// @flow

const DISABLE_TAGGING_FARCASTER_CHANNEL = true;

function farcasterChannelTagBlobHash(farcasterChannelID: string): string {
  return `farcaster_channel_tag_${farcasterChannelID}`;
}

export { DISABLE_TAGGING_FARCASTER_CHANNEL, farcasterChannelTagBlobHash };
