// @flow

import { viewerIsMember } from 'lib/shared/thread-utils';
import type {
  ThreadSubscription,
  SubscriptionUpdateRequest,
} from 'lib/types/subscription-types';
import { updateTypes } from 'lib/types/update-types';
import { ServerError } from 'lib/utils/errors';

import { createUpdates } from '../creators/update-creator';
import { dbQuery, SQL } from '../database/database';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import type { Viewer } from '../session/viewer';

async function userSubscriptionUpdater(
  viewer: Viewer,
  update: SubscriptionUpdateRequest,
): Promise<ThreadSubscription> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const { threadInfos } = await fetchThreadInfos(
    viewer,
    SQL`t.id = ${update.threadID}`,
  );
  const threadInfo = threadInfos[update.threadID];
  if (!viewerIsMember(threadInfo)) {
    throw new ServerError('not_member');
  }

  const promises = [];

  const newSubscription = {
    ...threadInfo.currentUser.subscription,
    ...update.updatedFields,
  };
  const saveQuery = SQL`
    UPDATE memberships
    SET subscription = ${JSON.stringify(newSubscription)}
    WHERE user = ${viewer.userID} AND thread = ${update.threadID}
  `;
  promises.push(dbQuery(saveQuery));

  const time = Date.now();
  const updateDatas = [
    {
      type: updateTypes.UPDATE_THREAD,
      userID: viewer.userID,
      time,
      threadID: update.threadID,
    },
  ];
  promises.push(
    createUpdates(updateDatas, { viewer, updatesForCurrentSession: 'ignore' }),
  );

  await Promise.all(promises);
  return newSubscription;
}

export { userSubscriptionUpdater };
