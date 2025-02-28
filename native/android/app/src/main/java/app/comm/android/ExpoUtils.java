package app.comm.android;

import android.content.Context;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactContext;
import expo.modules.adapters.react.services.UIManagerModuleWrapper;
import expo.modules.core.ModuleRegistry;
import expo.modules.core.interfaces.InternalModule;
import expo.modules.securestore.SecureStoreModule;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Supplier;

public class ExpoUtils {
  public static Supplier<SecureStoreModule>
  createExpoSecureStoreSupplier(@NonNull Context context) {
    return SecureStoreModule::new;
  }
}
