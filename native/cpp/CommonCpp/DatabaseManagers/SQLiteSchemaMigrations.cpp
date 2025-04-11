#include "SQLiteSchema.h"

#include "../NativeModules/PersistentStorageUtilities/MessageOperationsUtilities/MessageTypeEnum.h"
#include "Logger.h"

#include <sqlite3.h>

#include <fstream>
#include <sstream>
#include <string>

namespace comm {

SQLiteMigrations SQLiteSchema::migrations{{}};

} // namespace comm
