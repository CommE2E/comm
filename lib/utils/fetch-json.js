// @flow

import $param from 'jquery-param';

import { ServerError } from './fetch-utils';
import { getConfig } from './config';

async function fetchJSON(
  cookie: ?string,
  url: string,
  data: {[key: string]: mixed},
) {
  url = getConfig().urlPrefix + url;
  const response = await fetch(url, {
    // Flow gets confused by some enum type, so we need this cast
    'method': ('POST': MethodType),
    // This is necessary to allow cookie headers to get passed down to us
    'credentials': 'same-origin',
    'headers': {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    'body': $param(data),
  });
  const json = await response.json();
  console.log(json);
  if (json.error) {
    throw new ServerError(json.error, json);
  }
  return json;
}

export type FetchJSON = (url: string, data: Object) => Promise<Object>;

export default fetchJSON;
