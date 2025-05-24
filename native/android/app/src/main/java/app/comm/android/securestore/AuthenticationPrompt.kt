/**
  File copied from expo-secure-store 14.x
  https://github.com/expo/expo/blob/49c9d53cf0a9fc8179d1c8f5268beadd141f70ca/packages/expo-secure-store/android/src/main/java/expo/modules/securestore/AuthenticationPrompt.kt

  Why we copy: https://linear.app/comm/issue/ENG-10284/migrate-expo-secure-store-related-code
*/
package app.comm.android.securestore

import android.content.Context
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricPrompt.PromptInfo
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import java.util.concurrent.Executor
import javax.crypto.Cipher
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

class AuthenticationPrompt(private val currentActivity: FragmentActivity, context: Context, title: String) {
  private var executor: Executor = ContextCompat.getMainExecutor(context)
  private var promptInfo = PromptInfo.Builder()
    .setTitle(title)
    .setNegativeButtonText(context.getString(android.R.string.cancel))
    .build()

  suspend fun authenticate(cipher: Cipher): BiometricPrompt.AuthenticationResult? =
    suspendCoroutine { continuation ->
      BiometricPrompt(
        currentActivity,
        executor,
        object : BiometricPrompt.AuthenticationCallback() {
          override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            super.onAuthenticationError(errorCode, errString)

            if (errorCode == BiometricPrompt.ERROR_USER_CANCELED || errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
              continuation.resumeWithException(AuthenticationException("User canceled the authentication"))
            } else {
              continuation.resumeWithException(AuthenticationException("Could not authenticate the user"))
            }
          }

          override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            super.onAuthenticationSucceeded(result)
            continuation.resume(result)
          }
        }
      ).authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))
    }
}