require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'CommExpoPackage'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'Comm'
  s.homepage       = 'https://comm.app'
  s.platform       = :ios, '13.0'
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/CommE2E/comm' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'USE_HEADERMAP' => 'YES',
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  
  user_header_search_paths = [
    '"${PODS_CONFIGURATION_BUILD_DIR}/CommExpoPackage/Swift Compatibility Header"',
  ]
  s.user_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => user_header_search_paths,
  }

  s.source_files = "**/*.{h,m,swift}"
  s.public_header_files = '**/*.h'
end
