# Project Agent Guidelines & Constraints

## Version Control & Git Safety
- **NEVER push to GitHub or any remote repository (`git push`).**
- Pushing to remote repositories must always be done manually by the user.
- The agent may check status, branch, stage changes (`git add`), or make local commits (`git commit`) when appropriate, but must **never** execute `git push` under any circumstances.

## ML & Vision Guidelines
- No mock or hardcoded numbers in the CV/ML pipelines.
- All non-verbal signals and metrics must be calculated dynamically from real video and audio data.
