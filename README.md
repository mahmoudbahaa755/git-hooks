# git-hooks

This repository contains custom Git hooks for various tasks, including commit
message linting, translation key checks, and linting/type checking.

### Prerequisites

Ensure that you have [Husky](https://github.com/typicode/husky) installed and
set up in your project. You can install Husky by running:

```sh
npm install husky --save-dev
```

then

```sh
npx husky init
```

## Setup

### Commit Message Linting

To set up commit message linting with Commitlint, run the following script:

```sh
./commit-message/setupCommitlint.sh
```
