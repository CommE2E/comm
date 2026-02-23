package app.comm.gradle

import groovy.json.JsonSlurper
import org.gradle.api.GradleException
import org.gradle.api.Project

class ServicesEnvironment {

  static final Map<String, String> servicesEnvironments = [
    production: 'production',
    staging: 'staging',
  ].asImmutable()

  static final List<String> servicesEnvironmentValues =
    servicesEnvironments.values().toList().asImmutable()

  static String resolve(Project project) {
    def servicesEnvironmentConfigPath =
      project.file('../../../lib/facts/services-environment.json')
    if (!servicesEnvironmentConfigPath.exists()) {
      return servicesEnvironments.production
    }

    def parsedConfig
    try {
      parsedConfig = new JsonSlurper().parse(servicesEnvironmentConfigPath)
    } catch (Exception e) {
      throw new GradleException(
        "Could not parse ${servicesEnvironmentConfigPath}",
        e
      )
    }

    if (parsedConfig?.environment == null) {
      throw new GradleException(
        "Missing `environment` in ${servicesEnvironmentConfigPath}"
      )
    }

    def servicesEnvironment = parsedConfig.environment.toString()
    if (servicesEnvironmentValues.contains(servicesEnvironment)) {
      return servicesEnvironment
    }

    throw new GradleException(
      "Invalid services environment from " +
        "${servicesEnvironmentConfigPath} (`environment`): " +
        "`${parsedConfig.environment}`. " +
        "Expected one of: ${servicesEnvironmentValues.join(', ')}"
    )
  }
}
