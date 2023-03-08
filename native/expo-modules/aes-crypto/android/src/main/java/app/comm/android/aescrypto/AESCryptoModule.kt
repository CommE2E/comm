package app.comm.android.aescrypto

import expo.modules.core.errors.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.typedarray.Uint8Array
import java.security.SecureRandom
import javax.crypto.KeyGenerator

private const val ALGORITHM_AES = "AES"
private const val KEY_SIZE = 32 // bytes

class AESCryptoModule : Module() {
  private val secureRandom by lazy { SecureRandom() }

  override fun definition() = ModuleDefinition {
    Name("AESCrypto")

    Function("generateKey", this@AESCryptoModule::generateKey)
  }

  // region Function implementations

  /**
   * Generates AES-256 key and stores it in [destination] array
   *
   * @param destination JS typed array, must be [KEY_SIZE] bytes long
   */
  private fun generateKey(destination: Uint8Array) {
    if (destination.byteLength != KEY_SIZE) {
      throw InvalidKeyLengthException()
    }

    val keygen = KeyGenerator.getInstance(ALGORITHM_AES).apply {
      init(KEY_SIZE * 8, secureRandom)
    }
    val keyBytes = keygen.generateKey().encoded
    destination.write(keyBytes, position = 0, size = keyBytes.size)
  }

  // endregion
}

// region Exception definitions

private class InvalidKeyLengthException :
  CodedException("The AES key has invalid length")

// endregion
