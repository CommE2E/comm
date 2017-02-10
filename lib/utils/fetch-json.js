// @flow

import 'isomorphic-fetch'; // side-effect: window.fetch
import { param } from 'jquery';

import { ServerError } from './fetch-utils';

async function fetchJSON(
  url: string,
  data: {[key: string]: mixed},
) {
  const response = await fetch(url, {
    // Flow gets confused by some enum type, so we need this cast
    'method': ('POST': MethodType),
    // This is necessary to allow cookie headers to get passed down to us
    'credentials': 'same-origin',
    'headers': {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    // We need to use jQuery to create URL-encoded form data for PHP.
    // There is a polyfill we could use for URLSearchParams, which supports
    // URL-encoding form data. But it doesn't support nested structure.
    'body': param(data),
  });
  const json = await response.json();
  console.log(json);
  if (json.error) {
    throw new ServerError(json.error, json);
  }
  return json;
}

export default fetchJSON;
