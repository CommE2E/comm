// @flow

import { dbQuery, SQL, mergeOrConditions } from '../database';
import { fetchDeviceTokensForCookie } from '../fetchers/device-token-fetchers';
import { cookieLifetime } from '../session/cookies';

async function deleteCookie(cookieID: string): Promise<void> {
  // Note that since the fi.session = c.id and u.target = c.id comparisons
  // compare a VARCHAR with an INT type, MySQL will caste the former to an INT.
  // This means it will parse off any prefixed numeral characters, and ignore
  // anything after the first non-numeral, which is exactly what we want.
  await dbQuery(SQL`
    DELETE c, i, fo, fi, u, iu
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    LEFT JOIN focused fo ON fo.cookie = c.id
    LEFT JOIN filters fi ON fi.session = c.id
    LEFT JOIN updates u ON u.target = c.id
    LEFT JOIN ids iu ON iu.id = u.id
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

  // Note that since the fi.session = c.id and u.target = c.id comparisons
  // compare a VARCHAR with an INT type, MySQL will caste the former to an INT.
  // This means it will parse off any prefixed numeral characters, and ignore
  // anything after the first non-numeral, which is exactly what we want.
  const query = SQL`
    DELETE c, i, fo, fi, u, iu
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    LEFT JOIN focused fo ON fo.cookie = c.id
    LEFT JOIN filters fi ON fi.session = c.id
    LEFT JOIN updates u ON u.target = c.id
    LEFT JOIN ids iu ON iu.id = u.id
    WHERE c.user = ${userID} AND
  `;
  query.append(mergeOrConditions(conditions));

  await dbQuery(query);
}

async function deleteExpiredCookies(): Promise<void> {
  const earliestInvalidLastUpdate = Date.now() - cookieLifetime;
  // Note that since the fi.session = c.id and u.target = c.id comparisons
  // compare a VARCHAR with an INT type, MySQL will caste the former to an INT.
  // This means it will parse off any prefixed numeral characters, and ignore
  // anything after the first non-numeral, which is exactly what we want.
  const query = SQL`
    DELETE c, i, fo, fi, u, iu
    FROM cookies c
    LEFT JOIN ids i ON i.id = c.id
    LEFT JOIN focused fo ON fo.cookie = c.id
    LEFT JOIN filters fi ON fi.session = c.id
    LEFT JOIN updates u ON u.target = c.id
    LEFT JOIN ids iu ON iu.id = u.id
    WHERE c.last_used <= ${earliestInvalidLastUpdate}
  `;
  await dbQuery(query);
}

export {
  deleteCookie,
  deleteCookiesOnLogOut,
  deleteExpiredCookies,
};
