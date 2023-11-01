// @flow

import {
  useSelector as reactReduxUseSelector,
  useDispatch as reactReduxUseDispatch,
} from 'react-redux';

import type { AppState, Dispatch } from '../types/redux-types.js';

function useSelector<SS>(
  selector: (state: AppState) => SS,
  equalityFn?: (a: SS, b: SS) => boolean,
): SS {
  return reactReduxUseSelector(selector, equalityFn);
}

function useDispatch(): Dispatch {
  return reactReduxUseDispatch<Dispatch>();
}

export { useSelector, useDispatch };
