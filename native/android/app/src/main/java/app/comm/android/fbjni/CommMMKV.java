package app.comm.android.fbjni;

import android.util.Log;
import app.comm.android.MainApplication;
import app.comm.android.fbjni.CommSecureStore;
import app.comm.android.fbjni.PlatformSpecificTools;
import com.tencent.mmkv.MMKV;
import java.util.Base64;
import java.util.Set;

public class CommMMKV {
  private static final int MMKV_ENCRYPTION_KEY_SIZE = 16;
  private static final int MMKV_ID_SIZE = 8;

  private static final String SECURE_STORE_MMKV_ENCRYPTION_KEY_ID =
      "comm.mmkvEncryptionKey";
  private static final String SECURE_STORE_MMKV_IDENTIFIER_KEY_ID =
      "comm.mmkvID";

  private static String mmkvEncryptionKey;
  private static String mmkvIdentifier;

  public static native String notifsStorageUnreadThickThreadsKey();

  private static MMKV getMMKVInstance(String mmkvID, String encryptionKey) {
    MMKV mmkv = MMKV.mmkvWithID(mmkvID, MMKV.MULTI_PROCESS_MODE, encryptionKey);
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

      String encryptionKey = null, identifier = null;
      try {
        encryptionKey =
            CommSecureStore.get(SECURE_STORE_MMKV_ENCRYPTION_KEY_ID);
        identifier = CommSecureStore.get(SECURE_STORE_MMKV_IDENTIFIER_KEY_ID);
      } catch (Exception e) {
        Log.w("COMM", "Failed to get MMKV keys from CommSecureStore", e);
      }

      if (encryptionKey == null || identifier == null) {
        assignInitializationData();
      } else {
        mmkvEncryptionKey = encryptionKey;
        mmkvIdentifier = identifier;
      }

      MMKV.initialize(MainApplication.Companion.getMainApplicationContext());
      getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
    }
  }

  public static void lock() {
    initialize();
    getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey).lock();
  }

  public static void unlock() {
    getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey).unlock();
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
      MMKV.initialize(MainApplication.Companion.getMainApplicationContext());
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

  public static boolean setInt(String key, int value) {
    initialize();
    return getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey)
        .encode(key, value);
  }

  public static Integer getInt(String key, int noValue) {
    initialize();
    int value = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey)
                    .decodeInt(key, noValue);
    if (value == noValue) {
      return null;
    }
    return value;
  }

  public static String[] getAllKeys() {
    initialize();
    return getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey).allKeys();
  }

  public static void removeKeys(String[] keys) {
    initialize();
    getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey)
        .removeValuesForKeys(keys);
  }

  public static void addElementToStringSet(String setKey, String element) {
    initialize();
    MMKV mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
    mmkv.lock();
    try {
      Set<String> stringSet = mmkv.decodeStringSet(setKey);
      if (stringSet != null) {
        stringSet.add(element);
      } else {
        stringSet = Set.of(element);
      }
      mmkv.encode(setKey, stringSet);
    } finally {
      mmkv.unlock();
    }
  }

  public static void removeElementFromStringSet(String setKey, String element) {
    initialize();
    MMKV mmkv = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey);
    mmkv.lock();
    try {
      Set<String> stringSet = mmkv.decodeStringSet(setKey);
      if (stringSet == null) {
        return;
      }
      stringSet.remove(element);
      mmkv.encode(setKey, stringSet);
    } finally {
      mmkv.unlock();
    }
  }

  public static String[] getStringSet(String setKey) {
    initialize();
    Set<String> stringSet = getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey)
                                .decodeStringSet(setKey);
    if (stringSet == null) {
      return new String[0];
    }

    return stringSet.toArray(new String[stringSet.size()]);
  }

  public static boolean setStringSet(String key, String[] elements) {
    initialize();
    Set<String> stringSet = Set.of(elements);
    return getMMKVInstance(mmkvIdentifier, mmkvEncryptionKey)
        .encode(key, stringSet);
  }
}
