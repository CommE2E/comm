// @flow

import 'react-native';
import * as React from 'react';
import renderer from 'react-test-renderer';

import Root from '../root.react.js';

// Note: test renderer must be required after react-native.

it('renders correctly', () => {
  renderer.create(<Root />);
});
