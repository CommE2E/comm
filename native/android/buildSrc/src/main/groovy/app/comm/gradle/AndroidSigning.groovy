package app.comm.gradle

import java.io.ByteArrayOutputStream
import org.gradle.api.Project

class AndroidSigning {
  static String getPassword(Project project, String keyLabel) {
    if (System.getenv('ANDROID_SIGNING_PASSWORD')) {
      return System.getenv('ANDROID_SIGNING_PASSWORD')
    }
    def stdout = new ByteArrayOutputStream()
    project.exec {
      commandLine 'security',
        'find-generic-password',
        '-wl', keyLabel,
        '-a', System.properties['user.name']
      standardOutput = stdout
      ignoreExitValue true
    }
    stdout.toString().strip()
  }
}
