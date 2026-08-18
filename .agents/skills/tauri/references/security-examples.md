# Tauri Security Examples Reference

## CVE Details and Mitigations

### CVE-2024-35222: iFrame Origin Bypass

**Severity**: HIGH (CVSS 7.5)
**Affected**: Tauri < 1.6.7, < 2.0.0-beta.20
**CWE**: CWE-346 (Origin Validation Error)

**Description**: When using `dangerousRemoteDomainIpcAccess`, iFrames from the allowed domain could bypass origin checks and invoke Tauri API commands even though they should be restricted to the parent window only.

**Vulnerable Configuration**:
```json
{
  "security": {
    "dangerousRemoteDomainIpcAccess": [
      {
        "domain": "trusted.com",
        "windows": ["main"],
        "enableTauriAPI": true
      }
    ]
  }
}
```

**Mitigation**:
1. Upgrade to Tauri 1.6.7+ or 2.0.0-beta.20+
2. Avoid `dangerousRemoteDomainIpcAccess` if possible
3. Implement additional origin checks in commands:
```rust
#[command]
async fn sensitive_op(window: Window) -> Result<(), String> {
    let url = window.url();
    if url.origin() != expected_origin {
        return Err("Invalid origin".into());
    }
    Ok(())
}
```

---

### CVE-2023-46115: Updater Key Leakage via Vite

**Severity**: MEDIUM (CVSS 5.5)
**Affected**: Applications using Vite with misconfigured envPrefix
**CWE**: CWE-200 (Information Exposure)

**Description**: The Tauri documentation example showed `envPrefix: ['VITE_', 'TAURI_']` which causes `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD` to be bundled into the frontend code.

**Mitigation**:
```typescript
// vite.config.ts - SECURE
import { defineConfig } from 'vite';

export default defineConfig({
  envPrefix: ['VITE_']  // Only expose VITE_ variables
});
```

---

### CVE-2023-34460: Filesystem Scope Bypass for Dotfiles

**Severity**: MEDIUM (CVSS 4.7)
**Affected**: Tauri 1.4.0
**CWE**: CWE-22 (Path Traversal)

**Description**: Regression in Tauri 1.4.0 allowed access to dotfiles when using wildcard scopes like `$HOME/*`.

**Mitigation**:
Upgrade to Tauri 1.4.1+ or 2.0+, and use explicit non-wildcard capability allowlists.
