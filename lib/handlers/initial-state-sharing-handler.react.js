// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from '../hooks/account-hooks.js';
import { getOwnPeerDevices } from '../selectors/user-selectors.js';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-types.js';
import { getCreateThickRawThreadInfoInputFromThreadInfo } from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';

function InitialStateSharingHandler(): React.Node {
  const userDeviceIDs = useSelector(state =>
    getOwnPeerDevices(state).map(peer => peer.deviceID),
  );
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const identityContext = React.useContext(IdentityClientContext);
  const processAndSendDMOperation = useProcessAndSendDMOperation();

  const deviceIDs = React.useRef<$ReadOnlySet<string>>(new Set(userDeviceIDs));

  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();

  React.useEffect(() => {
    void (async () => {
      if (!loggedIn) {
        return;
      }

      const oldDeviceIDs = deviceIDs.current;
      const newDeviceIDs = new Set(userDeviceIDs);
      deviceIDs.current = newDeviceIDs;

      invariant(identityContext, 'Identity context should be set');
      const authMetadata = await identityContext.getAuthMetadata();
      if (authMetadata.deviceID !== userDeviceIDs[0] || !viewerID) {
        return;
      }

      const recipients = new Set<string>();
      for (const deviceID of newDeviceIDs) {
        if (!oldDeviceIDs.has(deviceID)) {
          recipients.add(deviceID);
        }
      }

      if (recipients.size === 0) {
        return;
      }

      for (const threadInfo of values(threadInfos)) {
        if (!threadInfo.thick) {
          continue;
        }

        const existingThreadDetails =
          getCreateThickRawThreadInfoInputFromThreadInfo(threadInfo);
        const operation = {
          type: 'add_viewer_to_thread_members',
          existingThreadDetails,
          editorID: viewerID,
          time: threadInfo.creationTime,
          messageID: null,
          addedUserIDs: [],
        };
        void processAndSendDMOperation({
          type: dmOperationSpecificationTypes.OUTBOUND,
          op: operation,
          recipients: {
            type: 'some_devices',
            deviceIDs: [...recipients],
          },
          sendOnly: true,
        });
      }
    })();
  }, [
    loggedIn,
    identityContext,
    processAndSendDMOperation,
    threadInfos,
    userDeviceIDs,
    viewerID,
  ]);

  return null;
}

export { InitialStateSharingHandler };
