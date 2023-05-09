// @flow

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

function useOnFirstLaunchEffect(uniqueKey: string, effect: () => mixed) {
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (started) {
        return;
      }
      setStarted(true);
      const hasBeenExecuted = await AsyncStorage.getItem(uniqueKey);
      if (hasBeenExecuted) {
        return;
      }

      try {
        await effect();
      } finally {
        await AsyncStorage.setItem(uniqueKey, 'true');
      }
    })();
  }, [effect, started, uniqueKey]);
}

export { useOnFirstLaunchEffect };
