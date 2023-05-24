package app.comm.android.expo

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HelloWorldModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HelloWorld")

    Function("sayHello") {
      "hello"
    }
  }
}

