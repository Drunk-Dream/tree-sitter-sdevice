import XCTest
import SwiftTreeSitter
import TreeSitterSdevice

final class TreeSitterSdeviceTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_sdevice())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Sdevice grammar")
    }
}
