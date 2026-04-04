# Contributing to Imposter 👻

First off, thanks for taking the time to contribute! Your help in making **Imposter** a more powerful tool for the community is greatly appreciated.

To maintain a clean and professional codebase, please follow these guidelines:

## 🛡️ Found a Bug?
- **Search first**: Check existing issues to see if the bug has already been reported.
- **Open an Issue**: If not, create a new issue. Include a clear title, a description of the bug, and steps to reproduce it.

## 💡 Have a Feature Idea?
- **Propose it**: Before writing any code, open a new **Feature Request** issue to describe your idea.
- **Wait for Approval**: To avoid redundant work, please wait for the **Author's (@Puskar-Roy) acceptance** before moving to the implementation phase.

## 🛠️ Contribution Workflow

Once your feature or bug fix is approved, follow these steps:

1.  **Fork the Repository**: Create your own copy of the project.
2.  **Create a Feature Branch**: 
    - **Crucial**: Do **NOT** work directly on the `main` or `prod` branches.
    - Use a descriptive name for your branch: `feature/your-feature-name` or `fix/issue-description`.
    - `git checkout -b feature/amazing-new-logic`
3.  **Commit Your Changes**: Keep your commits small and focused.
4.  **Open a Pull Request (PR)**:
    - Describe the changes you’ve made and why.
    - Link the relevant issue that your PR addresses.
5.  **Review Process**:
    - The author will review your code and may suggest changes.
    - Once approved, your PR will be merged into the `main` branch.

## 🎨 Style Guidelines
- **No Ad-hoc Styles**: Use the modular CSS components in `src/renderer/css/`.
- **Clean Code**: Remove unnecessary comments and debug statements.
- **Modular Logic**: Keep the renderer logic separated into the correct ES modules in `src/renderer/js/`.

## ⚠️ Important Note
**Do not directly push to the main or production branches.** Any direct pushes will be rejected to ensure system stability and code quality.

Thank you for being part of the **Imposter** project! Let's beat a broken system together. ⚔️
