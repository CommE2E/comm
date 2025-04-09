package app.comm.android.fbjni;

import android.util.Log;

import app.comm.android.securestore.SecureStoreModule;
import expo.modules.core.Promise;
import java.util.function.Supplier;

public class CommSecureStore {
  private static final CommSecureStore instance = new CommSecureStore();
  private SecureStoreModule secureStoreModule = null;

  public static CommSecureStore getInstance() {
    return CommSecureStore.instance;
  }

  public void
  initialize(Supplier<SecureStoreModule> secureStoreModuleSupplier) {
    if (this.secureStoreModule == null) {
      synchronized (this) {
        if (this.secureStoreModule == null) {
          this.secureStoreModule = secureStoreModuleSupplier.get();
        }
      }
    }
  }

  private void checkModule() {
    if (this.secureStoreModule == null) {
      throw new RuntimeException(
          "secure store module has not been initialized");
    }
  }

  private void internalSet(String key, String value) {
    this.checkModule();
    Promise promise = new Promise() {
      @Override
      public void resolve(Object value) {
      }

      @Override
      public void reject(String code, String message, Throwable e) {
        throw new RuntimeException("secure store set error: " + message);
      }
    };
    Log.w("SECURE_STORE", "setting key="+key+ " value= "+value);
    this.secureStoreModule.setValueWithKeyAsync(key, value, promise);
  }

  private String internalGet(String key) {
    this.checkModule();
    final String[] result = {null};

    Promise promise = new Promise() {
      @Override
      public void resolve(Object value) {
        Log.w("SECURE_STORE", "resolve value="+value);
        result[0] = (String)value;
      }

      @Override
      public void reject(String code, String message, Throwable e) {
        throw new RuntimeException("secure store get error: " + message);
      }
    };
    Log.w("SECURE_STORE", "getting key="+key);
    // The following call will resolve the promise before it returns
    this.secureStoreModule.getValueWithKeyAsync(key, promise);
    Log.w("SECURE_STORE", "got key="+key+" result="+result[0]);
    return result[0];
  }

  public static void set(String key, String value) {
    getInstance().internalSet(key, value);
  }

  public static String get(String key) {
    return getInstance().internalGet(key);
  }
}
