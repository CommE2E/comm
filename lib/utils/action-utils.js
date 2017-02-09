// @flow

import type { BaseAppState, Dispatch } from '../types/redux-types';

let saveAttemptIndex = 0;

function wrapActionPromise<T: BaseAppState, A>(
  actionType: string,
  promise: Promise<*>,
  onlyLatestRequestMatters: bool = true,
) {
  const curSaveAttempt = ++saveAttemptIndex;
  return async (dispatch: Dispatch<T, A>) => {
    dispatch({
      type: actionType + "_STARTED",
      onlyLatestRequestMatters,
      fetchIndex: curSaveAttempt,
    });
    try {
      const result = await promise;
      dispatch({
        type: actionType + "_SUCCESS",
        payload: result,
        fetchIndex: curSaveAttempt,
      });
    } catch (e) {
      dispatch({
        type: actionType + "_FAILED",
        error: true,
        payload: e,
        fetchIndex: curSaveAttempt,
      });
    }
  };
}

export {
  wrapActionPromise,
};
