package app.comm.gradle

import org.gradle.api.Project

class BuildInvocation {
  static boolean isCleanRunning(Project project) {
    project.gradle.startParameter.taskRequests.any { taskRequest ->
      !taskRequest.args.isEmpty() && taskRequest.args.first().startsWith('clean')
    }
  }

  static boolean isBundleReleaseRunning(Project project) {
    project.gradle.startParameter.taskRequests.any { taskRequest ->
      !taskRequest.args.isEmpty() &&
        taskRequest.args.first().contains('bundleRelease')
    }
  }
}
