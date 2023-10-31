// @flow

function parseCookies(header: string): { +[string]: string } {
  const values = header.split(';').map(v => v.split('='));

  const cookies: { [string]: string } = {};
  for (const [key, value] of values) {
    cookies[decodeURIComponent(key.trim())] = decodeURIComponent(value.trim());
  }

  return cookies;
}

export { parseCookies };
