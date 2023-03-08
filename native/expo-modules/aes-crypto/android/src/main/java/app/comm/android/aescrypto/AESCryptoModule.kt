package app.comm.android.aescrypto

import expo.modules.core.errors.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.typedarray.Uint8Array
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

private const val ALGORITHM_AES = "AES"
private const val CIPHER_TRANSFORMATION_NAME = "AES/GCM/NoPadding"
private const val KEY_SIZE = 32 // bytes
private const val IV_LENGTH = 12 // bytes
private const val TAG_LENGTH = 16 // bytes

class AESCryptoModule : Module() {
  private val secureRandom by lazy { SecureRandom() }

  override fun definition() = ModuleDefinition {
    Name("AESCrypto")

    Function("generateKey", this@AESCryptoModule::generateKey)
    Function("encrypt", this@AESCryptoModule::encrypt)
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

  /**
   * Encrypts given [plaintext] with provided key and saves encrypted results
   * into [destination]. After the encryption, the destination array will
   * contain the following, concatenated in order:
   * - IV
   * - Ciphertext with GCM tag
   *
   * @param rawKey AES-256 key bytes. Must be of length [KEY_SIZE]
   * @param plaintext
   * @param destination must be of length: [plaintext]+[IV_LENGTH]+[TAG_LENGTH]
   */
  private fun encrypt(
    rawKey: Uint8Array,
    plaintext: Uint8Array,
    destination: Uint8Array
  ) {
    if (destination.length < plaintext.length + IV_LENGTH + TAG_LENGTH) {
      throw InvalidDataLengthException()
    }

    val key = rawKey.toAESSecretKey()
    val plaintextBuffer = plaintext.toDirectBuffer()
    val plaintextBytes = ByteArray(plaintext.byteLength)
      .also(plaintextBuffer::get)
    val (iv, ciphertext) = encryptAES(plaintextBytes, key)

    destination.write(iv, position = 0, size = IV_LENGTH)
    destination.write(ciphertext, position = IV_LENGTH, size = ciphertext.size)
  }

  // endregion
}

// region RN-agnostic implementations

/**
 * Encrypts given [plaintext] with given [key] using AES-256 GCM algorithm
 *
 * @return A pair of:
 * - IV (initialization vector) - 12 bytes long
 * - [ByteArray] containing ciphertext with 16-byte GCM auth tag appended
 */
private fun encryptAES(
  plaintext: ByteArray,
  key: SecretKey
): Pair<ByteArray, ByteArray> {
  val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION_NAME).apply {
    init(Cipher.ENCRYPT_MODE, key)
  }
  val iv = cipher.iv.copyOf()
  val ciphertext = cipher.doFinal(plaintext)
  return Pair(iv, ciphertext)
}

// endregion

// region Utility extension functions

fun ByteArray.toSecretKey(algorithm: String = ALGORITHM_AES) =
  SecretKeySpec(this, 0, this.size, algorithm)

fun Uint8Array.toAESSecretKey(): SecretKey {
  if (this.byteLength != KEY_SIZE) {
    throw InvalidKeyLengthException()
  }

  return ByteArray(KEY_SIZE)
    .also { bytes -> this.read(bytes, 0, KEY_SIZE) }
    .toSecretKey()
}

// endregion

// region Exception definitions

private class InvalidKeyLengthException :
  CodedException("The AES key has invalid length")

private class InvalidDataLengthException :
  CodedException("Source or destination array has invalid length")

// endregion
