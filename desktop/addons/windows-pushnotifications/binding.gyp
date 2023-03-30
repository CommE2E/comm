{
    "variables": {
        "USE_ADDITIONAL_WINMD": "true"
    },
    "includes": ["common.gypi"],
    "targets": [{
        "target_name": "binding",
        "sources": [],
        "include_dirs": [
            "<!(node -e \"require('nan')\")"
        ],
        "libraries": [],
        "conditions": [
            ["OS=='win'", {
                "libraries": ["-lruntimeobject.lib"],
                "sources": [
                    "_nodert_generated.cpp",
                    "NodeRtUtils.cpp",
                    "OpaqueWrapper.cpp",
                    "CollectionsConverterUtils.cpp"
                ]
            }],
            ["USE_ADDITIONAL_WINMD==\"true\"", {
                "msvs_settings": {
                    "VCCLCompilerTool": {
                        "AdditionalUsingDirectories": [
                            "%ProgramFiles%/Windows Kits/10/UnionMetadata/windows-pushnotifications",
                            "%ProgramFiles%/Windows Kits/10/Include/windows-pushnotifications/um",
                            "%ProgramFiles(x86)%/Windows Kits/10/UnionMetadata/windows-pushnotifications",
                            "%ProgramFiles(x86)%/Windows Kits/10/Include/windows-pushnotifications/um"
                        ]
                    }
                }
            }]
        ],
        "msvs_settings": {
            "VCCLCompilerTool": {
                "AdditionalOptions": ["/ZW"],
                "DisableSpecificWarnings": [4609]
            }
        }
    }]
}