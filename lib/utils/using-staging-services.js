// @flow

import servicesEnvironmentModule from './services-environment.cjs';

const { servicesEnvironments, resolveServicesEnvironment } =
  servicesEnvironmentModule;

const servicesEnvironment = resolveServicesEnvironment();

const usingStagingServices: boolean =
  servicesEnvironment === servicesEnvironments.staging;

export { usingStagingServices };
