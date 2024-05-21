// @flow

import { Alert } from 'react-native';

function onStateDifference(message: string) {
  Alert.alert('State difference found', message);
}

export { onStateDifference };
