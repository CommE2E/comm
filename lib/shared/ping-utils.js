// @flow

import type {
  PingStartingPayload,
  PingActionInput,
  PingResult,
} from '../types/ping-types';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from '../utils/action-utils';

import { pingActionTypes } from '../actions/ping-actions';
import { newSessionIDActionType } from '../reducers/session-reducer';

// We can't push yet, so we rely on pings to keep Redux state updated with the
// server. As a result, we do them fairly frequently (once every 3s) while the
// app is active and the user is logged in.
const pingFrequency = 3000; // in milliseconds

function earliestTimeConsideredCurrent() {
  return Date.now() - pingFrequency - 1500;
}

type Props = {
  cookie: ?string,
  pingStartingPayload: () => PingStartingPayload,
  pingActionInput: (startingPayload: PingStartingPayload) => PingActionInput,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  ping: (actionInput: PingActionInput) => Promise<PingResult>,
};
function dispatchPing(props: Props) {
  const startingPayload = props.pingStartingPayload();
  if (
    startingPayload.loggedIn ||
    (props.cookie && props.cookie.startsWith("user="))
  ) {
    const actionInput = props.pingActionInput(startingPayload);
    props.dispatchActionPromise(
      pingActionTypes,
      props.ping(actionInput),
      undefined,
      startingPayload,
    );
  } else if (startingPayload.newSessionID) {
    // Normally, the PING_STARTED will handle setting a new sessionID if the
    // user hasn't interacted in a bit. Since we don't run pings when logged
    // out, we use another action for it.
    props.dispatchActionPayload(
      newSessionIDActionType,
      startingPayload.newSessionID,
    );
  }
}

export {
  pingFrequency,
  earliestTimeConsideredCurrent,
  dispatchPing,
};
