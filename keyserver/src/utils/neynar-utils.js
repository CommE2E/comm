//  @flow

import { getCommConfig } from 'lib/utils/comm-config.js';

type NeynarConfig = {
  +key: string,
  +signerUUID?: string,
  +neynarWebhookSecret?: string,
};

function getNeynarConfig(): Promise<?NeynarConfig> {
  return getCommConfig<NeynarConfig>({
    folder: 'secrets',
    name: 'neynar',
  });
}

export { getNeynarConfig };
