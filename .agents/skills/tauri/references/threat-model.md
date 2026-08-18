# Tauri Threat Model Reference

## Threat Model Overview

**Domain Risk Level**: HIGH

### Assets to Protect
1. **User Data** - Application data, credentials, personal files
2. **System Access** - Filesystem, shell, network
3. **Update Mechanism** - Application integrity
4. **IPC Channel** - Communication between frontend and backend

### Threat Actors
1. **Malicious Web Content** - XSS, CSRF via embedded content
2. **Supply Chain Attackers** - Compromised dependencies, malicious updates
3. **Local Attackers** - Privilege escalation attempts
4. **Network Attackers** - MitM on updates, API hijacking

---

## Attack Scenarios & Mitigations

### 1. IPC Command Injection via XSS
- **Mitigation**: Origin verification on all sensitive Rust commands (`window.url().origin()`) and strict Content Security Policy.

### 2. Path Traversal
- **Mitigation**: Canonicalize all file paths with `dunce::canonicalize()` and verify they start with the intended application directory.

### 3. Shell Injection
- **Mitigation**: Disable shell plugin by default or use strict allowlist in capabilities JSON (`shell:allow-execute`).
