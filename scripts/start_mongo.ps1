#!/bin/bash
mongod --dbpath "$(git rev-parse --show-toplevel)/.db/data" --bind_ip localhost
