# Semantic Commit Messages

Format: `<type>(<scope>): <subject>`

`<scope>` is optional

## Example

```raw
feat: add hat wobble
^--^  ^------------^
|     |
|     +-> Summary in present tense.
|
+-------> Type: feat, fix, docs, style, refactor, test or chore.
```

More Examples:

- `feat`: (new feature for the user, not a new feature for build script)
- `fix`: (bug fix for the user, not a fix to a build script)
- `docs`: (changes to the documentation)
- `style`: (formatting, missing semi colons, etc; no production code change)
- `refactor`: (refactoring production code, e.g. renaming a variable)
- `test`: (adding missing tests, refactoring tests; no production code change)
- `chore`: (updating npm tasks etc; no production code change)
