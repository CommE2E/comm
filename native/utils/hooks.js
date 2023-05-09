// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

function useOnFirstLaunchEffect(uniqueKey: string, effect: () => mixed) {
  React.useEffect(() => {
    (async () => {
      const hasBeenExecuted = await AsyncStorage.getItem(uniqueKey);
      if (!hasBeenExecuted) {
        effect();
        await AsyncStorage.setItem(uniqueKey, JSON.stringify(true));
      }
    })();
  }, [effect, uniqueKey]);
}

export { useOnFirstLaunchEffect };
