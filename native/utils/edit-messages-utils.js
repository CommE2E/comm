// @flow

import Alert from 'react-native/Libraries/Alert/Alert.js';

function exitEditAlert(onDiscard: () => void, onPress: ?() => void): void {
  Alert.alert(
    'Discard changes?',
    'You have unsaved changes which will be discarded if you navigate away.',
    [
      {
        text: 'Continue editing',
        style: 'cancel',
        onPress: onPress,
      },
      {
        text: 'Discard edit',
        style: 'destructive',
        onPress: onDiscard,
      },
    ],
  );
}

export { exitEditAlert };
