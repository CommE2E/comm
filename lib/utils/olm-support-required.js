// @flow

import { hasMinCodeVersion } from '../shared/version-utils.js';
import type { IdentityPlatformDetails } from '../types/identity-service-types.js';
import {
  identityDeviceTypes,
  identityDeviceTypeToPlatform,
} from '../types/identity-service-types.js';

function olmSupportRequired(
  platformDetails: ?IdentityPlatformDetails,
): boolean {
  if (!platformDetails) {
    return true;
  }
  // Assuming the keyserver is always running on the newest
  // version, Olm compatibility is not required unlike for other
  // clients that might not be updated yet.
  if (platformDetails.deviceType === identityDeviceTypes.KEYSERVER) {
    return false;
  }
  const { deviceType, ...rest } = platformDetails;

  return !hasMinCodeVersion(
    {
      ...rest,
      platform: identityDeviceTypeToPlatform[deviceType],
    },
    {
      native: 559,
      web: 208,
    },
  );
}
export { olmSupportRequired };
