const path = require('path');
const Module = require('module');

const backendNodeModules = path.resolve(__dirname, '../backend/node_modules');
process.env.NODE_PATH = process.env.NODE_PATH
  ? `${backendNodeModules}${path.delimiter}${process.env.NODE_PATH}`
  : backendNodeModules;
Module._initPaths();

