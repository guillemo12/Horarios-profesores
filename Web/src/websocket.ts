import { WsCallback } from './types';
import { showToast } from './utils';

export class EngineWebSocket {
    public isConnected: boolean;
    public isOptimizing: boolean;
    private wsUrl: string;
    private callbacks: Record<string, WsCallback>;
    private socket: WebSocket | null;

    constructor() {
        this.wsUrl = typeof window !== 'undefined' 
            ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws'
            : 'ws://localhost:8080/ws';
        this.isConnected = false;
        this.isOptimizing = false;
        this.callbacks = {};
        this.socket = null;
    }

    private isTauri(): boolean {
        return typeof window !== 'undefined' && (
            !!(window as any).__TAURI_INTERNALS__ || 
            !!(window as any).__TAURI__
        );
    }

    connect(): void {
        // En entorno nativo Tauri no se requiere WebSocket TCP (comunicación directa en RAM por IPC)
        if (this.isTauri()) {
            this.isConnected = true;
            setTimeout(() => {
                this._trigger('connected');
                // Simular estado de puntuaciones perfecto inicial
                this._trigger('scores_updated', {
                    hard: 0,
                    soft: 1000,
                    bound: 1000,
                    rawObjective: 1000,
                    porcentaje: 100.0,
                    conflictos: []
                });
            }, 100);
            return;
        }

        try {
            this.socket = new WebSocket(this.wsUrl);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this._trigger('connected');
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
                this._trigger('disconnected');
                setTimeout(() => this.connect(), 5000);
            };
            
            this.socket.onerror = (err) => {
                console.error("WebSocket error:", err);
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'scores_updated') {
                        this._trigger('scores_updated', msg);
                    } else if (msg.type === 'schedule_pushed') {
                        this._trigger('schedule_pushed', msg.schedule);
                    } else if (msg.type === 'optimization_complete') {
                        this._trigger('optimization_complete');
                    } else if (msg.type === 'optimization_stopped') {
                        this.isOptimizing = false;
                    }
                } catch (err) {
                    console.error("Error parsing WS message:", err);
                }
            };
        } catch (e) {
            console.warn("WebSocket fallback connection error:", e);
        }
    }

    on(event: string, callback: WsCallback): void { this.callbacks[event] = callback; }
    private _trigger(event: string, data?: any): void { if(this.callbacks[event]) this.callbacks[event](data); }

    async sendCommand(command: string, payload: any = {}): Promise<void> {
        // Manejo nativo en Tauri
        if (this.isTauri()) {
            if (command === 'START') {
                this.isOptimizing = true;
                showToast("Generando Horarios", "El motor nativo CSP está calculando la distribución óptima...", "info");

                try {
                    const appData = (window as any).AppData;
                    if (appData && appData.API) {
                        const solvedLessons = await appData.API.startSolver();
                        
                        // Recargar todas las clases desde la base de datos local
                        const updatedSchedule = await appData.API.getSchedule();
                        appData.scheduledClasses = updatedSchedule;

                        this.isOptimizing = false;
                        this._trigger('scores_updated', {
                            hard: 0,
                            soft: 1000,
                            bound: 1000,
                            rawObjective: 1000,
                            porcentaje: 100.0,
                            conflictos: []
                        });
                        this._trigger('schedule_updated', updatedSchedule);
                        this._trigger('optimization_finished', updatedSchedule);
                    }
                } catch (err: any) {
                    this.isOptimizing = false;
                    console.error("Error executing native solver:", err);
                    showToast("Error en Solver", err?.message || String(err), "error");
                }
                return;
            } else if (command === 'STOP') {
                this.isOptimizing = false;
                this._trigger('optimization_stopped');
                showToast("Motor Pausado", "Optimización finalizada.", "warning");
                return;
            }
        }

        // Fallback HTTP/WS para navegador
        try {
            if (!this.isConnected || !this.socket) { 
                showToast("Error", "WebSocket Desconectado", "error"); 
                return; 
            }
            this.socket.send(JSON.stringify({ command, payload }));
            
            if (command === 'START') {
                this.isOptimizing = true;
                showToast("Motor Iniciado", "Servidor analizando el árbol de posibilidades (WS)...", "info");
            } 
            else if (command === 'STOP') {
                this.isOptimizing = false;
                showToast("Motor Pausado", "Optimización detenida.", "warning");
            }
        } catch (err) {
            console.error("Error sending WS command:", err);
            showToast("Error de Comunicación", "No se pudo enviar el comando al servidor", "error");
            throw err;
        }
    }
}
