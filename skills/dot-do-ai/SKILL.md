# dot-do AI CLI wrapper

This skill integrates the `ai` CLI from `https://github.com/dot-do/ai.git` to retrieve and write content based on its knowledge.

It should be used to store information about the user and their business, in collaboration with the Cognee RAG system.

## Environment

This skill assumes you have Python and `npm` installed, and dependencies are accessible. The CLI will be executed directly via the submodule inside the workspace.

## Tools

### do_ai_cli

Execute the dot-do AI CLI command.

**Command:**
```bash
cd skills/dot-do-ai/repo && npm start -- ${args}
```

**Parameters:**
- `args`: Arguments to pass to the `ai` command.
