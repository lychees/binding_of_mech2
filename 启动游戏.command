#!/bin/bash
cd "$(dirname "$0")" || exit 1
(sleep 2; open "http://localhost:${PORT:-8080}") &
clear
ruby server.rb "$@"
