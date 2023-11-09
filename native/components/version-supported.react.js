// @flow

import * as React from 'react';

import { commRustModule } from '../native-modules.js';
import Alert from '../utils/alert.js';

const VersionSupportedChecker = (): React.Node => {
  const checkVersionSupport = async (): Promise<void> => {
    try {
      const isVersionSupported = await commRustModule.versionSupported();
      if (!isVersionSupported) {
        Alert.alert(
          'Your client version is not supported. Please upgrade to the newest version.',
        );
      }
    } catch (error) {
      console.error('Error checking version:', error);
    }
  };

  React.useEffect(() => {
    checkVersionSupport();
  }, []);

  return null;
};

export default VersionSupportedChecker;
