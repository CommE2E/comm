/**
  File copied from expo-secure-store 14.x
  https://github.com/expo/expo/blob/49c9d53cf0a9fc8179d1c8f5268beadd141f70ca/packages/expo-secure-store/android/src/main/java/expo/modules/securestore/encryptors/KeyBasedEncryptor.kt

  Why we copy: https://linear.app/comm/issue/ENG-10284/migrate-expo-secure-store-related-code
*/
package app.comm.android.securestore

import org.json.JSONException
import org.json.JSONObject
import java.security.GeneralSecurityException
import java.security.KeyStore

enum class KeyPurpose {
  ENCRYPT,
  DECRYPT
}
interface KeyBasedEncryptor<E : KeyStore.Entry> {
  fun getExtendedKeyStoreAlias(options: SecureStoreOptions, requireAuthentication: Boolean): String

  fun getKeyStoreAlias(options: SecureStoreOptions): String

  @Throws(GeneralSecurityException::class)
  fun initializeKeyStoreEntry(keyStore: KeyStore, options: SecureStoreOptions): E

  @Throws(GeneralSecurityException::class, JSONException::class)
  suspend fun createEncryptedItem(
    plaintextValue: String,
    keyStoreEntry: E,
    requireAuthentication: Boolean,
    authenticationPrompt: String,
    authenticationHelper: AuthenticationHelper
  ): JSONObject

  @Throws(GeneralSecurityException::class, JSONException::class)
  suspend fun decryptItem(
    key: String,
    encryptedItem: JSONObject,
    keyStoreEntry: E,
    options: SecureStoreOptions,
    authenticationHelper: AuthenticationHelper
  ): String
}