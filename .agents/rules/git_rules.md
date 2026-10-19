---
trigger: always_on
description: Prevent automated git push commands to remote repositories
---

# Git Safety Rules

- **NEVER execute `git push` to GitHub or any remote repository.**
- Pushing to remote repositories is strictly reserved for the user to do manually.
- The agent must never propose or run `git push` under any circumstances.
