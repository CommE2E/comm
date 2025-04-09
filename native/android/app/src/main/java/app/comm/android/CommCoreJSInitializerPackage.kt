package app.comm.android

import com.facebook.react.BaseReactPackage
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.module.annotations.ReactModuleList
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.Objects

@ReactModuleList(
    nativeModules = [CommCoreJSInitializerModule::class
    ]
)
class CommCoreJSInitializerPackage : BaseReactPackage(), ReactPackage {
    override fun getModule(
        name: String, reactContext: ReactApplicationContext
    ): NativeModule? {
        return when (name) {
            CommCoreJSInitializerModuleSpec.NAME -> CommCoreJSInitializerModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        val moduleList: Array<Class<*>> = arrayOf(CommCoreJSInitializerModule::class.java)

        val reactModuleInfoMap: MutableMap<String, ReactModuleInfo> = HashMap()
        for (moduleClass in moduleList) {
            val reactModule =
                Objects.requireNonNull(
                    moduleClass.getAnnotation(
                        ReactModule::class.java
                    )
                )

            reactModuleInfoMap[reactModule.name] = ReactModuleInfo(
                reactModule.name,
                moduleClass.name,
                reactModule.canOverrideExistingModule,
                reactModule.needsEagerInit,
                reactModule.isCxxModule,
                true
            )
        }

        return ReactModuleInfoProvider { reactModuleInfoMap }
    }
}