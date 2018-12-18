#!/usr/bin/env node

import * as program from "commander";
import * as pack from "../package.json";
const { version } = pack;

program.version(version).parse(process.argv);
