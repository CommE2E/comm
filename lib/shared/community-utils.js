// @flow

const GATE_TAG_FARCASTER_CHANNEL = true;

function farcasterChannelTagBlobHash(secret: string): string {
  return `farcaster_channel_tag_${secret}`;
}

export { GATE_TAG_FARCASTER_CHANNEL, farcasterChannelTagBlobHash };
