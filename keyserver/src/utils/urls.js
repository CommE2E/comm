// @flow

import { values } from 'lib/utils/objects';

import commAppURLFacts from '../../facts/commapp_url';
import landingURLFacts from '../../facts/landing_url';
import squadCalURLFacts from '../../facts/squadcal_url';

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
  return squadCalURLFacts;
}

function getCommAppURLFacts(): AppURLFacts {
  return commAppURLFacts;
}

function getAppURLFactsFromRequestURL(url: string): AppURLFacts {
  const commURLFacts = getCommAppURLFacts();
  return url.startsWith(commURLFacts.baseRoutePath)
    ? commURLFacts
    : getSquadCalURLFacts();
}

function getLandingURLFacts(): AppURLFacts {
  return landingURLFacts;
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
