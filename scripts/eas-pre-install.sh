#!/bin/bash

if [[ "$EAS_BUILD_PLATFORM" == "android" ]]; then
  npm install -g pnpm@8.6.5
  pnpm --version
fi