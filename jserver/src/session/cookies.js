// @flow

import type { Connection } from '../database';

import invariant from 'invariant';
import bcrypt from 'twin-bcrypt';

import { setCurrentViewer } from './viewer';
import { SQL } from '../database';

const cookieLifetime = 30*24*60*60*1000; // in milliseconds

// This function is meant to consume a cookie that has already been processed.
// That means it doesn't have any logic to handle an invalid cookie, and it
// doesn't the cookie's last_update timestamp.
async function setCurrentViewerFromCookie(
  conn: Connection,
  cookieData: {[cookieName: string]: string},
) {
  if (cookieData.user) {
    const [ cookieID, cookiePassword ] = cookieData.user.split(':');
    invariant(cookieID && cookiePassword, `invalid cookie ${cookieData.user}`);
    const query = SQL`
      SELECT hash, user, last_update FROM cookies
      WHERE id = ${cookieID} AND user IS NOT NULL
    `;
    const [ result ] = await conn.query(query);
    const cookieRow = result[0];
    invariant(cookieRow, `invalid user cookie ID ${cookieID}`);
    invariant(
      bcrypt.compareSync(cookiePassword, cookieRow.hash),
      `invalid cookie password for user cookie ID ${cookieID}`,
    );
    invariant(
      cookieRow.last_update + cookieLifetime > Date.now(),
      `user cookie ID ${cookieID} is expired`,
    );
    setCurrentViewer({
      anonymous: false,
      userID: cookieRow.user.toString(),
      cookieID,
      cookiePassword,
    });
  } else if (cookieData.anonymous) {
    const [ cookieID, cookiePassword ] = cookieData.anonymous.split(':');
    invariant(cookieID && cookiePassword, `invalid cookie ${cookieData.user}`);
    const query = SQL`
      SELECT last_update, hash FROM cookies
      WHERE id = ${cookieID} AND user IS NULL
    `;
    const [ result ] = await conn.query(query);
    const cookieRow = result[0];
    invariant(cookieRow, `invalid anonymous cookie ID ${cookieID}`);
    invariant(
      bcrypt.compareSync(cookiePassword, cookieRow.hash),
      `invalid cookie password for anonymous cookie ID ${cookieID}`,
    );
    invariant(
      cookieRow.last_update + cookieLifetime > Date.now(),
      `anonymous cookie ID ${cookieID} is expired`,
    );
    setCurrentViewer({
      anonymous: true,
      cookieID,
      cookiePassword,
    });
  } else {
    invariant(false, "no cookie provided by request!");
  }
}

export {
  setCurrentViewerFromCookie,
};
