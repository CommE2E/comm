// @flow

import invariant from 'invariant';

import { getCommConfig } from 'lib/utils/comm-config.js';
import { values } from 'lib/utils/objects.js';

export type AppURLFacts = {
  +baseDomain: string,
  +basePath: string,
  +https: boolean,
  +baseRoutePath: string,
  +proxy?: 'apache' | 'none' | 'aws', // defaults to apache
};
const validProxies = new Set(['apache', 'none', 'aws']);
const sitesObj = Object.freeze({
  a: 'landing',
  b: 'webapp',
  c: 'keyserver',
});
export type Site = $Values<typeof sitesObj>;
const sites: $ReadOnlyArray<Site> = values(sitesObj);

const cachedURLFacts = new Map<Site, ?AppURLFacts>();
async function fetchURLFacts(site: Site): Promise<?AppURLFacts> {
  const existing = cachedURLFacts.get(site);
  if (existing !== undefined) {
    return existing;
  }
  let urlFacts: ?AppURLFacts = await getCommConfig({
    folder: 'facts',
    name: `${site}_url`,
  });
  if (urlFacts) {
    const { proxy } = urlFacts;
    urlFacts = {
      ...urlFacts,
      proxy: proxy && validProxies.has(proxy) ? proxy : 'apache',
    };
  }
  cachedURLFacts.set(site, urlFacts);
  return urlFacts;
}

async function prefetchAllURLFacts() {
  await Promise.all(sites.map(fetchURLFacts));
}

function getKeyserverURLFacts(): ?AppURLFacts {
  return cachedURLFacts.get('keyserver');
}

function getWebAppURLFacts(): ?AppURLFacts {
  return cachedURLFacts.get('webapp');
}

function getAndAssertKeyserverURLFacts(): AppURLFacts {
  const urlFacts = getKeyserverURLFacts();
  invariant(urlFacts, 'keyserver/facts/keyserver_url.json missing');
  return urlFacts;
}

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function getAppURLFactsFromRequestURL(url: string): AppURLFacts {
  const webAppURLFacts = getWebAppURLFacts();
  if (webAppURLFacts && url.startsWith(webAppURLFacts.baseRoutePath)) {
    return webAppURLFacts;
  }
  const keyserverURLFacts = getKeyserverURLFacts();
  if (keyserverURLFacts && url.startsWith(keyserverURLFacts.baseRoutePath)) {
    return keyserverURLFacts;
  }
  invariant(false, 'request received but no URL facts are present');
}

function getLandingURLFacts(): ?AppURLFacts {
  return cachedURLFacts.get('landing');
}

function getAndAssertLandingURLFacts(): AppURLFacts {
  const urlFacts = getLandingURLFacts();
  invariant(urlFacts, 'keyserver/facts/landing_url.json missing');
  return urlFacts;
}

export type WebAppCorsConfig = { +domain: string | $ReadOnlyArray<string> };
async function getWebAppCorsConfig(): Promise<?WebAppCorsConfig> {
  const config = await getCommConfig<WebAppCorsConfig>({
    folder: 'facts',
    name: 'webapp_cors',
  });
  return config;
}

export {
  prefetchAllURLFacts,
  getKeyserverURLFacts,
  getWebAppURLFacts,
  getAndAssertKeyserverURLFacts,
  getLandingURLFacts,
  getAndAssertLandingURLFacts,
  getAppURLFactsFromRequestURL,
  getWebAppCorsConfig,
};
