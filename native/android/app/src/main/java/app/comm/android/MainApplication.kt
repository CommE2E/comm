package app.comm.android

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.database.CursorWindow
import android.os.Build
import app.comm.android.comminitializermodule.CommInitializerPackage
import app.comm.android.commservices.CommServicesPackage
import app.comm.android.notifications.CommAndroidNotificationsPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.wix.reactnativekeyboardinput.KeyboardInputPackage
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper
import org.conscrypt.OpenSSLProvider
import java.lang.reflect.Field
import java.security.Security


class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
    this,
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> {
        val packages = PackageList(this).packages
        packages.add(KeyboardInputPackage(this.application))
        packages.add(CommAndroidNotificationsPackage())
        packages.add(CommServicesPackage())
        packages.add(CommInitializerPackage())
        return packages
      }

      override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }
  )

  companion object {
    init {
      System.loadLibrary("fbjni");
      System.loadLibrary("comm_jni_module");
    }
    var context: Context? = null

    fun getMainApplicationContext(): Context? {
      return context
    }
  }

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun registerReceiver(
    receiver: BroadcastReceiver?,
    filter: IntentFilter?
  ): Intent? {
    return if (Build.VERSION.SDK_INT >= 34 &&
      applicationInfo.targetSdkVersion >= 34
    ) {
      super.registerReceiver(
        receiver, filter, RECEIVER_EXPORTED
      )
    } else {
      super.registerReceiver(receiver, filter)
    }
  }

  override fun onCreate() {
    super.onCreate()
    Security.insertProviderAt(OpenSSLProvider(), 1)
    
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    try {
      val field: Field = CursorWindow::class.java.getDeclaredField("sCursorWindowSize")
      field.setAccessible(true)
      field.set(null, 100 * 1024 * 1024) // 100 MiB
    } catch (e: Exception) {
      if (BuildConfig.DEBUG) {
        e.printStackTrace()
      }
    }
    context = applicationContext
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}