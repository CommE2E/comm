package app.comm.android.fbjni;

import app.comm.android.MainApplication;
import app.comm.android.fbjni.CommSecureStore;
import app.comm.android.fbjni.PlatformSpecificTools;
import com.tencent.mmkv.MMKV;
import java.util.Base64;

public class CommMMKV {
  private static final int MMKV_ENCRYPTION_KEY_SIZE = 16;
  private static final int MMKV_ID_SIZE = 8;

  private static final String SECURE_STORE_MMKV_ENCRYPTION_KEY_ID =
      "comm.mmkvEncryptionKey";
  private static final String SECURE_STORE_MMKV_IDENTIFIER_KEY_ID =
      "comm.mmkvID";

  private static String mmkvEncryptionKey;
  private static String mmkvIdentifier;

  private static MMKV getMMKVInstance(String mmkvID, String encryptionKey) {
    MMKV mmkv =
        MMKV.mmkvWithID(mmkvID, MMKV.SINGLE_PROCESS_MODE, encryptionKey);
    if (mmkv == null) {
      throw new RuntimeException("Failed to instantiate MMKV object.");
    }
    return mmkv;
  }

  private static void assignInitializationData() {
    byte[] encryptionKeyBytes = PlatformSpecificTools.generateSecureRandomBytes(
        MMKV_ENCRYPTION_KEY_SIZE);
    byte[] identifierBytes =
        PlatformSpecificTools.generateSecureRandomBytes(MMKV_ID_SIZE);
    String encryptionKey = Base64.getEncoder()
                               .encodeToString(encryptionKeyBytes)
                               .substring(0, MMKV_ENCRYPTION_KEY_SIZE);
    String identifier = Base64.getEncoder()
                            .encodeToString(identifierBytes)
                            .substring(0, MMKV_ID_SIZE);
    CommSecureStore.set(SECURE_STORE_MMKV_ENCRYPTION_KEY_ID, encryptionKey);
    CommSecureStore.set(SECURE_STORE_MMKV_IDENTIFIER_KEY_ID, identifier);
    mmkvEncryptionKey = encryptionKey;
    mmkvIdentifier = identifier;
  }

  public static void initialize() {
    if (mmkvEncryptionKey != null && mmkvIdentifier != null) {
      return;
    }

    synchronized (CommMMKV.class) {
      if (mmkvEncryptionKey != null && mmkvIdentifier != null) {
        return;
      }

      String encryptionKey =
          CommSecureStore.get(SECURE_STORE_MMKV_ENCRYPTION_KEY_ID);
      String identifier =
          CommSecureStore.get(SECURE_STORE_MMKV_IDENTIFIER_KEY_ID);

      if (encryptionKey == null || identifier == null) {
        assignInitializationData();
      } else {
        mmkvEncryptionKey = encryptionKey;
        mmkvIdentifier = identifier;
      }

      MMKV.initialize(MainApplication.getMainApplicationContext());
      getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
    }
  }

  public static void clearSensitiveData() {
    initialize();
    synchronized (mmkvEncryptionKey) {
      getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey).clearAll();
      boolean storageRemoved = MMKV.removeStorage(mmkvIdentifier);
      if (!storageRemoved) {
        throw new RuntimeException("Failed to remove MMKV storage.");
      }
      assignInitializationData();
      MMKV.initialize(MainApplication.getMainApplicationContext());
      getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
    }
  }

  public static boolean setString(String key, String value) {
    initialize();
    return getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey)
        .encode(key, value);
  }

  public static String getString(String key) {
    initialize();
    return getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey).decodeString(key);
  }
}
