// @flow

import { cookieLifetime } from 'lib/types/session-types';

import { dbQuery, SQL, mergeOrConditions } from '../database';
import { fetchDeviceTokensForCookie } from '../fetchers/device-token-fetchers';

async function deleteCookie(cookieID: string): Promise<void> {
  await dbQuery(SQL`
    DELETE c, i, u, iu, s, is, fo
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    LEFT JOIN updates u ON u.target = c.id
    LEFT JOIN ids iu ON iu.id = u.id
    LEFT JOIN sessions s ON s.cookie = c.id
    LEFT JOIN ids is ON is.id = s.id
    LEFT JOIN focused fo ON fo.session = s.id
    WHERE c.id = ${cookieID}
  `);
}

async function deleteCookiesOnLogOut(
  userID: string,
  cookieID: string,
): Promise<void> {
  const deviceToken = await fetchDeviceTokensForCookie(cookieID);

  const conditions = [ SQL`c.id = ${cookieID}` ];
  if (deviceToken) {
    conditions.push(SQL`c.device_token = ${deviceToken}`);
  }

  const query = SQL`
    DELETE c, i, u, iu, s, is, fo
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    LEFT JOIN updates u ON u.target = c.id
    LEFT JOIN ids iu ON iu.id = u.id
    LEFT JOIN sessions s ON s.cookie = c.id
    LEFT JOIN ids is ON is.id = s.id
    LEFT JOIN focused fo ON fo.session = s.id
    WHERE c.user = ${userID} AND
  `;
  query.append(mergeOrConditions(conditions));

  await dbQuery(query);
}

async function deleteExpiredCookies(): Promise<void> {
  const earliestInvalidLastUpdate = Date.now() - cookieLifetime;
  const query = SQL`
    DELETE c, i, u, iu, s, is, fo
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    LEFT JOIN updates u ON u.target = c.id
    LEFT JOIN ids iu ON iu.id = u.id
    LEFT JOIN sessions s ON s.cookie = c.id
    LEFT JOIN ids is ON is.id = s.id
    LEFT JOIN focused fo ON fo.session = s.id
    WHERE c.last_used <= ${earliestInvalidLastUpdate}
  `;
  await dbQuery(query);
}

export {
  deleteCookie,
  deleteCookiesOnLogOut,
  deleteExpiredCookies,
};
