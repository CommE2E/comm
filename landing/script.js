// @flow

import 'isomorphic-fetch';

import invariant from 'invariant';
import React from 'react';
import ReactDOM from 'react-dom';

import Root from './root';

const root = document.getElementById('react-root');
invariant(root, "cannot find id='react-root' element!");

ReactDOM.render(<Root />, root);
