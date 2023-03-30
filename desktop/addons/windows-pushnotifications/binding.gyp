{
    "includes": ["common.gypi"],
    "targets": [{
        "target_name": "binding",
        "include_dirs": [
            "<!(node -e \"require('nan')\")"
        ],
        "copies": [
            {
                "destination": "./build/Release",
                "files": ["Microsoft.WindowsAppSDK.1.2.221109.1/runtimes/win10-x64/native/Microsoft.WindowsAppRuntime.Bootstrap.dll"],
            }
        ],
        "libraries": [
            "-lruntimeobject.lib",
            "../Microsoft.WindowsAppSDK.1.2.221109.1/lib/win10-x64/Microsoft.WindowsAppRuntime.Bootstrap.lib"
        ],
        "sources": [
            "_nodert_generated.cpp",
            "NodeRtUtils.cpp",
            "OpaqueWrapper.cpp",
            "CollectionsConverterUtils.cpp"
        ],
        "msvs_settings": {
            "VCCLCompilerTool": {
                "AdditionalOptions": ["/ZW"],
                "DisableSpecificWarnings": [4609],
                "AdditionalUsingDirectories": [
                    "$(VCIDEInstallDir)/vcpackages/x86",
                    "$(ProgramFiles)/Windows Kits/10/UnionMetadata/10.0.22000.0",
                    "<(module_root_dir)/Microsoft.WindowsAppSDK.1.2.221109.1/lib/uap10.0/"
                ],
            },
        }
    }]
}