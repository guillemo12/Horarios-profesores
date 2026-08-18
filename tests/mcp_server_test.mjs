import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScript = path.resolve(__dirname, '..', 'mcp-server', 'index.mjs');

function sendRpc(proc, message) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        
        const onData = (data) => {
            buffer += data.toString('utf-8');
            const lines = buffer.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed.id === message.id) {
                            proc.stdout.off('data', onData);
                            return resolve(parsed);
                        }
                    } catch {}
                }
            }
        };

        proc.stdout.on('data', onData);
        proc.stdin.write(JSON.stringify(message) + '\n');

        setTimeout(() => {
            proc.stdout.off('data', onData);
            reject(new Error(`Timeout waiting for JSON-RPC response ID ${message.id}`));
        }, 5000);
    });
}

test('MCP Server: inicialización JSON-RPC y catálogo de herramientas', async () => {
    const proc = spawn('node', [serverScript], {
        env: { ...process.env, EDUSCHEDULE_API_URL: 'http://127.0.0.1:8080/api/v1' },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    try {
        // 1. Initialize
        const initRes = await sendRpc(proc, {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'test-suite', version: '1.0.0' }
            }
        });

        assert.strictEqual(initRes.result.serverInfo.name, 'eduschedule-mcp');
        assert.strictEqual(initRes.result.protocolVersion, '2024-11-05');

        // 2. Tools List
        const listRes = await sendRpc(proc, {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        });

        assert.ok(Array.isArray(listRes.result.tools), 'Tools debe ser un array');
        assert.ok(listRes.result.tools.length >= 15, `Debe haber al menos 15 herramientas (actual: ${listRes.result.tools.length})`);

        const toolNames = listRes.result.tools.map(t => t.name);
        assert.ok(toolNames.includes('eduschedule_status'));
        assert.ok(toolNames.includes('eduschedule_check_viability'));
        assert.ok(toolNames.includes('eduschedule_list_courses'));
        assert.ok(toolNames.includes('eduschedule_list_teachers'));
        assert.ok(toolNames.includes('eduschedule_list_subjects'));
        assert.ok(toolNames.includes('eduschedule_update_assignment'));
        assert.ok(toolNames.includes('eduschedule_save_class'));
        assert.ok(toolNames.includes('eduschedule_get_schedule'));

        // 3. Tool Call: eduschedule_status
        const statusRes = await sendRpc(proc, {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: { name: 'eduschedule_status', arguments: {} }
        });

        assert.ok(statusRes.result.content[0].text.includes('online') || statusRes.result.content[0].text.includes('stats'));

        // 4. Tool Call: eduschedule_check_viability
        const viabRes = await sendRpc(proc, {
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: { name: 'eduschedule_check_viability', arguments: {} }
        });

        assert.ok(viabRes.result.content[0].text.includes('checks'));
    } finally {
        proc.kill();
    }
});
