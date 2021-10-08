package app.comm.android.fbjni;

import expo.modules.securestore.SecureStoreModule;
import org.unimodules.core.Promise;
import org.unimodules.core.arguments.MapArguments;
import org.unimodules.core.arguments.ReadableArguments;

public class CommSecureStore {

  private static final CommSecureStore instance = new CommSecureStore();
  private SecureStoreModule secureStoreModule = null;
  private final ReadableArguments readableArguments;

  private CommSecureStore() {
    this.readableArguments = new MapArguments();
  }

  public static CommSecureStore getInstance() {
    return CommSecureStore.instance;
  }

  public void initialize(SecureStoreModule secureStoreModule) {
    this.secureStoreModule = secureStoreModule;
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
    this.secureStoreModule.setValueWithKeyAsync(
        value, key, this.readableArguments, promise);
  }

  private String internalGet(String key) {
    this.checkModule();
    final String[] result = {null};

    Promise promise = new Promise() {
      @Override
      public void resolve(Object value) {
        result[0] = (String)value;
      }

      @Override
      public void reject(String code, String message, Throwable e) {
        throw new RuntimeException("secure store get error: " + message);
      }
    };
    // The following call will resolve the promise before it returns
    this.secureStoreModule.getValueWithKeyAsync(
        key, this.readableArguments, promise);

    return result[0];
  }

  public static void set(String key, String value) {
    getInstance().internalSet(key, value);
  }

  public static String get(String key) {
    return getInstance().internalGet(key);
  }
}
