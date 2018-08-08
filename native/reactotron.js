// @flow

let reactotron = null;
if (__DEV__) {
  const { default: Reactotron } = require('reactotron-react-native');
  const { reactotronRedux } = require('reactotron-redux');
  reactotron = Reactotron
    .configure()
    .useReactNative()
    .use(reactotronRedux())
    .connect();
}

export default reactotron;
