// @flow

import { useSelector as reactReduxUseSelector } from 'react-redux';

import type { AppState } from './state-types.js';

function useSelector<SS, T = AppState>(
  selector: (state: T) => SS,
  equalityFn?: (a: SS, b: SS) => boolean,
): SS {
  return reactReduxUseSelector(selector, equalityFn);
}

export { useSelector };
