# 🤝 Contributing to EduSchedule

Thank you for your interest in contributing to **EduSchedule**! We welcome contributions from developers of all skill levels. Whether you are fixing a bug, adding a new feature, improving documentation, or translating the application, your help is greatly appreciated.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all contributors with respect and kindness.

---

## 🛠️ Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
* **Java Development Kit (JDK) 21+** (e.g. Eclipse Temurin / OpenJDK)
* **Deno 2.0+** (from [deno.com](https://deno.com))
* **Rust & Cargo** (latest stable toolchain from [rustup.rs](https://rustup.rs))

### Fork & Clone the Repository

1. Fork the repository on GitHub: `https://github.com/guillemo12/Horarios-profesores/fork`
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Horarios-profesores.git
   cd Horarios-profesores
   ```
3. Set the upstream remote:
   ```bash
   git remote add upstream https://github.com/guillemo12/Horarios-profesores.git
   ```

---

## 💻 Development Workflow

### 1. Branching Strategy

Create a new descriptive branch from `master`:
```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/issue-description
```

### 2. Building & Running Locally

* **Compile the Web Frontend (Deno)**:
  ```bash
  deno task bundle
  ```

* **Run the Backend Server (Kotlin Ktor)**:
  ```bash
  ./gradlew run
  ```
  Access the web interface at `http://localhost:8080`.

* **Run the Desktop App (Tauri via Deno)**:
  ```bash
  deno task tauri:dev
  ```

### 3. Running Tests

Always ensure existing and new tests pass before submitting a Pull Request:
```bash
./gradlew test --info
```

### 4. Commit Message Guidelines

We recommend conventional commit messages:
- `feat: add new room capacity constraint`
- `fix: resolve teacher conflict on Friday afternoon`
- `docs: update setup instructions in README`
- `style: format code according to Kotlin conventions`
- `test: add unit tests for schedule prevalidation`

---

## 🚀 Submitting a Pull Request (PR)

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a **Pull Request** against the `master` branch on the main repository.
3. Fill out the PR template completely:
   - Explain the purpose of the changes.
   - Link any related issues (`Fixes #123`).
   - Confirm that all unit tests pass.
4. An automated CI workflow will verify that your code compiles and passes all tests.
5. Maintainers will review your PR and provide feedback if needed.

---

## 🐛 Reporting Bugs

If you find a bug:
1. Check existing [Issues](https://github.com/guillemo12/Horarios-profesores/issues) to see if it has already been reported.
2. If not, open a new Issue using the **Bug Report** template.
3. Include your OS version, steps to reproduce, and any error logs.

---

## 💡 Suggesting Features

Have an idea to improve timetable optimization or UI?
1. Open a new Issue using the **Feature Request** template.
2. Describe the feature, why it is needed, and any alternative solutions you considered.

---

## 📄 License

By contributing code to EduSchedule, you agree that your contributions will be licensed under the **GNU General Public License v3.0 (GPL-3.0)**.
