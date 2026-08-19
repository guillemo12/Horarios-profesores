import test from 'node:test';
import assert from 'node:assert';
import { formatHours } from '../Web/src/utils.ts';

test('formatHours: formateo de horas enteras', () => {
    assert.strictEqual(formatHours(0), '0');
    assert.strictEqual(formatHours(1), '1');
    assert.strictEqual(formatHours(10), '10');
});

test('formatHours: formateo de números decimales simples', () => {
    assert.strictEqual(formatHours(1.5), '1.5');
    assert.strictEqual(formatHours(2.25), '2.25');
    assert.strictEqual(formatHours(0.5), '0.5');
});

test('formatHours: redondeo a un máximo de 2 decimales', () => {
    assert.strictEqual(formatHours(1.333333), '1.33');
    assert.strictEqual(formatHours(2.666666), '2.67');
    assert.strictEqual(formatHours(0.125), '0.13');
});

test('formatHours: eliminación de ceros no significativos a la derecha', () => {
    assert.strictEqual(formatHours(2.00), '2');
    assert.strictEqual(formatHours(1.50), '1.5');
});

test('formatHours: manejo de imprecisiones de punto flotante de JavaScript', () => {
    assert.strictEqual(formatHours(0.1 + 0.2), '0.3');
    assert.strictEqual(formatHours(1.0000000001), '1');
});

test('formatHours: formateo de números negativos', () => {
    assert.strictEqual(formatHours(-1.5), '-1.5');
    assert.strictEqual(formatHours(-2.333), '-2.33');
});
