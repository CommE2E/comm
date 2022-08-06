{ stdenv
, lib
, cmake
, fetchFromGitHub
, openssl
, darwin
}:

stdenv.mkDerivation rec {
  pname = "amqp-cpp";
  version = "4.3.16";

  src = fetchFromGitHub {
    owner = "CopernicaMarketingSoftware";
    repo = "amqp-cpp";
    rev = "v${version}";
    sha256 = "sha256-aBLNdw9LhHFwnIt70vIYlX1/j2IUTmpm5Ub+ZImF8FI=";
  };

  nativeBuildInputs = [
    cmake
  ];

  buildInputs = [
    openssl
  ];

  cmakeFlags = [
    "-DAMQP-CPP_BUILD_SHARED=ON"
    # Darwin is untested, which is why upstream uses linux in flag name
    "-DAMQP-CPP_LINUX_TCP=ON"
  ];
}

