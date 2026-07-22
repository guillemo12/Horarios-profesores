import { WsCallback } from './types';
import { showToast } from './utils';

export class EngineWebSocket {
    public isConnected: boolean;
    public isOptimizing: boolean;
    private wsUrl: string;
    private callbacks: Record<string, WsCallback>;
    private socket: WebSocket | null;

    constructor() {
        this.wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';
        this.isConnected = false;
        this.isOptimizing = false;
        this.callbacks = {};
        this.socket = null;
    }

    connect(): void {
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
                    this._trigger('scores_updated', { hard: msg.hard, soft: msg.soft });
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
    }

    on(event: string, callback: WsCallback): void { this.callbacks[event] = callback; }
    private _trigger(event: string, data?: any): void { if(this.callbacks[event]) this.callbacks[event](data); }

    sendCommand(command: string, payload: any = {}): void {
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
