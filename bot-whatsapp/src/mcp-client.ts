import { spawn, ChildProcess } from 'child_process';
import { pino } from 'pino';

const logger = pino({ level: 'info' });

interface JsonRpcRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

export class MCPClient {
  private process?: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }>();
  private buffer = '';

  async start() {
    return new Promise<void>((resolve, reject) => {
      this.process = spawn('node', ['/home/tiago/dev/mcp-camara/dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: JsonRpcResponse = JSON.parse(line);
              const pending = this.pendingRequests.get(response.id);
              if (pending) {
                if (response.error) {
                  pending.reject(new Error(response.error.message || 'MCP Error'));
                } else {
                  pending.resolve(response.result);
                }
                this.pendingRequests.delete(response.id);
              }
            } catch (error) {
              logger.error({ line, error }, 'Failed to parse MCP response');
            }
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        logger.debug({ stderr: data.toString() }, 'MCP stderr');
      });

      this.process.on('error', (error) => {
        logger.error({ error }, 'MCP process error');
        reject(error);
      });

      this.process.on('spawn', () => {
        logger.info('MCP server started');
        setTimeout(() => resolve(), 1000);
      });
    });
  }

  private sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('MCP process not started'));
        return;
      }

      const id = ++this.requestId;
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        ...(params && { params }),
      };

      this.pendingRequests.set(id, { resolve, reject });

      this.process.stdin.write(JSON.stringify(request) + '\n');

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  async listTools() {
    const result = await this.sendRequest('tools/list');
    return result.tools || [];
  }

  async callTool(name: string, args: any) {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    });
    return result;
  }

  async stop() {
    if (this.process) {
      this.process.kill();
      logger.info('MCP server stopped');
    }
  }
}
