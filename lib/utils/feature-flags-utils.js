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
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return {
      enabledFeatures: json.enabled_features,
    };
  } catch (e) {
    console.log(text);
    throw e;
  }
}

export { fetchFeatureFlags };
