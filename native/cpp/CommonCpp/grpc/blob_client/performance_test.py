import sys

import string
from random import choices
from subprocess import Popen

if __name__ == "__main__":
    _script, binary_path, count = sys.argv

    process_handlers = []
    for _ in range(int(count)):
        holder = "".join(choices(list(string.ascii_letters), k=10))
        process_handlers.append(Popen([binary_path, holder, holder]))

    for p in process_handlers:
        p.wait()
