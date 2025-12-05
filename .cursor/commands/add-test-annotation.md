Add @rule-test annotations to existing tests that cover this rule.

Search for test files that test the functionality we just implemented. If tests exist:
- Add `@rule-test <rule-id>` comments to the relevant test describe/it blocks
- You can add multiple rule IDs if a test covers multiple rules: `// @rule-test 1.06.03, 1.06.04`

If no tests exist yet, note that tests should be written separately. Don't write them now, just add annotations to existing tests.

The annotation should be placed near the test that validates the rule.
