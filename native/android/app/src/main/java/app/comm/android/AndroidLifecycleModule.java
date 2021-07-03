package app.comm.android;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.UiThreadUtil;

import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleEventObserver;
import androidx.lifecycle.ProcessLifecycleOwner;

import java.util.HashMap;
import java.util.Map;

@ReactModule(name = AndroidLifecycleModule.NAME)
public class AndroidLifecycleModule extends ReactContextBaseJavaModule {

  public static final String NAME = "AndroidLifecycle";

  public static final String ANDROID_LIFECYCLE_ACTIVE = "active";
  public static final String ANDROID_LIFECYCLE_BACKGROUND = "background";

  private static final String INITIAL_STATUS_KEY = "initialStatus";
  private static final String STATUS_KEY = "status";

  private boolean isInitialized = false;

  private String currentState;

  public AndroidLifecycleModule(ReactApplicationContext reactContext) {
    super(reactContext);

    final Lifecycle lifecycle = ProcessLifecycleOwner.get().getLifecycle();
    this.currentState = lifecycle.getCurrentState() == Lifecycle.State.RESUMED
      ? ANDROID_LIFECYCLE_ACTIVE
      : ANDROID_LIFECYCLE_BACKGROUND;

    UiThreadUtil.runOnUiThread(() -> {
      lifecycle.addObserver(
        (LifecycleEventObserver) (source, event) -> {
          final String name = event.toString();
          if (name != "ON_START" && name != "ON_STOP") {
            return;
          }
          if (!this.isInitialized) {
            return;
          }
          this.currentState = name == "ON_START"
            ? ANDROID_LIFECYCLE_ACTIVE
            : ANDROID_LIFECYCLE_BACKGROUND;
          reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("LIFECYCLE_CHANGE", this.createEventMap());
        }
      );
    });
  }

  @Override
  public String getName() {
    return NAME;
  }

  @Override
  public void initialize() {
    super.initialize();
    this.isInitialized = true;
  }

  @Override
  public Map<String, Object> getConstants() {
    final Map<String, Object> constants = new HashMap<>();
    constants.put(INITIAL_STATUS_KEY, this.currentState);
    return constants;
  }

  private WritableMap createEventMap() {
    WritableMap appState = Arguments.createMap();
    appState.putString(STATUS_KEY, this.currentState);
    return appState;
  }

  @ReactMethod
  public void getCurrentLifecycleStatus(Callback success, Callback error) {
    success.invoke(createEventMap());
  }

}
