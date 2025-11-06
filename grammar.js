/**
 * @file Sentaurus TCAD sdevice command file.
 * @author drudream <dru-dream@outlook.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "sdevice",

  rules: {
    // TODO: add the actual grammar rules
    source_file: ($) => choice(seq('"', $.main, '"'), $.main),

    main: ($) => repeat1("hello"),
  },
});
