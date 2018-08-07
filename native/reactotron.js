// @flow

import Reactotron, {
  networking,
  asyncStorage,
  trackGlobalErrors,
} from 'reactotron-react-native';
import { reactotronRedux } from 'reactotron-redux';

let reactotron = null;
if (__DEV__) {
  reactotron = Reactotron
    .configure()
    .useReactNative()
    .use(reactotronRedux())
    .use(networking())
    .use(asyncStorage())
    .use(trackGlobalErrors())
    .connect();
}

export default reactotron;
