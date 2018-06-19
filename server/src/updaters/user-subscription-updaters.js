// @flow

import type {
  ThreadSubscription,
  SubscriptionUpdateRequest,
} from 'lib/types/subscription-types';
import type { Viewer } from '../session/viewer';
import { updateTypes } from 'lib/types/update-types';

import { ServerError } from 'lib/utils/errors';
import { viewerIsMember } from 'lib/shared/thread-utils';

import { dbQuery, SQL } from '../database';
import { createUpdates } from '../creators/update-creator';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';

async function userSubscriptionUpdater(
  viewer: Viewer,
  update: SubscriptionUpdateRequest,
): Promise<ThreadSubscription> {
  const threadInfos = await fetchThreadInfos(
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
    WHERE user = ${viewer.id} AND thread = ${update.threadID}
  `;
  promises.push(dbQuery(saveQuery));

  const time = Date.now();
  const updateDatas = [{
    type: updateTypes.UPDATE_THREAD,
    userID: viewer.id,
    time,
    threadInfo: {
      ...threadInfo,
      currentUser: {
        ...threadInfo.currentUser,
        subscription: newSubscription,
      },
    },
  }];
  promises.push(createUpdates(updateDatas, viewer.cookieID));

  await Promise.all(promises);
  return newSubscription;
}

export {
  userSubscriptionUpdater,
};
