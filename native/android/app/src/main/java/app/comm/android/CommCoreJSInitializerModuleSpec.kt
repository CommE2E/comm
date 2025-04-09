package app.comm.android

import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import javax.annotation.Nonnull

abstract class CommCoreJSInitializerModuleSpec(reactContext: ReactApplicationContext?) :
    ReactContextBaseJavaModule(reactContext), TurboModule {
    @Nonnull
    override fun getName(): String {
        return NAME
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    @DoNotStrip
    abstract fun installTurboModule(): Boolean

    companion object {
        const val NAME: String = "CommCoreJSInitializerModule"
    }
}