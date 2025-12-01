You can spawn a new sub agent in non-interactive mode in this command
```bash
spawn-cursor-agent "Research and find one bug in this codebase"
```

Also ensure you tell them clearly how to document their findings / actions, in .notes/agent-communication/... so that you can review later!

You need to give them full context in the prompt, since they start from scratch. You can also give them instructions in a file and then tell them to read it. 

Ensure that all files you create for communications between agents are in the .agents-communication directory. 

To start subagents run the command listed above yourself, the user can't do this! 