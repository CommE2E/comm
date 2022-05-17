
#import "Logger.h"
#import <Foundation/Foundation.h>

namespace comm {

void Logger::log(const std::string str) {
  NSLog(
      @"COMM: %@",
      [NSString stringWithCString:str.c_str()
                         encoding:[NSString defaultCStringEncoding]]);
};

} // namespace comm
