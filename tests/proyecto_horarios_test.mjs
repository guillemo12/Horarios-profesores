import test from 'node:test';
import assert from 'node:assert';
import { formatGreeting } from '../Proyecto_Horarios/src/main.ts';

test('formatGreeting - Test 1 (Happy Path): Devuelve saludo formateado correctamente con invoker de Tauri y sin invoker', async () => {
    const defaultGreeting = await formatGreeting('Jules');
    assert.strictEqual(defaultGreeting, 'Hello, Jules!');

    const mockInvoker = async (cmd, args) => {
        assert.strictEqual(cmd, 'greet');
        return `Backend Tauri: Hola ${args.name}`;
    };

    const tauriGreeting = await formatGreeting('Jules', mockInvoker);
    assert.strictEqual(tauriGreeting, 'Backend Tauri: Hola Jules');
});

test('formatGreeting - Test 2 (Edge Case): Maneja nombres vacios, nulos, indefinidos o con espacios en blanco de forma segura', async () => {
    const emptyGreeting = await formatGreeting('');
    assert.strictEqual(emptyGreeting, 'Hola, usuario vacio');

    const nullGreeting = await formatGreeting(null);
    assert.strictEqual(nullGreeting, 'Hola, usuario vacio');

    const undefinedGreeting = await formatGreeting(undefined);
    assert.strictEqual(undefinedGreeting, 'Hola, usuario vacio');

    const spacesGreeting = await formatGreeting('   ');
    assert.strictEqual(spacesGreeting, 'Hola, usuario vacio');
});
