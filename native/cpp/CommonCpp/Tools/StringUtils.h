#pragma once

#include <string>

namespace comm {

class StringUtils {
public:
    static std::string trimWhitespace(const std::string& str);
};

} // namespace comm