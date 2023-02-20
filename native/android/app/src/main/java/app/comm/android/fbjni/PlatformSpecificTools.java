package app.comm.android.fbjni;

import android.content.Context;
import android.util.Log;
import app.comm.android.MainApplication;
import java.nio.charset.StandardCharsets;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
public class PlatformSpecificTools {
  static SecureRandom secureRandom = new SecureRandom();

  public static byte[] generateSecureRandomBytes(int size) {
    byte[] buffer = new byte[size];
    secureRandom.nextBytes(buffer);
    return buffer;
  }

  public static String getNotificationsCryptoAccountPath() {
    Context mainApplicationContext =
        MainApplication.getMainApplicationContext();
    if (mainApplicationContext == null) {
      throw new RuntimeException(
          "Failed to resolve notifications crypto account path - main application context not initialized.");
    }
    return mainApplicationContext
        .getFileStreamPath("comm_notifications_crypto_account")
        .getPath();
  }
}
