// @flow

import * as React from 'react';
import { Platform } from 'react-native';

import { fetchFeatureFlags } from 'lib/utils/feature-flags-utils.js';
import { useIsCurrentUserStaff } from 'native/utils/staff-utils.js';

import { codeVersion } from '../redux/persist.js';

type FeatureFlagsConfiguration = {
  +[feature: string]: boolean,
};

type FeatureFlagsContextType = {
  +configuration: FeatureFlagsConfiguration,
  +loaded: boolean,
};

const defaultContext = {
  configuration: {},
  loaded: false,
};

const FeatureFlagsContext: React.Context<FeatureFlagsContextType> =
  React.createContext<FeatureFlagsContextType>(defaultContext);

type Props = {
  +children: React.Node,
};
function FeatureFlagsProvider(props: Props): React.Node {
  const { children } = props;
  const isStaff = useIsCurrentUserStaff();

  const [featuresConfig, setFeaturesConfig] = React.useState(defaultContext);
  React.useEffect(() => {
    (async () => {
      try {
        const config = await fetchFeatureFlags(
          Platform.OS,
          isStaff,
          codeVersion,
        );
        const configuration = {};
        for (const feature of config.enabledFeatures) {
          configuration[feature] = true;
        }
        setFeaturesConfig({
          configuration,
          loaded: true,
        });
      } catch (e) {
        console.error('Feature flag retrieval failed:', e);
      }
    })();
  }, [isStaff]);

  return (
    <FeatureFlagsContext.Provider value={featuresConfig}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export { FeatureFlagsContext, FeatureFlagsProvider };
