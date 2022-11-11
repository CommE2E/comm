
#import "TerminateApp.h"

#import <React/RCTBridgeModule.h>

namespace comm {

void TerminateApp::terminate() {
  exit(0);
};

} // namespace comm
