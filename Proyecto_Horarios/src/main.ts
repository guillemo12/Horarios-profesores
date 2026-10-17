declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
    };
  }
}

export async function executeGreetCommand(
  name: string,
  invokeFn?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
): Promise<string> {
  if (!name || !name.trim()) {
    return 'Por favor, introduce un nombre válido.';
  }
  const cleanName = name.trim();

  if (invokeFn) {
    const res = await invokeFn('greet', { name: cleanName });
    return String(res);
  }

  if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
    const res = await window.__TAURI__.core.invoke('greet', { name: cleanName });
    return String(res);
  }

  return `Hello, ${cleanName}! You've been greeted from Rust!`;
}

export async function handleGreetSubmit(
  inputEl: HTMLInputElement | null,
  msgEl: HTMLElement | null
): Promise<void> {
  if (!inputEl || !msgEl) return;
  const result = await executeGreetCommand(inputEl.value);
  msgEl.textContent = result;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const greetInputEl = document.querySelector<HTMLInputElement>('#greet-input');
    const greetMsgEl = document.querySelector<HTMLElement>('#greet-msg');
    const greetFormEl = document.querySelector<HTMLFormElement>('#greet-form');

    if (greetFormEl) {
      greetFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        handleGreetSubmit(greetInputEl, greetMsgEl);
      });
    }
  });
}
