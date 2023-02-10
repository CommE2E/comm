// @flow

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';
import { earliestFocusedTimeConsideredExpired } from '../shared/focused-times.js';

async function deleteActivityForViewerSession(
  viewer: Viewer,
  beforeTime?: number,
): Promise<void> {
  const query = SQL`
    DELETE FROM focused
    WHERE user = ${viewer.userID} AND session = ${viewer.session}
  `;
  if (beforeTime !== undefined) {
    query.append(SQL`AND time < ${beforeTime}`);
  }
  await dbQuery(query);
}

async function deleteOrphanedActivity(): Promise<void> {
  const time = earliestFocusedTimeConsideredExpired();
  await dbQuery(SQL`
    DELETE f
    FROM focused f
    LEFT JOIN threads t ON t.id = f.thread
    LEFT JOIN users u ON u.id = f.user
    LEFT JOIN sessions s ON s.id = f.session
    WHERE t.id IS NULL OR u.id IS NULL OR s.id IS NULL OR f.time <= ${time}
  `);
}

export { deleteActivityForViewerSession, deleteOrphanedActivity };
