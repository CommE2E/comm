// @flow

import '@babel/polyfill';
import 'isomorphic-fetch';

import React from 'react';
import ReactDOM from 'react-dom';
import invariant from 'invariant';

import Root from './root';

const root = document.getElementById('react-root');
invariant(root, "cannot find id='react-root' element!");

ReactDOM.hydrate(<Root />, root);
