// @flow

const DISABLE_TAGGING_FARCASTER_CHANNEL = true;

function farcasterChannelTagBlobHash(
  farcasterChannelID: string,
  keyserverID: string,
): string {
  return `farcaster_channel_tag_${keyserverID}_${farcasterChannelID}`;
}

export { DISABLE_TAGGING_FARCASTER_CHANNEL, farcasterChannelTagBlobHash };
