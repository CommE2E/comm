// @flow

import invariant from 'invariant';

import { values } from 'lib/utils/objects';

export type AppURLFacts = {
  +baseDomain: string,
  +basePath: string,
  +https: boolean,
  +baseRoutePath: string,
};
const sitesObj = Object.freeze({
  a: 'landing',
  b: 'commapp',
  c: 'squadcal',
});
export type Site = $Values<typeof sitesObj>;
const sites: $ReadOnlyArray<Site> = values(sitesObj);

const cachedURLFacts = new Map();
async function fetchURLFacts(site: Site): Promise<?AppURLFacts> {
  const cached = cachedURLFacts.get(site);
  if (cached !== undefined) {
    return cached;
  }
  try {
    // $FlowFixMe
    const urlFacts = await import(`../../facts/${site}_url`);
    if (!cachedURLFacts.has(site)) {
      cachedURLFacts.set(site, urlFacts.default);
    }
  } catch {
    if (!cachedURLFacts.has(site)) {
      cachedURLFacts.set(site, null);
    }
  }
  return cachedURLFacts.get(site);
}

async function prefetchAllURLFacts() {
  await Promise.all(sites.map(fetchURLFacts));
}

function getSquadCalURLFacts(): AppURLFacts {
  const urlFacts = cachedURLFacts.get('squadcal');
  invariant(urlFacts, 'keyserver/facts/squadcal_url.json missing');
  return urlFacts;
}

function getCommAppURLFacts(): AppURLFacts {
  const urlFacts = cachedURLFacts.get('commapp');
  invariant(urlFacts, 'keyserver/facts/commapp_url.json missing');
  return urlFacts;
}

function getAppURLFactsFromRequestURL(url: string): AppURLFacts {
  const commURLFacts = getCommAppURLFacts();
  return commURLFacts && url.startsWith(commURLFacts.baseRoutePath)
    ? commURLFacts
    : getSquadCalURLFacts();
}

function getLandingURLFacts(): AppURLFacts {
  const urlFacts = cachedURLFacts.get('landing');
  invariant(urlFacts, 'keyserver/facts/landing_url.json missing');
  return urlFacts;
}

function clientPathFromRouterPath(
  routerPath: string,
  urlFacts: AppURLFacts,
): string {
  const { basePath } = urlFacts;
  return basePath + routerPath;
}

export {
  prefetchAllURLFacts,
  getSquadCalURLFacts,
  getCommAppURLFacts,
  getLandingURLFacts,
  getAppURLFactsFromRequestURL,
  clientPathFromRouterPath,
};
