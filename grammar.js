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
  extras: ($) => [$._whitespace, $.comment, $.tcl_block],

  rules: {
    // TODO: add the actual grammar rules
    source_file: ($) => repeat($._statement),

    _statement: ($) =>
      choice(
        $.sharp_command_statement,
        $.file_section_statement,
        $.electrode_section_statement,
        $.physics_section_statement,
        $.plot_section_statement,
        $.current_plot_section_statement,
      ),

    // sharp_command_statement
    sharp_command_statement: ($) =>
      choice(
        $.define_micro,
        $.undefine_macro,
        $.set_dep,
        $.sharp_if_elif,
        $.sharp_else_endif,
      ),
    define_micro: ($) =>
      seq(
        alias($._sharp_define, $.sharp_command_name), // 使用外部扫描器生成的 token
        field("name", $.identifier),
        field("value", $._expr),
      ),
    undefine_macro: ($) =>
      seq(
        alias($._sharp_undef, $.sharp_command_name),
        field("name", $.identifier),
      ), // 使用外部扫描器生成的 token
    set_dep: ($) =>
      seq(alias($._sharp_setdep, $.sharp_command_name), $.at_reference), // 使用外部扫描器生成的 token
    sharp_if_elif: ($) =>
      seq(
        alias(choice($._sharp_if, $._sharp_elif), $.sharp_command_name),
        field("condition", $._expr),
      ),
    sharp_else_endif: ($) =>
      seq(alias(choice($._sharp_else, $._sharp_endif), $.sharp_command_name)),

    // File Section
    file_section_statement: ($) =>
      seq(
        field("name", token.immediate("File")),
        "{",
        repeat($._file_section_member),
        "}",
      ),
    _file_section_member: ($) =>
      choice($.identifier, $.key_value, $.sharp_command_statement),

    // Electrode Section
    electrode_section_statement: ($) =>
      seq(
        field("name", token.immediate("Electrode")),
        "{",
        repeat($.electrode_section_member),
        "}",
      ),
    electrode_section_member: ($) =>
      seq("{", repeat(choice($.key_value, $.sharp_command_statement)), "}"),
    _electrode_section_voltage_at_time_with_parentheses: ($) =>
      seq(
        "(",
        commaSep1(
          alias($._electrode_section_voltage_at_time, $.voltage_at_time),
        ),
        ")",
      ),
    _electrode_section_voltage_at_time: ($) =>
      seq(
        field("voltage", choice($.number, $.identifier, $.at_reference)),
        "at",
        field("time", choice($.number, $.identifier, $.at_reference)),
      ),

    // Physics Section
    physics_section_statement: ($) =>
      seq(
        field("name", token.immediate("Physics")),
        optional(seq("(", field("range", $.key_value), ")")),
        "{",
        repeat($._physics_section_member),
        "}",
      ),
    _physics_section_member: ($) =>
      choice(
        $.identifier,
        $.key_value,
        alias(
          $._physics_section_identifier_parentheses,
          $.identifier_parentheses,
        ),
        alias($._physics_section_traps, $.identifier_parentheses),
        alias($._physics_section_identifier_string, $.identifier_string),
        $.sharp_command_statement,
      ),
    _physics_section_identifier_parentheses: ($) =>
      seq(
        $.identifier,
        "(",
        field(
          "args",
          repeat(
            choice(
              $.identifier,
              $.key_value,
              alias(
                $._physics_section_identifier_parentheses,
                $.identifier_parentheses,
              ),
              $.sharp_command_statement,
            ),
          ),
        ),
        ")",
      ),
    _physics_section_identifier_string: ($) => seq($.identifier, $.string),
    _physics_section_traps: ($) =>
      seq(
        "Traps",
        "(",
        field(
          "args",
          repeat(
            choice(
              alias($._physics_section_traps_member, $.traps_member),
              $.sharp_command_statement,
            ),
          ),
        ),
        ")",
      ),
    _physics_section_traps_member: ($) =>
      seq(
        "(",
        repeat(
          choice(
            $.identifier,
            $.key_value,
            alias(
              $._physics_section_identifier_parentheses,
              $.identifier_parentheses,
            ),
            $.sharp_command_statement,
          ),
        ),
        ")",
      ),

    // Plot Section
    plot_section_statement: ($) =>
      seq(
        field("name", token.immediate("Plot")),
        "{",
        repeat($._plot_section_member),
        "}",
      ),
    _plot_section_member: ($) =>
      choice(
        $.identifier,
        seq($.identifier, "/", $.identifier),
        $.sharp_command_statement,
      ),

    // Plot Section
    current_plot_section_statement: ($) =>
      seq(
        field("name", token.immediate("CurrentPlot")),
        "{",
        repeat($._current_plot_section_member),
        "}",
      ),
    _current_plot_section_member: ($) =>
      choice(
        alias($._current_plot_identifier_parentheses, $.identifier_parentheses),
        $.sharp_command_statement,
      ),
    _current_plot_identifier_parentheses: ($) =>
      seq(
        $.identifier,
        "(",
        repeat(
          choice(
            $.key_value,
            $._current_plot_position,
            $._current_plot_identifier_windows,
            $._current_plot_identifier_parentheses,
            $.sharp_command_statement,
          ),
        ),
        ")",
      ),
    _current_plot_position: ($) =>
      seq("(", repeat(choice($.number, $.identifier)), ")"),
    _current_plot_identifier_windows: ($) =>
      seq("Window", "[", repeat($._current_plot_position), "]"),

    // TODO: 完成Math Section 与 Solve Section

    // parentheses: ($) => seq("(", repeat(commaSep1($._section_member)), ")"),
    // square_brackets: ($) => seq("[", repeat(commaSep1($._section_member)), "]"),
    // braces: ($) => seq("{", repeat(commaSep1($._section_member)), "}"),
    key_value: ($) =>
      seq(
        field("key", $.identifier),
        "=",
        field(
          "value",
          choice(
            $.identifier,
            $.number,
            $.string,
            $.at_reference,
            $.at_angle_expression,
            $.at_square_expression,
            $._electrode_section_voltage_at_time_with_parentheses,
          ),
        ),
      ),
    tcl_block: ($) =>
      prec(
        10,
        seq(
          token.immediate("!("),
          field("content", repeat(choice($._expr, "{", "}"))),
          token.immediate(")!"),
        ),
      ),
    at_angle_expression: ($) =>
      seq(token.immediate("@<"), $._expr, token.immediate(">@")),
    at_square_expression: ($) =>
      seq(
        alias(token.immediate("@["), $.at_square_expression_open),
        $.command,
        alias(token.immediate("]@"), $.at_square_expression_close),
      ),
    // command
    command: ($) =>
      seq(
        field("name", $.identifier),
        field("args", repeat1(choice($._expr, $.number_format))),
      ),
    _command_with_square_bracket: ($) => seq("[", $.command, "]"),

    // expr
    expr: ($) =>
      choice(
        $.unary_expr,
        $.binop_expr,
        $.ternary_expr,
        $.at_angle_expression,
        $.at_square_expression,
      ),
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
        $._command_with_square_bracket,
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

    number_format: (_) => /%[-+ #0]?(\d+|\*)?(\.\d+|\.\*)?[diuoxXfFeEgGaA]/,

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
              $.at_angle_expression,
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
