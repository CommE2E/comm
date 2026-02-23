const servicesEnvironments = Object.freeze({
  production: 'production',
  staging: 'staging',
});

const servicesEnvironmentValues = Object.values(servicesEnvironments);
function parseServicesEnvironmentOrThrow(servicesEnvironment, source) {
  if (servicesEnvironmentValues.includes(servicesEnvironment)) {
    return servicesEnvironment;
  }
  throw new Error(
    `Invalid services environment from ${source}: ` +
      `\`${servicesEnvironment}\`. Expected one of: ` +
      servicesEnvironmentValues.join(', '),
  );
}

const servicesEnvironmentConfigPath = '../facts/services-environment.json';

function isMissingServicesEnvironmentConfigError(error) {
  return (
    (error.code === 'MODULE_NOT_FOUND' &&
      error.message.includes('services-environment.json')) ||
    error.message.includes('Requiring unknown module')
  );
}

function getServicesEnvironmentConfig() {
  try {
    return require(servicesEnvironmentConfigPath);
  } catch (e) {
    if (isMissingServicesEnvironmentConfigError(e)) {
      return null;
    }
    throw new Error(
      `Could not parse ${servicesEnvironmentConfigPath}: ${e.message}`,
    );
  }
}

function resolveServicesEnvironment() {
  const parsedConfig = getServicesEnvironmentConfig();
  if (parsedConfig === null) {
    return servicesEnvironments.production;
  }
  if (
    parsedConfig?.environment === null ||
    parsedConfig?.environment === undefined
  ) {
    throw new Error(
      `Missing \`environment\` in ${servicesEnvironmentConfigPath}`,
    );
  }
  return parseServicesEnvironmentOrThrow(
    parsedConfig.environment,
    `${servicesEnvironmentConfigPath} (\`environment\`)`,
  );
}

module.exports = {
  servicesEnvironments,
  resolveServicesEnvironment,
};
