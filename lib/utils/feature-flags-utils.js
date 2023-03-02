// @flow

import featureFlags from '../facts/feature-flags.js';

type FeatureFlagsConfiguration = {
  +enabledFeatures: $ReadOnlyArray<string>,
};

async function fetchFeatureFlags(
  platform: string,
  isStaff: boolean,
  codeVersion: number,
): Promise<FeatureFlagsConfiguration> {
  const url = `${
    featureFlags.url
  }/features?platform=${platform}&is_staff=${isStaff.toString()}&code_version=${codeVersion}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  const json = await response.json();
  return {
    enabledFeatures: json.enabled_features,
  };
}

export { fetchFeatureFlags };
