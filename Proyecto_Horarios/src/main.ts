declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

export async function formatGreeting(
  name: string | null | undefined,
  invoker?: (cmd: string, args: Record<string, unknown>) => Promise<string>
): Promise<string> {
  const cleanName = (name ?? "").trim();
  if (!cleanName) {
    return "Hola, usuario vacio";
  }
  if (invoker) {
    return await invoker("greet", { name: cleanName });
  }
  return `Hello, ${cleanName}!`;
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function greet(): Promise<void> {
  if (greetInputEl && greetMsgEl) {
    const rawValue = greetInputEl.value;
    const invoker = window.__TAURI__?.core
      ? (cmd: string, args: Record<string, unknown>) => window.__TAURI__!.core.invoke<string>(cmd, args)
      : undefined;
    const greeting = await formatGreeting(rawValue, invoker);
    greetMsgEl.textContent = greeting;
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
    greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
    const form = document.querySelector<HTMLFormElement>("#greet-form");
    if (form) {
      form.addEventListener("submit", (e: Event) => {
        e.preventDefault();
        greet();
      });
    }
  });
}
