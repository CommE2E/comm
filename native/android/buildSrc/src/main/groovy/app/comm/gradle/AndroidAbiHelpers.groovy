package app.comm.gradle

import java.io.ByteArrayOutputStream
import org.gradle.api.Project

class AndroidAbiHelpers {
  private static List<String> reactNativeArchitectures(Project project) {
    def value = project.getProperties().get('reactNativeArchitectures')
    value ? (value.split(',') as List<String>) : ['armeabi-v7a', 'x86_64', 'arm64-v8a']
  }

  static List<String> getBuildTypeABIs(Project project) {
    if (System.getenv('COMM_ANDROID_SINGLE_ABI_BUILD') == 'true') {
      final singleAbi = ['arm64-v8a']
      project.logger.info("Using single architecture to build: ${singleAbi}")
      return singleAbi
    }

    if (BuildInvocation.isBundleReleaseRunning(project)) {
      // All of the supported ABIs
      // https://developer.android.com/ndk/guides/abis.html#sa
      final allAbis = ['armeabi-v7a', 'arm64-v8a', 'x86_64']
      project.logger.info("Using all architectures to build: ${allAbis}")
      return allAbis
    }

    def nativeArchitectures = reactNativeArchitectures(project)
    if (nativeArchitectures) {
      return nativeArchitectures as List<String>
    }

    // Get current 'adb devices' architectures
    def commandOutput = new ByteArrayOutputStream()
    project.exec {
      commandLine './bash/detect_abis.sh'
      standardOutput = commandOutput
    }
    final detectedAbis = commandOutput.toString('UTF-8').trim().tokenize()
    project.logger.info("Detected architectures to build: ${detectedAbis}")
    detectedAbis
  }
}
