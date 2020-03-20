// @flow

import 'react-native';
import * as React from 'react';
import App from '../app.react';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<App />);
});
