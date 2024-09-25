package app.comm.android.aescrypto

import expo.modules.core.errors.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.typedarray.Uint8Array
import java.security.SecureRandom
import java.nio.ByteBuffer
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import android.util.Log
import java.util.Base64

private const val ALGORITHM_AES = "AES"
private const val CIPHER_TRANSFORMATION_NAME = "AES/GCM/NoPadding"
private const val KEY_SIZE = 32 // bytes
private const val IV_LENGTH = 12 // bytes - unique Initialization Vector (nonce)
private const val TAG_LENGTH = 16 // bytes - GCM auth tag

// Expo module called from the RN app JS code
class AESCryptoModule : Module() {
  private val secureRandom by lazy { SecureRandom() }

  override fun definition() = ModuleDefinition {
    Name("AESCrypto")

    Function("generateKey", this@AESCryptoModule::generateKey)
    Function("generateIV", this@AESCryptoModule::generateIV)
    Function("encrypt", this@AESCryptoModule::encrypt)
    Function("decrypt", this@AESCryptoModule::decrypt)
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

  private fun generateIV(destination: Uint8Array) {
    if (destination.byteLength != IV_LENGTH) {
      throw InvalidInitializationVectorLengthException()
    }

    val randomBytes = ByteArray(IV_LENGTH)
    secureRandom.nextBytes(randomBytes)
    destination.write(randomBytes, position = 0, size = randomBytes.size)
  }

  /**
   * Encrypts given [plaintext] with provided key and saves encrypted results
   * (sealed data) into [destination]. After the encryption, the destination
   * array will contain the following, concatenated in order:
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
    destination: Uint8Array,
    initializationVector: Uint8Array,
  ) {
    val key = rawKey.toAESSecretKey()
    val plaintextBuffer = plaintext.toDirectBuffer()
    val destinationBuffer = destination.toDirectBuffer()
    
    val ivBuffer =  if (initializationVector.byteLength > 0) {
      initializationVector.toDirectBuffer()
    } else {
      null
    }

    encryptAES(plaintextBuffer, key, destinationBuffer, ivBuffer)
  }

  /**
   * Decrypts given [sealedData] using provided key and stores decrypted
   * plaintext in the [destination] array.
   *
   * @param rawKey AES-256 key bytes. Must be of length [KEY_SIZE]
   * @param sealedData Typed array consisting of 12-byte IV, followed by
   * actual ciphertext content and ending with 16-byte GCM tag.
   * @param destination should be of ciphertext content length
   */
  private fun decrypt(
    rawKey: Uint8Array,
    sealedData: Uint8Array,
    destination: Uint8Array
  ) {
    val key = rawKey.toAESSecretKey()
    val sealedDataBuffer = sealedData.toDirectBuffer()
    val destinationBuffer = destination.toDirectBuffer()

    decryptAES(sealedDataBuffer, key, destinationBuffer)
  }

  // endregion
}

// region RN-agnostic implementations

// Compatibility module to be called from native Java and Rust
class AESCryptoModuleCompat {
  public fun generateKey(): ByteArray {
   return KeyGenerator.getInstance(ALGORITHM_AES).apply {
      init(KEY_SIZE * 8, secureRandom)
    }.generateKey().encoded
  }

  public fun encrypt(
    rawKey: ByteArray,
    plaintext: ByteArray,
  ): ByteArray {
    val secretKey = rawKey.toSecretKey()
    val plaintextBuffer = ByteBuffer.wrap(plaintext)
    val cipherText = encryptAES(plaintextBuffer, secretKey)
    return ByteArray(cipherText.remaining()).also(cipherText::get)
  }

  public fun decrypt(
    rawKey: ByteArray,
    sealedData: ByteArray
  ): ByteArray {
    if(sealedData.size <= IV_LENGTH + TAG_LENGTH) {
      throw InvalidDataLengthException()
    }
    val secretKey = rawKey.toSecretKey()
    val sealedDataBuffer = ByteBuffer.wrap(sealedData)
    val plaintext = decryptAES(sealedDataBuffer, secretKey)
    return ByteArray(plaintext.remaining()).also(plaintext::get)
  }

  companion object {
    private val secureRandom by lazy { SecureRandom() }
    @JvmStatic
    fun generateKey(
      buffer: ByteBuffer,
    ) {
      val key = KeyGenerator.getInstance(ALGORITHM_AES).apply {
        init(KEY_SIZE * 8, secureRandom)
      }.generateKey().encoded
      
      buffer.put(key)
    }

    @JvmStatic
    fun encrypt(
      rawKey: ByteBuffer,
      plaintext: ByteBuffer,
      sealedData: ByteBuffer,
    ) {
      val secretKey = rawKey.toAESSecretKey()
      encryptAES(plaintext, secretKey, sealedData)
    }

    @JvmStatic
    fun decrypt(
      rawKey: ByteBuffer,
      sealedData: ByteBuffer,
      plaintext: ByteBuffer,
    ) {
      val secretKey = rawKey.toAESSecretKey()
      decryptAES(sealedData, secretKey, plaintext)
    }
  }
}

/**
 * Encrypts given [plaintext] with given [key] using AES-256 GCM algorithm.
 * You can optionally pass in a destination buffer of a correct length
 * that will be filled in with the result of the encryption.
 *
 * @return reference to the passed destination buffer or a new [ByteBuffer],
 * containing sealed data consisting of the following, concatenated in order:
 * - IV - 12 bytes long
 * - Ciphertext with 16-byte GCM tag
 */
private fun encryptAES(
  plaintext: ByteBuffer,
  key: SecretKey,
  destination: ByteBuffer? = null,
  initializationVector: ByteBuffer? = null
): ByteBuffer {
  if (destination != null &&
    destination.remaining() != plaintext.remaining() + IV_LENGTH + TAG_LENGTH) {
    throw InvalidDataLengthException()
  }

  if(initializationVector != null && initializationVector.remaining() != IV_LENGTH) {
    throw InvalidInitializationVectorLengthException()
  }

  val cipher = if (initializationVector != null) {
    val customIV = ByteArray(initializationVector.remaining()).also(initializationVector::get);
    val spec = GCMParameterSpec(TAG_LENGTH * 8, customIV);
  
    Cipher.getInstance(CIPHER_TRANSFORMATION_NAME).apply {
      init(Cipher.ENCRYPT_MODE, key, spec)
    }
  } else {
    Cipher.getInstance(CIPHER_TRANSFORMATION_NAME).apply {
      init(Cipher.ENCRYPT_MODE, key)
    }
  }

  val iv = cipher.iv;
  val sealedData = destination ?:
    ByteBuffer.allocate(iv.size + cipher.getOutputSize(plaintext.remaining()))
  sealedData.put(iv);
  cipher.doFinal(plaintext, sealedData)
  sealedData.position(0)
  return sealedData
}

/**
 * Does the reverse of the [encryptAES] function.
 * Decrypts the [ciphertext] with given [key] and [iv]
 * You can optionally pass in a destination buffer of a correct length
 * that will be filled in with the result of the decryption.
 * 
 * @return reference to the passed destination buffer or a new [ByteBuffer]
 */
private fun decryptAES(
  sealedData: ByteBuffer,
  key: SecretKey,
  destination: ByteBuffer? = null
): ByteBuffer {
  if (destination != null &&
    destination.remaining() != sealedData.remaining() - IV_LENGTH - TAG_LENGTH) {
      throw InvalidDataLengthException()
  }
  val iv = ByteArray(IV_LENGTH).also(sealedData::get)
  val spec = GCMParameterSpec(TAG_LENGTH * 8, iv)
  val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION_NAME).apply {
    init(Cipher.DECRYPT_MODE, key, spec)
  }
  val plaintext = destination ?: 
    ByteBuffer.allocate(cipher.getOutputSize(sealedData.remaining()))
  cipher.doFinal(sealedData, plaintext)
  plaintext.position(0)
  return plaintext
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

fun ByteBuffer.toAESSecretKey(): SecretKey{
  if(this.remaining() != KEY_SIZE) {
    throw InvalidKeyLengthException()
  }
  return ByteArray(this.remaining()).also(this::get).toSecretKey();
}

// endregion

// region Exception definitions

private class InvalidKeyLengthException :
  CodedException("The AES key has invalid length")

private class InvalidDataLengthException :
  CodedException("Source or destination array has invalid length")

private class InvalidInitializationVectorLengthException : 
  CodedException("Initialization vector has invalid length")

// endregion
