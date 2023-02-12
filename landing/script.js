// @flow

localStorage.clear();

import 'isomorphic-fetch';

import invariant from 'invariant';
import React from 'react';
// eslint-disable-next-line import/extensions
import { hydrateRoot } from 'react-dom/client';

import Root from './root.js';

const root = document.getElementById('react-root');
invariant(root, "cannot find id='react-root' element!");

hydrateRoot(root, <Root />);
