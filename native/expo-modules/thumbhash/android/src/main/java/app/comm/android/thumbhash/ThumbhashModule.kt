package app.comm.android.thumbhash

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ThumbhashModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Thumbhash")

    AsyncFunction("generateThumbHash") {
      "unimplemented"
    }
  }
}
