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
  +https: boolean,
};
type LandingURLFacts = {
  ...AppURLFacts,
  +baseRoutePath: string,
};

function getSquadCalURLFacts(): AppURLFacts {
  return squadCalURLFacts;
}

function getCommAppURLFacts(): AppURLFacts {
  return commAppURLFacts;
}

function getAppURLFactsFromRequestURL(url: string): AppURLFacts {
  const commURLFacts = getCommAppURLFacts();
  return url.startsWith(commURLFacts.basePath)
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
  const { baseRoutePath } = baseURLFacts;
  const commAppBaseRoutePath = commAppURLFacts.basePath;
  return [baseRoutePath + endpoint, commAppBaseRoutePath + endpoint];
}

function stripCommAppBasePathFromURL(url: string): string {
  const commAppBaseRoutePath = commAppURLFacts.basePath;
  if (url.startsWith(commAppBaseRoutePath)) {
    return url.replace(commAppBaseRoutePath, baseURLFacts.baseRoutePath);
  }
  return url;
}

export {
  getGlobalURLFacts,
  getSquadCalURLFacts,
  getCommAppURLFacts,
  getLandingURLFacts,
  getAppURLFactsFromRequestURL,
  generateAllRoutePaths,
  generateBaseAndCommAppRoutePaths,
  stripCommAppBasePathFromURL,
};
