// @flow

import commAppURLFacts from '../../facts/commapp_url';
import landingURLFacts from '../../facts/landing_url';
import squadCalURLFacts from '../../facts/squadcal_url';
import baseURLFacts from '../../facts/url';

type GlobalURLFacts = {
  +baseRoutePath: string,
};

function getGlobalURLFacts(): GlobalURLFacts {
  return baseURLFacts;
}

export type AppURLFacts = {
  +baseDomain: string,
  +basePath: string,
  +baseRoutePath: string,
  +https: boolean,
};
type LandingURLFacts = {
  ...AppURLFacts,
};

function getSquadCalURLFacts(): AppURLFacts {
  return squadCalURLFacts;
}

function getCommAppURLFacts(): AppURLFacts {
  return commAppURLFacts;
}

function getAppURLFactsFromRequestURL(url: string): AppURLFacts {
  const commURLFacts = getCommAppURLFacts();
  const routePath = baseURLFacts.baseRoutePath + commURLFacts.baseRoutePath;
  return url.startsWith(removeDuplicateSlashesFromPath(routePath))
    ? commURLFacts
    : getSquadCalURLFacts();
}

function getLandingURLFacts(): LandingURLFacts {
  return landingURLFacts;
}

function generateAllRoutePaths(endpoint: string): string[] {
  const landingBaseRoutePath = landingURLFacts.baseRoutePath;
  const routePaths = generateBaseAndCommAppRoutePaths(endpoint);
  routePaths.push(landingBaseRoutePath + endpoint);
  return routePaths;
}

function generateBaseAndCommAppRoutePaths(endpoint: string): string[] {
  const globalBaseRoutePath = baseURLFacts.baseRoutePath;
  const commAppBaseRoutePath = commAppURLFacts.baseRoutePath;
  return [globalBaseRoutePath + endpoint, commAppBaseRoutePath + endpoint];
}

function removeDuplicateSlashesFromPath(routePath: string): string {
  return routePath.replace(/\/\//g, '/');
}

export {
  getGlobalURLFacts,
  getSquadCalURLFacts,
  getCommAppURLFacts,
  getLandingURLFacts,
  getAppURLFactsFromRequestURL,
  generateAllRoutePaths,
  generateBaseAndCommAppRoutePaths,
  removeDuplicateSlashesFromPath,
};
