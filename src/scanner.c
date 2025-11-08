#include "tree_sitter/parser.h"
#include <ctype.h>
#include <stdbool.h>
#include <string.h>

/**
 * 定义外部扫描器可以生成的 token 类型。
 * 这个枚举必须与 grammar.js 中的 `externals` 数组顺序一致。
 */
enum TokenType {
  SHARP_DEFINE,
  SHARP_UNDEF,
  SHARP_SETDEP,
  SHARP_IF,
  SHARP_ELIF,
  SHARP_ELSE,
  SHARP_ENDIF,
  COMMENT,
};

/**
 * 跳过空白字符。
 */
static void skip_whitespace(TSLexer *lexer) {
  while (lexer->lookahead != '\0' && isspace((unsigned char)lexer->lookahead)) {
    lexer->advance(lexer, true);
  }
}

/**
 * 外部扫描器的创建函数。
 * Tree-sitter 在创建解析器实例时调用此函数。
 * 我们不需要任何状态对象，所以返回 NULL。
 */
void *tree_sitter_sdevice_external_scanner_create() { return NULL; }

/**
 * 外部扫描器的销毁函数。
 * Tree-sitter 在销毁解析器实例时调用此函数。
 */
void tree_sitter_sdevice_external_scanner_destroy(void *payload) {
  // 无需销毁任何资源
}

/**
 * 外部扫描器的状态序列化函数。
 * 我们的扫描器是无状态的，所以返回 0。
 */
unsigned tree_sitter_sdevice_external_scanner_serialize(void *payload,
                                                        char *buffer) {
  return 0;
}

/**
 * 外部扫描器的状态反序列化函数。
 * 我们的扫描器是无状态的，所以为空实现。
 */
void tree_sitter_sdevice_external_scanner_deserialize(void *payload,
                                                      const char *buffer,
                                                      unsigned length) {
  // 无需恢复状态
}

/**
 * 外部扫描器的主函数。
 * 这是 Tree-sitter 词法分析器在遇到歧义或需要自定义逻辑时调用的核心函数。
 */
bool tree_sitter_sdevice_external_scanner_scan(void *payload, TSLexer *lexer,
                                               const bool *valid_symbols) {
  skip_whitespace(lexer);

  if (lexer->lookahead == '#') {
    lexer->advance(lexer, false); // 消耗 '#'

    // 读取 '#' 后面的指令
    char directive[20];
    int len = 0;
    while (len < 19 && isalnum((unsigned char)lexer->lookahead)) {
      directive[len++] = (char)lexer->lookahead;
      lexer->advance(lexer, false);
    }
    directive[len] = '\0';

    // 检查读取到的指令是否是已知的关键字
    if (valid_symbols[SHARP_DEFINE] && strcmp(directive, "define") == 0) {
      lexer->result_symbol = SHARP_DEFINE;
      return true;
    }
    if (valid_symbols[SHARP_UNDEF] && strcmp(directive, "undef") == 0) {
      lexer->result_symbol = SHARP_UNDEF;
      return true;
    }
    if (valid_symbols[SHARP_SETDEP] && strcmp(directive, "setdep") == 0) {
      lexer->result_symbol = SHARP_SETDEP;
      return true;
    }
    if (valid_symbols[SHARP_IF] && strcmp(directive, "if") == 0) {
      lexer->result_symbol = SHARP_IF;
      return true;
    }
    if (valid_symbols[SHARP_ELIF] && strcmp(directive, "elif") == 0) {
      lexer->result_symbol = SHARP_ELIF;
      return true;
    }
    if (valid_symbols[SHARP_ELSE] && strcmp(directive, "else") == 0) {
      lexer->result_symbol = SHARP_ELSE;
      return true;
    }
    if (valid_symbols[SHARP_ENDIF] && strcmp(directive, "endif") == 0) {
      lexer->result_symbol = SHARP_ENDIF;
      return true;
    }

    // 如果不是任何已知指令，并且 COMMENT 是有效的，
    // 则将这一行剩下的内容当作注释处理。
    if (valid_symbols[COMMENT]) {
      while (lexer->lookahead != '\n' && lexer->lookahead != '\r' &&
             lexer->lookahead != '\0') {
        lexer->advance(lexer, false);
      }
      lexer->result_symbol = COMMENT;
      return true;
    }
  }

  return false;
}
