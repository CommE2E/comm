// @flow

import { useSelector as reactReduxUseSelector } from 'react-redux';

import type { AppState } from './redux-setup.js';

function useSelector<SS>(
  selector: (state: AppState) => SS,
  equalityFn?: (a: SS, b: SS) => boolean,
): SS {
  return reactReduxUseSelector(selector, equalityFn);
}

export { useSelector };
