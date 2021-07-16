// @flow

import AsyncStorage from '@react-native-community/async-storage';

let reactotron: any = null;
if (__DEV__) {
  const { default: Reactotron } = require('reactotron-react-native');
  const { reactotronRedux } = require('reactotron-redux');
  reactotron = Reactotron.configure()
    .setAsyncStorageHandler(AsyncStorage)
    .useReactNative()
    .use(reactotronRedux())
    .connect();
}

export default reactotron;
