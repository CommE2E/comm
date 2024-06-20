// @flow

function farcasterChannelTagBlobHash(farcasterChannelID: string): string {
  return `farcaster_channel_tag_${farcasterChannelID}`;
}

export { farcasterChannelTagBlobHash };
