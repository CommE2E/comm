/**
 * This task parses the .gitmodule file
 * and clones each of the submodules
 */
package app.comm.gradle.tasks

import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction

/**
 * GitModules - custom task class
 * @param gitmodulesFile - The .gitmodules file location
 * @param outputDir - Directory where to clone modules
 * @param [skipModules =[]] - Submodules paths to skip while cloning
 * @param [moduleBranch =[:]] - Overwrite module branch
 * @param [runAfter =[]] - Run shell commands after cloning
 */
class GitModules extends DefaultTask {

    @InputFile
    def File gitmodulesFile

    @OutputDirectory
    def File outputDir

    @Input
    def skipModules = []

    @Input
    def Map moduleBranch = [:]

    @Input
    def runAfter = []

    // Parsing .gitmodules file to the
    // submodules map object
    def loadFromGitModules() {
        def modulesList = [:]
        def String currPath = ''
        // Iterate through the lines and populate the
        // modules map [path: [url:'', branch:''] ]
        gitmodulesFile.eachLine { String line ->
            if (line.contains('path =')) {
                currPath = line.split('=')[1].replaceAll("\\s", '')
                modulesList.put("${currPath}", [:])
                println("Submodule ${currPath} found")
            } else if (line.contains('url =')) {
                modulesList?.get("${currPath}").put(
                    'url', "${line.split('=')[1].replaceAll("\\s", '')}"
                )
            } else if (line.contains('branch =')) {
                modulesList?.get("${currPath}").put(
                    'branch', "${line.split('=')[1].replaceAll("\\s", '')}"
                )
            } else if (line.charAt(0) == '[') {
                currPath = ''
            }
        }
        return modulesList
    }

    // Cloning the submodules from the input map
    // using the git commands
    def cloneSubmodules(Map modulesList) {
        // Remove skipped modules
        skipModules.each {
            modulesList.remove("${it}")
            println("Skipping ${it} module")
        }
        // If we have provided a branch for a certain module
        // we must overwrite it
        moduleBranch.each { module, branch ->
            modulesList.get("${module}").put(
                'branch', "${branch}"
            )
            println("Overwrite the branch for ${module} to ${branch}")
        }

        def gitCloneTasks = []
        // Iterating the modules map
        modulesList.each { path, props ->
            // Paths and flags
            final moduleURL = props.get('url')
            File cloneDir = new File("${outputDir.getPath()}/${path}")
            def branchFlag = ''
            // If we have a branch in the gitmodules and not ignoring
            // all the branches
            if (props.get('branch') != null) {
                branchFlag = "-b ${props.get('branch')}"
                print("Cloning ${path} submodule, ")
                println("branch is ${props.get('branch')}...")
            } else {
                println("Cloning ${path} submodule...")
            }
            // Clear the cloning directory
            cloneDir.deleteDir()
            cloneDir.mkdirs()

            def gitCloneTask = new Thread({

                def command = "git clone ${branchFlag} " +
                        "--recurse-submodules ${moduleURL} ${cloneDir.getPath()}"
                def proc = command.execute()
                proc.waitFor()
                // Throw an error if 'git clone' was unsuccessfull
                if (proc.exitValue() != 0) {
                    throw new GradleException(
                            "Error while pulling ${path} submodule: ${proc.err.text}"
                    )
                }
                // Remove the .git folder from submodule directory
                def gitDir = new File("${cloneDir.getPath()}/.git")
                gitDir.deleteDir()

            })
            gitCloneTasks << gitCloneTask

        }

        gitCloneTasks.each { task.start() }
        gitCloneTasks.each { task.join() }
    }

    // Run commands after the cloning process if needed
    def runCommandsAfter() {
        runAfter.each { command ->
            def proc = command.execute()
            proc.waitFor()
            // Throw an error if the command run was unsuccessfull
            if (proc.exitValue() != 0) {
                throw new GradleException(
                    "Error while run command: ${command}"
                )
            }
        }
    }

    @TaskAction
    def updateSubmodules() {
        final Map modulesMap = loadFromGitModules()
        cloneSubmodules(modulesMap)
        runCommandsAfter()
    }

}
