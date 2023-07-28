// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
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
  +loadedFromService: boolean,
};

const defaultContext = {
  configuration: {},
  loadedFromService: false,
};

const FeatureFlagsContext: React.Context<FeatureFlagsContextType> =
  React.createContext<FeatureFlagsContextType>(defaultContext);

const featureFlagsStorageKey = 'FeatureFlags';

type Props = {
  +children: React.Node,
};
function FeatureFlagsProvider(props: Props): React.Node {
  const { children } = props;
  const isStaff = useIsCurrentUserStaff();

  const [featuresConfig, setFeaturesConfig] = React.useState(defaultContext);

  React.useEffect(() => {
    (async () => {
      if (featuresConfig.loadedFromService) {
        return;
      }

      const persistedFeaturesConfig = await AsyncStorage.getItem(
        featureFlagsStorageKey,
      );
      if (!persistedFeaturesConfig) {
        return;
      }

      setFeaturesConfig(config =>
        config.loadedFromService
          ? config
          : {
              configuration: JSON.parse(persistedFeaturesConfig),
              loadedFromService: false,
            },
      );
    })();
  }, [featuresConfig.loadedFromService]);

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
          loadedFromService: true,
        });
        await AsyncStorage.setItem(
          featureFlagsStorageKey,
          JSON.stringify(configuration),
        );
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

export { FeatureFlagsContext, FeatureFlagsProvider, featureFlagsStorageKey };
