// @flow

import 'isomorphic-fetch';

import invariant from 'invariant';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';

import Root from './root';

const root = document.getElementById('react-root');
invariant(root, "cannot find id='react-root' element!");

hydrateRoot(root, <Root />);
