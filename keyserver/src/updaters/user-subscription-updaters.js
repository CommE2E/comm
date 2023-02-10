// @flow

import { viewerIsMember } from 'lib/shared/thread-utils.js';
import type {
  ThreadSubscription,
  SubscriptionUpdateRequest,
} from 'lib/types/subscription-types.js';
import { updateTypes } from 'lib/types/update-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import type { Viewer } from '../session/viewer.js';

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
