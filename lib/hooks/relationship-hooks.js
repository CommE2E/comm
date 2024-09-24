// @flow

import * as React from 'react';
import uuid from 'uuid';

import { useAllowOlmViaTunnelbrokerForDMs } from './flag-hooks.js';
import { useGetAndUpdateDeviceListsForUsers } from './peer-list-hooks.js';
import { useNewThickThread } from './thread-hooks.js';
import { updateRelationships as serverUpdateRelationships } from '../actions/relationship-actions.js';
import { useLegacyAshoatKeyserverCall } from '../keyserver-conn/legacy-keyserver-call.js';
import { pendingToRealizedThreadIDsSelector } from '../selectors/thread-selectors.js';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import {
  userSupportsThickThreads,
  getPendingThreadID,
} from '../shared/thread-utils.js';
import type { RelationshipOperation } from '../types/messages/update-relationship.js';
import type { AppState } from '../types/redux-types.js';
import {
  type RelationshipAction,
  type RelationshipErrors,
  type RelationshipRequestUserInfo,
  type RelationshipRequest,
  relationshipActions,
  userRelationshipStatus,
} from '../types/relationship-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import { useSelector } from '../utils/redux-utils.js';
import sleep from '../utils/sleep.js';

type RobotextPlanForUser =
  | { +plan: 'send_to_thin_thread' }
  | {
      +plan: 'send_to_existing_thick_thread',
      +thickThreadID: string,
    }
  | { +plan: 'send_to_new_thick_thread' };

// We can't call processAndSendDMOperation until device lists are in
// AuxUserStore, but this hook needs to support users who haven't been fetched
// yet. We implement an effect that watches AuxUserStore after a fetch, so we
// know when we're ready to call processAndSendDMOperation.
type Step = {
  +step: 'waiting_for_updated_device_lists',
  +action: RelationshipAction,
  +userIDs: $ReadOnlyArray<string>,
  +waitingForUserIDs: $ReadOnlyArray<string>,
  +resolve: RelationshipErrors => void,
  +reject: Error => mixed,
};

const deviceListTimeout = 10 * 1000; // ten seconds

function useUpdateRelationships(): (
  action: RelationshipAction,
  userIDs: $ReadOnlyArray<string>,
) => Promise<RelationshipErrors> {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const sendRobotextToThickThread = React.useCallback(
    async (
      userID: string,
      thickThreadID: string,
      relationshipOperation: RelationshipOperation,
    ): Promise<void> => {
      if (!viewerID) {
        console.log('skipping sendRobotextToThickThread since logged out');
        return;
      }
      const op = {
        type: 'update_relationship',
        threadID: thickThreadID,
        creatorID: viewerID,
        time: Date.now(),
        operation: relationshipOperation,
        targetUserID: userID,
        messageID: uuid.v4(),
      };
      const opSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        // We need to use a different mechanism than `all_thread_members`
        // because when creating a thread, the thread might not yet
        // be in the store.
        recipients: {
          type: 'some_users',
          userIDs: [viewerID, userID],
        },
      };
      await processAndSendDMOperation(opSpecification);
    },
    [viewerID, processAndSendDMOperation],
  );

  const updateRelationships = useLegacyAshoatKeyserverCall(
    serverUpdateRelationships,
  );
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const pendingToRealizedThreadIDs = useSelector((state: AppState) =>
    pendingToRealizedThreadIDsSelector(state.threadStore.threadInfos),
  );
  const userInfos = useSelector(state => state.userStore.userInfos);
  const rawThreadInfos = useSelector(
    (state: AppState) => state.threadStore.threadInfos,
  );
  const createNewThickThread = useNewThickThread();

  // This callback contains the core of the logic. We extract it here because
  // before we run it, we need to make sure auxUserInfos is correctly populated,
  // and that might require waiting on a Redux action to be reduced
  const updateRelationshipsAndSendRobotext = React.useCallback(
    async (action: RelationshipAction, userIDs: $ReadOnlyArray<string>) => {
      if (!viewerID) {
        console.log(
          'skipping updateRelationshipsAndSendRobotext since logged out',
        );
        return {};
      }
      const planForUsers = new Map<string, RobotextPlanForUser>();
      for (const userID of userIDs) {
        const supportsThickThreads = userSupportsThickThreads(
          userID,
          auxUserInfos,
        );
        if (!supportsThickThreads) {
          planForUsers.set(userID, { plan: 'send_to_thin_thread' });
          continue;
        }

        const pendingThreadID = getPendingThreadID(
          threadTypes.PERSONAL,
          [userID, viewerID],
          null,
        );

        const realizedThreadID =
          pendingToRealizedThreadIDs.get(pendingThreadID);
        if (!realizedThreadID) {
          planForUsers.set(userID, { plan: 'send_to_new_thick_thread' });
          continue;
        }

        const rawThreadInfo = rawThreadInfos[realizedThreadID];
        if (!rawThreadInfo) {
          console.log(
            `could not find rawThreadInfo for realizedThreadID ` +
              `${realizedThreadID} found for pendingThreadID ` +
              pendingThreadID,
          );
          planForUsers.set(userID, { plan: 'send_to_new_thick_thread' });
          continue;
        }

        if (rawThreadInfo.type === threadTypes.PERSONAL) {
          planForUsers.set(userID, {
            plan: 'send_to_existing_thick_thread',
            thickThreadID: realizedThreadID,
          });
        } else {
          planForUsers.set(userID, { plan: 'send_to_thin_thread' });
        }
      }

      const usersForKeyserverCall: {
        [userID: string]: RelationshipRequestUserInfo,
      } = {};
      for (const [userID, planForUser] of planForUsers) {
        usersForKeyserverCall[userID] = {
          createRobotextInThinThread:
            planForUser.plan === 'send_to_thin_thread',
        };
      }

      let request: RelationshipRequest;
      if (action === 'farcaster' || action === 'friend') {
        request = { action, users: usersForKeyserverCall };
      } else {
        request = { action, users: usersForKeyserverCall };
      }
      const keyserverResultPromise = updateRelationships(request);

      const thickThreadPromises: Array<Promise<void>> = [];
      for (const [userID, planForUser] of planForUsers) {
        if (planForUser.plan === 'send_to_thin_thread') {
          // Keyserver calls handles creating robotext for thin threads
          continue;
        }
        if (
          action !== relationshipActions.FRIEND &&
          action !== relationshipActions.FARCASTER_MUTUAL
        ) {
          // We only create robotext for FRIEND and FARCASTER_MUTUAL
          continue;
        }

        const relationshipStatus = userInfos[userID]?.relationshipStatus;
        let relationshipOperation;
        if (action === relationshipActions.FARCASTER_MUTUAL) {
          relationshipOperation = 'farcaster_mutual';
        } else if (
          relationshipStatus === userRelationshipStatus.FRIEND ||
          relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED
        ) {
          relationshipOperation = 'request_accepted';
        } else {
          relationshipOperation = 'request_sent';
        }

        if (planForUser.plan === 'send_to_existing_thick_thread') {
          const { thickThreadID } = planForUser;
          thickThreadPromises.push(
            sendRobotextToThickThread(
              userID,
              thickThreadID,
              relationshipOperation,
            ),
          );
          continue;
        }

        const createThickThreadAndSendRobotextPromise = (async () => {
          const thickThreadID = await createNewThickThread({
            type: threadTypes.PERSONAL,
            initialMemberIDs: [userID],
          });
          return await sendRobotextToThickThread(
            userID,
            thickThreadID,
            relationshipOperation,
          );
        })();
        thickThreadPromises.push(createThickThreadAndSendRobotextPromise);
      }

      const [keyserverResult] = await Promise.all([
        keyserverResultPromise,
        Promise.all(thickThreadPromises),
      ]);
      return keyserverResult;
    },
    [
      viewerID,
      updateRelationships,
      auxUserInfos,
      pendingToRealizedThreadIDs,
      sendRobotextToThickThread,
      userInfos,
      rawThreadInfos,
      createNewThickThread,
    ],
  );

  const [step, setStep] = React.useState<?Step>();

  // This hook watches AuxUserStore after a fetch to make sure we're ready to
  // call processAndSendDMOperation. We can't do that from the returned
  // callback, as it will have an old version of auxUserInfos bound into it.
  React.useEffect(() => {
    if (step?.step !== 'waiting_for_updated_device_lists') {
      return;
    }
    const { action, userIDs, waitingForUserIDs, resolve, reject } = step;
    for (const userID of waitingForUserIDs) {
      const supportsThickThreads = userSupportsThickThreads(
        userID,
        auxUserInfos,
      );
      if (!supportsThickThreads) {
        // It's safe to wait until every single user ID in waitingForUserIDs
        // passes this check because we make the same check when populating
        // waitingForUserIDs in the callback below
        return;
      }
    }
    setStep(null);
    updateRelationshipsAndSendRobotext(action, userIDs).then(resolve, reject);
  }, [step, auxUserInfos, updateRelationshipsAndSendRobotext]);

  const usingOlmViaTunnelbrokerForDMs = useAllowOlmViaTunnelbrokerForDMs();
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();

  return React.useCallback(
    async (action: RelationshipAction, userIDs: $ReadOnlyArray<string>) => {
      // We only need to create robotext for FRIEND and FARCASTER_MUTUAL,
      // so we skip the complexity below for other RelationshipActions
      if (
        !usingOlmViaTunnelbrokerForDMs ||
        (action !== relationshipActions.FRIEND &&
          action !== relationshipActions.FARCASTER_MUTUAL)
      ) {
        let request: RelationshipRequest;
        if (action === 'farcaster' || action === 'friend') {
          const users = Object.fromEntries(
            userIDs.map(userID => [
              userID,
              {
                createRobotextInThinThread: true,
              },
            ]),
          );
          request = { action, users };
        } else {
          const users = Object.fromEntries(userIDs.map(userID => [userID, {}]));
          request = { action, users };
        }
        return await updateRelationships(request);
      }

      const missingDeviceListsUserIDs: Array<string> = [];
      for (const userID of userIDs) {
        const supportsThickThreads = userSupportsThickThreads(
          userID,
          auxUserInfos,
        );
        if (!supportsThickThreads) {
          missingDeviceListsUserIDs.push(userID);
        }
      }

      if (missingDeviceListsUserIDs.length > 0) {
        const deviceLists = await getAndUpdateDeviceListsForUsers(
          missingDeviceListsUserIDs,
          true,
        );

        const waitingForUserIDs: Array<string> = [];
        for (const userID of missingDeviceListsUserIDs) {
          if (deviceLists[userID] && deviceLists[userID].devices.length > 0) {
            waitingForUserIDs.push(userID);
          }
        }

        if (waitingForUserIDs.length > 0) {
          const nextStepPromise = new Promise<RelationshipErrors>(
            (resolve, reject) => {
              setStep({
                step: 'waiting_for_updated_device_lists',
                action,
                userIDs,
                waitingForUserIDs,
                resolve,
                reject,
              });
            },
          );
          return await Promise.race([
            nextStepPromise,
            (async () => {
              await sleep(deviceListTimeout);
              throw new Error(`Fetch device lists timed out`);
            })(),
          ]);
        }
      }

      return await updateRelationshipsAndSendRobotext(action, userIDs);
    },
    [
      getAndUpdateDeviceListsForUsers,
      updateRelationshipsAndSendRobotext,
      updateRelationships,
      auxUserInfos,
      usingOlmViaTunnelbrokerForDMs,
    ],
  );
}

export { useUpdateRelationships };
