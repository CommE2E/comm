// @flow

import type { AppState } from '../redux/redux-setup';

import { useSelector as reactReduxUseSelector } from 'react-redux';

function useSelector<SS>(
  selector: (state: AppState) => SS,
  equalityFn?: (a: SS, b: SS) => boolean,
): SS {
  return reactReduxUseSelector(selector, equalityFn);
}

export { useSelector };
