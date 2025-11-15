/**
 * @file Sentaurus TCAD sdevice command file.
 * @author drudream <dru-dream@outlook.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  unary: 150, // - + ~ !
  exp: 140, // **
  muldiv: 130, // * / %
  addsub: 120, // + -
  shift: 110, // << >>
  compare: 100, // > < >= <=
  equal_bool: 90, // == !=
  equal_string: 80, // eq ne
  contain: 70, // in ni
  and_bit: 60, // &
  xor_bit: 50, // ^
  or_bit: 40, // |
  and_logical: 30, // &&
  or_logical: 20, // ||
  ternary: 10, // x ? y : z
};

module.exports = grammar({
  name: "sdevice",
  externals: ($) => [
    $._sharp_define,
    $._sharp_undef,
    $._sharp_setdep,
    $._sharp_if,
    $._sharp_elif,
    $._sharp_else,
    $._sharp_endif,
    $.comment, // 外部扫描器处理的注释
  ],
  extras: ($) => [$._whitespace, $.comment], // 仅保留空白作为 extras

  rules: {
    // TODO: add the actual grammar rules
    source_file: ($) => repeat($._statement),

    _statement: ($) =>
      choice(
        $.sharp_command_statement,
        $.sharp_if_top_statement,
        $.section_statement,
      ),

    // sharp_command_statement
    sharp_command_statement: ($) =>
      choice($.define_micro, $.undefine_macro, $.set_dep),
    define_micro: ($) =>
      seq(
        $._sharp_define, // 使用外部扫描器生成的 token
        field("name", $.identifier),
        field(
          "value",
          choice(
            $.at_reference,
            $.number,
            $.boolean,
            $.identifier,
            $.string,
            $.at_angle_expression,
          ),
        ),
      ),
    undefine_macro: ($) => seq($._sharp_undef, field("name", $.identifier)), // 使用外部扫描器生成的 token
    set_dep: ($) => seq($._sharp_setdep, $.at_reference), // 使用外部扫描器生成的 token

    // sharp_if_top_statement
    sharp_if_top_statement: ($) =>
      prec.right(
        seq(
          $._sharp_if,
          field("condition", $.expr),
          field("consequence", repeat($._statement)),
          repeat(field("alternative", $.sharp_elif_top_clause)),
          optional(field("alternative", $.sharp_else_top_clause)),
          $._sharp_endif,
        ),
      ),
    sharp_elif_top_clause: ($) =>
      seq(
        $._sharp_elif,
        field("condition", $.expr),
        field("consequence", repeat($._statement)),
      ),
    sharp_else_top_clause: ($) =>
      seq($._sharp_else, field("consequence", repeat($._statement))),

    section_statement: ($) =>
      seq(
        $.identifier,
        optional(seq("(", field("range", $.key_value), ")")),
        "{",
        repeat($._section_member),
        "}",
      ),
    _section_member: ($) =>
      choice($.identifier, $.key_value, $.sharp_if_section_statement),
    // sharp_if_section_statement
    sharp_if_section_statement: ($) =>
      prec.right(
        seq(
          $._sharp_if,
          field("condition", $.expr),
          field("consequence", repeat($._section_member)),
          repeat(field("alternative", $.sharp_elif_section_clause)),
          optional(field("alternative", $.sharp_else_section_clause)),
          $._sharp_endif,
        ),
      ),
    sharp_elif_section_clause: ($) =>
      seq(
        $._sharp_elif,
        field("condition", $.expr),
        field("consequence", repeat($._section_member)),
      ),
    sharp_else_section_clause: ($) =>
      seq($._sharp_else, field("consequence", repeat($._section_member))),
    key_value: ($) =>
      seq(
        field("key", $.identifier),
        "=",
        field("value", choice($.identifier, $.number, $.string)),
      ),

    parentheses: ($) => seq("(", repeat($._section_member), ")"),

    at_angle_expression: ($) =>
      seq(token.immediate("@<"), $._expr, token.immediate(">@")),
    at_square_expression: ($) =>
      seq(token.immediate("@["), $._expr, token.immediate("@]")),

    // expr
    expr: ($) => $._expr,
    _expr: ($) =>
      choice(
        $.unary_expr,
        $.binop_expr,
        $.ternary_expr,
        $.escape_sequence,
        seq("(", $._expr, ")"),
        $.number,
        $.identifier,
        $.at_reference,
        $.string,
        $.at_angle_expression,
        $.at_square_expression,
      ),
    unary_expr: ($) =>
      prec.left(PREC.unary, seq(choice("-", "+", "~", "!"), $._expr)),
    binop_expr: ($) =>
      choice(
        prec.left(PREC.exp, seq($._expr, "**", $._expr)),
        prec.left(PREC.muldiv, seq($._expr, choice("/", "*", "%"), $._expr)),
        prec.left(PREC.addsub, seq($._expr, choice("+", "-"), $._expr)),
        prec.left(PREC.shift, seq($._expr, choice("<<", ">>"), $._expr)),
        prec.left(
          PREC.compare,
          seq($._expr, choice(">", "<", ">=", "<="), $._expr),
        ),
        prec.left(PREC.equal_bool, seq($._expr, choice("==", "!="), $._expr)),
        prec.left(PREC.equal_string, seq($._expr, choice("eq", "ne"), $._expr)),
        prec.left(PREC.contain, seq($._expr, choice("in", "ni"), $._expr)),
        prec.left(PREC.and_bit, seq($._expr, "&", $._expr)),
        prec.left(PREC.xor_bit, seq($._expr, "^", $._expr)),
        prec.left(PREC.or_bit, seq($._expr, "|", $._expr)),
        prec.left(PREC.and_logical, seq($._expr, "&&", $._expr)),
        prec.left(PREC.or_logical, seq($._expr, "||", $._expr)),
      ),
    ternary_expr: ($) =>
      prec.left(PREC.ternary, seq($._expr, "?", $._expr, ":", $._expr)),

    number: (_) => {
      const hexLiteral = seq(choice("0x", "0X"), /[\da-fA-F](_?[\da-fA-F])*/);

      const decimalDigits = /\d(_?\d)*/;
      const signedInteger = seq(optional(choice("-", "+")), decimalDigits);
      const exponentPart = seq(choice("e", "E"), signedInteger);

      const binaryLiteral = seq(choice("0b", "0B"), /[0-1](_?[0-1])*/);

      const octalLiteral = seq(choice("0o", "0O"), /[0-7](_?[0-7])*/);

      const bigintLiteral = seq(
        choice(hexLiteral, binaryLiteral, octalLiteral, decimalDigits),
        "n",
      );

      const decimalIntegerLiteral = choice(
        "0",
        seq(
          optional("0"),
          /[1-9]/,
          optional(seq(optional("_"), decimalDigits)),
        ),
      );

      const decimalLiteral = choice(
        seq(
          decimalIntegerLiteral,
          ".",
          optional(decimalDigits),
          optional(exponentPart),
        ),
        seq(".", decimalDigits, optional(exponentPart)),
        seq(decimalIntegerLiteral, exponentPart),
        decimalDigits,
      );

      return token(
        choice(
          hexLiteral,
          decimalLiteral,
          binaryLiteral,
          octalLiteral,
          bigintLiteral,
        ),
      );
    },
    boolean: (_) => choice("1", "0", /true/i, /false/i),

    // string
    // BUG: 不能匹配独立出现的"@"符号
    string: ($) =>
      choice(
        seq(
          '"',
          repeat(
            choice(
              alias($.unescaped_double_string_fragment, $.string_fragment),
              $.escape_sequence,
              $.at_reference,
            ),
          ),
          '"',
        ),
        seq(
          "'",
          repeat(
            choice(
              alias($.unescaped_single_string_fragment, $.string_fragment),
              $.escape_sequence,
              $.at_reference,
            ),
          ),
          "'",
        ),
      ),
    unescaped_double_string_fragment: (_) =>
      token.immediate(prec(1, /[^"\\\r\n@]+/)),
    unescaped_single_string_fragment: (_) =>
      token.immediate(prec(1, /[^'\\\r\n@]+/)),
    escape_sequence: (_) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[^xu0-7]/,
            /[0-7]{1,3}/,
            /x[0-9a-fA-F]{2}/,
            /u[0-9a-fA-F]{4}/,
            /u\{[0-9a-fA-F]+\}/,
            /[\r?][\n\u2028\u2029]/,
          ),
        ),
      ),

    at_reference: (_) =>
      token.immediate(
        seq(
          "@",
          repeat(
            /[^\x00-\x1F\s\p{Zs}:;`"'@#.,^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u,
          ),
          "@",
        ),
      ),
    identifier: (_) => {
      const alpha =
        /[^\x00-\x1F\s\p{Zs}0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;

      const alphanumeric =
        /[^\x00-\x1F\s\p{Zs}:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/u;
      return token(seq(alpha, repeat(alphanumeric)));
    },
    _whitespace: (_) => token(/\s+/),
  },
});

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
