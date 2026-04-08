# Changelog

All notable changes to **Imposter** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-08

### Added
- **Initial Public Release**: Core desktop AI assistant shell.
- **Stealth Architecture**: Frameless, transparent interface with OS-level content protection.
- **Multi-Provider Engine**: Supports local Ollama and Cloud OpenRouter models.
- **Persona System**: Customizable AI identity templates stored locally.
- **OCR/Screen Capture**: Integrated Tesseract.js for visual context extraction.
- **Audio Capture**: System-level audio transcription via AssemblyAI.
- **Repository Standardization**: Added contribution guidelines, security policy, and professional repo health files.

### Fixed
- Fixed IPC communication latency between the main process and renderer.
- Resolved styling issues on Windows high-DPI displays.

### Security
- Implemented OS-level protection to prevent the application window from appearing in screen shares or screenshots.
