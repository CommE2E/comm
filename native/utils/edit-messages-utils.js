// @flow

import Alert from 'react-native/Libraries/Alert/Alert.js';

type ExitAlertOptions = {
  onDiscard: () => void,
  onContinueEditing?: () => void,
};

function exitEditAlert(options: ExitAlertOptions): void {
  const { onDiscard, onContinueEditing } = options;
  Alert.alert(
    'Discard changes?',
    'You have unsaved changes which will be discarded if you navigate away.',
    [
      {
        text: 'Continue editing',
        style: 'cancel',
        onPress: onContinueEditing,
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
