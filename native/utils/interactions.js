// @flow

import { InteractionManager } from 'react-native';

function waitForInteractions(): Promise<void> {
  return new Promise(resolve => {
    InteractionManager.runAfterInteractions(resolve);
  });
}

export { waitForInteractions };
