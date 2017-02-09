// @flow

import type { BaseAppState, Dispatch } from '../types/redux-types';

let saveAttemptIndex = 0;

function reduxWrapPromise<T: BaseAppState, A>(
  keyName: string,
  promise: Promise<*>,
) {
  const curSaveAttempt = ++saveAttemptIndex;
  return async (dispatch: Dispatch<T, A>) => {
    dispatch({
      type: keyName + "_STARTED",
      onlyLatestRequestMatters: true,
      fetchIndex: curSaveAttempt,
    });
    const response = await promise;
    if (response && response.result) {
      dispatch({
        type: keyName + "_SUCCESS",
        payload: response.result,
        fetchIndex: curSaveAttempt,
      });
    } else {
      dispatch({
        type: keyName + "_FAILED",
        error: true,
        fetchIndex: curSaveAttempt,
      });
    }
  };
}

export {
  reduxWrapPromise,
};
