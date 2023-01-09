#!/bin/bash
mongod --dbpath "$(git rev-parse --show-toplevel)/.db/data" --replSet rs0 --bind_ip localhost
