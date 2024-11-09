import { pluginTester } from "babel-plugin-tester";
import {default as plugin} from "../index.js";
const path = require('node:path');
pluginTester({
  plugin,
  fixtures: path.join(__dirname, "fixtures")
});

