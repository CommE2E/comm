package app.comm.android.aescrypto

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AESCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AESCrypto")

    Function("hello") {
      return@Function "Hello world! 👋"
    }
  }
}
