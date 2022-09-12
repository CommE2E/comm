#include "args.h"

#include <boost/program_options.hpp>
#include <iostream>

namespace po = boost::program_options;

namespace comm {
namespace tunnelbroker {

void parseArgs(int argc, char *argv[]) {
  std::cout << "parsing args" << std::endl;
  try {
    po::options_description desc("Tunnelbroker options");
    desc.add_options()("help,h", "Produce help message");

    po::variables_map vm;
    po::store(po::parse_command_line(argc, argv, desc), vm);
    po::notify(vm);

    if (vm.count("help")) {
      std::cout << desc << "\n";
      std::exit(1);
    }
  } catch (std::exception &e) {
    std::cerr << "error: " << e.what() << "\n";
    std::exit(1);
  }
}

} // namespace tunnelbroker
} // namespace comm
