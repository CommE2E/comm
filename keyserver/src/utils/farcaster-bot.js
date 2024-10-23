// @flow

import { getCommConfig } from 'lib/utils/comm-config.js';

export type FarcasterBotConfig = {
  +authoritativeFarcasterBot?: boolean,
};

async function getFarcasterBotConfig(): Promise<FarcasterBotConfig> {
  const config = await getCommConfig<FarcasterBotConfig>({
    folder: 'facts',
    name: 'farcaster_bot',
  });

  return {
    authoritativeFarcasterBot: config?.authoritativeFarcasterBot ?? false,
  };
}

export { getFarcasterBotConfig };
