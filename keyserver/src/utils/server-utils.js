// @flow
import { getCommConfig } from 'lib/utils/comm-config.js';

export type RunServerConfig = {
  +runKeyserver?: boolean,
  +runWebApp?: boolean,
  +runLanding?: boolean,
};

async function getRunServerConfig(): Promise<RunServerConfig> {
  const config = await getCommConfig<RunServerConfig>({
    folder: 'facts',
    name: 'run_server_config',
  });

  // By default, runs if config option not included
  return {
    runKeyserver: config?.runKeyserver ?? true,
    runWebApp: config?.runWebApp ?? true,
    runLanding: config?.runLanding ?? true,
  };
}

export { getRunServerConfig };
