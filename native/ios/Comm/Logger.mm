
#import <Foundation/Foundation.h>
#import <Tools/Logger.h>

namespace comm {

void Logger::log(const std::string str) {
  NSLog(
      @"COMM: %@",
      [NSString stringWithCString:str.c_str()
                         encoding:[NSString defaultCStringEncoding]]);
};

} // namespace comm
