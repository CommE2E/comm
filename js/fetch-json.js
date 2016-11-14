// @flow

import 'fetch'; // side-effect: window.fetch
import $ from 'jquery';

async function fetchJSON(
  url: string,
  data: {[key: string]: mixed},
) {
  let json;
  try {
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
      'body': $.param(data),
    });
    json = await response.json();
  } catch (e) {
    console.log(e);
    json = { "error": "exception" };
  }
  console.log(json);
  return json;
}

export default fetchJSON;
