#include "StringUtils.h"
#include <algorithm>
#include <cctype>

namespace comm {

std::string StringUtils::trimWhitespace(const std::string& str) {
    if (str.empty()) {
        return str;
    }

    // Find the first non-whitespace character
    size_t start = 0;
    while (start < str.length() && std::isspace(str[start])) {
        start++;
    }

    // If the string is all whitespace
    if (start == str.length()) {
        return "";
    }

    // Find the last non-whitespace character
    size_t end = str.length() - 1;
    while (end > start && std::isspace(str[end])) {
        end--;
    }

    // Return the trimmed substring
    return str.substr(start, end - start + 1);
}

} // namespace comm