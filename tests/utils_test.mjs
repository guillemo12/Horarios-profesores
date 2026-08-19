import test from 'node:test';
import assert from 'node:assert';

// Entorno DOM simulado para Node.js
class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    add(...names) {
        names.forEach(n => this.classes.add(n));
    }
    remove(...names) {
        names.forEach(n => this.classes.delete(n));
    }
    contains(name) {
        return this.classes.has(name);
    }
}

class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.classList = new MockClassList();
        this.className = '';
        this.innerHTML = '';
        this.parentNode = null;
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    remove() {
        if (this.parentNode) {
            const idx = this.parentNode.children.indexOf(this);
            if (idx !== -1) {
                this.parentNode.children.splice(idx, 1);
            }
        }
    }
}

class MockDocument {
    constructor() {
        this.elements = new Map();
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    createElement(tagName) {
        return new MockElement(tagName);
    }

    reset() {
        this.elements.clear();
    }
}

const mockDoc = new MockDocument();
global.document = mockDoc;

import { formatHours, showToast } from '../Web/src/utils.ts';

test('formatHours: formato correcto de horas', () => {
    assert.strictEqual(formatHours(2), '2');
    assert.strictEqual(formatHours(2.5), '2.5');
    assert.strictEqual(formatHours(2.25), '2.25');
    assert.strictEqual(formatHours(2.33333), '2.33');
    assert.strictEqual(formatHours(2.66666), '2.67');
    assert.strictEqual(formatHours(0), '0');
    assert.strictEqual(formatHours(-1.5), '-1.5');
});

test('showToast: no hace nada si no existe el contenedor #toast-container', () => {
    mockDoc.reset();
    showToast('Título', 'Mensaje');
    assert.strictEqual(mockDoc.getElementById('toast-container'), null);
});

test('showToast: crea notificación de tipo por defecto (info)', () => {
    mockDoc.reset();
    const container = mockDoc.createElement('div');
    mockDoc.elements.set('toast-container', container);

    showToast('Info Title', 'Info Message');

    assert.strictEqual(container.children.length, 1);
    const toast = container.children[0];
    assert.ok(toast.className.includes('border-blue-500 text-blue-500'));
    assert.ok(toast.innerHTML.includes('Info Title'));
    assert.ok(toast.innerHTML.includes('Info Message'));
});

test('showToast: crea notificaciones con los tipos error, success y warning', () => {
    mockDoc.reset();
    const container = mockDoc.createElement('div');
    mockDoc.elements.set('toast-container', container);

    showToast('Err Title', 'Err Msg', 'error');
    assert.ok(container.children[0].className.includes('border-red-500 text-red-500'));

    showToast('Success Title', 'Success Msg', 'success');
    assert.ok(container.children[1].className.includes('border-green-500 text-green-500'));

    showToast('Warn Title', 'Warn Msg', 'warning');
    assert.ok(container.children[2].className.includes('border-yellow-500 text-yellow-500'));
});

test('showToast: animación y eliminación progresiva con temporizadores', (t) => {
    t.mock.timers.enable();
    mockDoc.reset();
    const container = mockDoc.createElement('div');
    mockDoc.elements.set('toast-container', container);

    showToast('Toast Timer', 'Timer Test');
    assert.strictEqual(container.children.length, 1);
    const toast = container.children[0];

    // Avance de 10ms -> remueve clases de animación inicial
    t.mock.timers.tick(10);

    // Avance de 4000ms -> añade ocultamiento
    t.mock.timers.tick(4000);
    assert.ok(toast.classList.contains('opacity-0'));
    assert.ok(toast.classList.contains('translate-x-full'));

    // Avance de 300ms adicionales -> remueve del DOM
    t.mock.timers.tick(300);
    assert.strictEqual(container.children.length, 0);
});
