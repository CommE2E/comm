// @flow

import Alert from '../utils/alert.js';

function onStateDifference(message: string) {
  Alert.alert('State difference found', message);
}

export { onStateDifference };
