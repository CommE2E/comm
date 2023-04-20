// @flow

import invariant from 'invariant';

import ashoat from 'lib/facts/ashoat.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { threadTypes } from 'lib/types/thread-types.js';
import {
  getDate,
  dateString,
  prettyDateWithoutYear,
  prettyDateWithoutDay,
} from 'lib/utils/date-utils.js';

import createMessages from '../creators/message-creator.js';
import { createThread } from '../creators/thread-creator.js';
import { fetchEntryInfosForThreadThisWeek } from '../fetchers/entry-fetchers.js';
import { createScriptViewer } from '../session/scripts.js';

const devUpdateThread = '1358777';
const weeklyDevSyncScheduleThread = '4138372';

const dailyUpdateMessage = (dateWithoutYear: string, dateWithoutDay: string) =>
  `### ${dateWithoutDay} update

Share your updates for ${dateWithoutYear} here please!`;

const dateIsWeekend = (date: Date) =>
  date.getDay() === 0 || date.getDay() === 6;

// This function will do something four days a week. It skips Saturday and
// Sunday. The hard part is the third skipped day, which is the day of the
// weekly dev sync. By default this is Monday, but if the dev sync is on a
// different day, then an admin will put a calendar entry in the
// weeklyDevSyncScheduleThread indicating which day to skip.
async function createDailyUpdatesThread() {
  if (!process.env.RUN_COMM_TEAM_DEV_SCRIPTS) {
    // This is a job that the Comm internal team uses
    return;
  }

  const viewer = createScriptViewer(ashoat.id);
  const now = new Date();
  if (dateIsWeekend(now)) {
    // nothing happens on Saturday or Sunday
    return;
  }

  // Figure out which day the dev sync is on
  let devSyncDay = 1; // default to Monday
  const entryInfosInDevSyncScheduleThreadThisWeek =
    await fetchEntryInfosForThreadThisWeek(viewer, weeklyDevSyncScheduleThread);
  for (const entryInfo of entryInfosInDevSyncScheduleThreadThisWeek) {
    const entryInfoDate = getDate(
      entryInfo.year,
      entryInfo.month,
      entryInfo.day,
    );
    if (dateIsWeekend(entryInfoDate)) {
      // Ignore calendar entries on weekend
      continue;
    }
    devSyncDay = entryInfoDate.getDay();
    // Use the newest entryInfo. fetchEntryInfos sorts by creation time
    break;
  }

  if (devSyncDay === now.getDay()) {
    // Skip the dev sync day
    return;
  }

  const dayString = dateString(now);
  const dateWithoutYear = prettyDateWithoutYear(dayString);
  const dateWithoutDay = prettyDateWithoutDay(dayString);

  const [{ id: messageID }] = await createMessages(viewer, [
    {
      type: messageTypes.TEXT,
      threadID: devUpdateThread,
      creatorID: ashoat.id,
      time: Date.now(),
      text: dailyUpdateMessage(dateWithoutYear, dateWithoutDay),
    },
  ]);
  invariant(
    messageID,
    'message returned from createMessages always has ID set',
  );

  await createThread(viewer, {
    type: threadTypes.SIDEBAR,
    parentThreadID: devUpdateThread,
    name: `${dateWithoutDay} update`,
    sourceMessageID: messageID,
  });
}

export { createDailyUpdatesThread };
