import WebSocket from 'ws';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import { 
  WSMessage, 
  CommandRecordMessage, 
  CommandRunMessage, 
  CommandStopMessage,
  AgentStatusMessage 
} from '../../shared/types';

const execAsync = promisify(exec);

interface AgentClientOptions {
  agentId: string;
  token: string;
  name: string;
  backendUrl: string;
  wsUrl: string;
}

export class AgentClient {
  private ws: WebSocket | null = null;
  private options: AgentClientOptions;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentProcess: any = null;
  private currentTestId: string | null = null;

  constructor(options: AgentClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    const wsUrl = `${this.options.wsUrl}/ws`;
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        this.register();
        this.startHeartbeat();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        console.log('❌ WebSocket disconnected');
        this.stopHeartbeat();
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  private register(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: WSMessage = {
      type: 'agent:register',
      agentId: this.options.agentId,
      token: this.options.token,
      name: this.options.name
    };

    this.ws.send(JSON.stringify(message));
    console.log('📝 Registered with backend');
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'agent:heartbeat',
          agentId: this.options.agentId
        }));
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) return;

    console.log('⏳ Reconnecting in 5 seconds...');
    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null;
      this.connect();
    }, 5000);
  }

  private async handleMessage(data: Buffer): Promise<void> {
    try {
      const message: WSMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'agent:registered':
          console.log('✅ Agent registration confirmed');
          break;
        case 'error':
          console.error('❌ Error from backend:', (message as any).message);
          // Don't disconnect on error, let it handle reconnection if needed
          break;
        case 'command:record':
          await this.handleRecordCommand(message as CommandRecordMessage);
          break;
        case 'command:run':
          await this.handleRunCommand(message as CommandRunMessage);
          break;
        case 'command:stop':
          await this.handleStopCommand(message as CommandStopMessage);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async handleRecordCommand(message: CommandRecordMessage): Promise<void> {
    // Force Chromium if FORCE_CHROMIUM env var is set (for Docker agent)
    const browser = process.env.FORCE_CHROMIUM === 'true' ? 'chromium' : message.browser;
    
    console.log(`\n🎬 Starting recording for test: ${message.testId}`);
    console.log(`   URL: ${message.url}`);
    if (process.env.FORCE_CHROMIUM === 'true') {
      console.log(`   Browser: ${browser} (Chromium-only mode enabled)`);
    } else {
      console.log(`   Browser: ${browser}`);
    }
    console.log('');

    this.currentTestId = message.testId;
    this.sendStatus('recording', message.testId, 'Starting recording...');

      let stdout = '';
      let stderr = '';

      try {
        // Support configurable workspace path for Docker (via WORKSPACE_PATH env var)
        // Defaults to current working directory for backward compatibility
        const workspaceRoot = process.env.WORKSPACE_PATH || process.cwd();
        const testDir = path.join(workspaceRoot, 'temp-tests', message.testId);
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }

        const outputFile = path.join(testDir, 'test.spec.ts');

        // Run playwright codegen (always visible, headless=false is default for codegen)
        // Use absolute path and quote it to handle spaces
        const absoluteOutputFile = path.resolve(outputFile);
        const command = `npx playwright codegen "${message.url}" --target=typescript --output="${absoluteOutputFile}" --browser=${browser}`;
        
        console.log(`📝 Running: ${command}\n`);
        console.log(`📁 Output file will be: ${absoluteOutputFile}\n`);
        console.log('🌐 Browser will open on your local machine (visible mode)...');
        console.log('💡 RECOMMENDED: Interact with the page (click, type, navigate) to record actions');
        console.log('💡 If you don\'t interact, a minimal test file will be created automatically');
        console.log('💡 Then close the browser window to finish recording\n');

      this.currentProcess = exec(command, {
        cwd: process.cwd(),
        env: { ...process.env, DISPLAY: process.env.DISPLAY }
      });

      this.currentProcess.stdout?.on('data', (data: string) => {
        const output = data.toString();
        stdout += output;
        console.log(output);
      });

      this.currentProcess.stderr?.on('data', (data: string) => {
        const output = data.toString();
        stderr += output;
        console.error(output);
      });

      this.currentProcess.on('close', async (code: number) => {
        this.currentProcess = null;

        // Wait a bit for file to be written (codegen might exit before file is fully written)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if file exists (regardless of exit code)
        // Sometimes codegen exits with 0 even if no file was created
        // Use absolute path for checking
        const absoluteOutputFile = path.resolve(outputFile);
        if (fs.existsSync(absoluteOutputFile)) {
          const stats = fs.statSync(absoluteOutputFile);
          if (stats.size > 0) {
            console.log('\n✅ Recording completed successfully');
            console.log(`📁 Test file found: ${absoluteOutputFile} (${stats.size} bytes)`);
            this.sendStatus('idle', message.testId, 'Recording completed');

            // Upload test file to backend
            try {
              await this.uploadTestFile(message.testId, absoluteOutputFile);
              console.log('✅ Test file uploaded successfully');
            } catch (error: any) {
              console.error('❌ Failed to upload test file:', error.message);
              this.sendStatus('idle', message.testId, `Upload failed: ${error.message}`);
            }

            // Cleanup
            fs.rmSync(testDir, { recursive: true, force: true });
          } else {
            console.error(`\n❌ Recording failed: File exists but is empty`);
            console.error(`📁 File path: ${absoluteOutputFile}`);
            this.sendStatus('idle', message.testId, 'Recording failed: Empty file');
            // Cleanup empty file
            fs.rmSync(testDir, { recursive: true, force: true });
          }
        } else {
          // Playwright codegen didn't create a file (user didn't interact)
          // Create a minimal test file as fallback
          console.log(`\n⚠️  No actions recorded - creating minimal test file...`);
          console.log(`💡 Tip: Next time, interact with the page (click, type, navigate) to record actions`);
          
          const minimalTestContent = `import { test, expect } from '@playwright/test';

test('${message.testId}', async ({ page }) => {
  // Navigate to the page
  await page.goto('${message.url}');
  
  // TODO: Add your test actions here
  // Example:
  // await page.click('button');
  // await page.fill('input[name="email"]', 'test@example.com');
  // await expect(page.locator('h1')).toBeVisible();
});
`;

          try {
            // Ensure directory exists
            if (!fs.existsSync(testDir)) {
              fs.mkdirSync(testDir, { recursive: true });
            }
            
            // Create the minimal test file
            fs.writeFileSync(absoluteOutputFile, minimalTestContent, 'utf-8');
            
            // Verify file was created
            if (!fs.existsSync(absoluteOutputFile)) {
              throw new Error('File was not created after writeFileSync');
            }
            
            const stats = fs.statSync(absoluteOutputFile);
            console.log(`✅ Created minimal test file: ${absoluteOutputFile}`);
            console.log(`📝 File size: ${stats.size} bytes`);
            console.log(`📝 File contains basic structure - you can edit it later`);
            console.log(`📁 File location: ${absoluteOutputFile}`);
            
            this.sendStatus('idle', message.testId, 'Recording completed (minimal test)');

            // Upload test file to backend
            try {
              await this.uploadTestFile(message.testId, absoluteOutputFile);
              console.log('✅ Test file uploaded successfully');
            } catch (error: any) {
              console.error('❌ Failed to upload test file:', error.message);
              console.error(`📁 File still exists at: ${absoluteOutputFile}`);
              this.sendStatus('idle', message.testId, `Upload failed: ${error.message}`);
              // Don't cleanup if upload failed - keep file for debugging
              return;
            }

            // Wait a moment before cleanup so user can see the file
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Cleanup
            if (fs.existsSync(testDir)) {
              fs.rmSync(testDir, { recursive: true, force: true });
              console.log(`🧹 Cleaned up temporary directory: ${testDir}`);
            }
          } catch (error: any) {
            console.error(`\n❌ Failed to create fallback test file: ${error.message}`);
            console.error(`📁 Expected file not found: ${absoluteOutputFile}`);
            console.error(`📂 Checked directory: ${testDir}`);
            if (stdout) {
              console.error(`📤 stdout: ${stdout.substring(0, 500)}`);
            }
            if (stderr) {
              console.error(`📤 stderr: ${stderr.substring(0, 500)}`);
            }
            console.error(`💡 Tip: Make sure to interact with the page (click, type) before closing the browser window`);
            console.error(`💡 Playwright codegen only saves a file if you perform actions on the page`);
            this.sendStatus('idle', message.testId, 'Recording failed: No file created');
            // Cleanup empty directory
            if (fs.existsSync(testDir)) {
              fs.rmSync(testDir, { recursive: true, force: true });
            }
          }
        }

        this.currentTestId = null;
      });

    } catch (error) {
      console.error('Error during recording:', error);
      this.sendStatus('idle', message.testId, `Error: ${error}`);
      this.currentTestId = null;
    }
  }

  private async handleRunCommand(message: CommandRunMessage): Promise<void> {
    console.log(`\n▶️  Running test: ${message.testId}`);
    console.log(`   Mode: ${message.mode}\n`);

    this.currentTestId = message.testId;
    this.sendStatus('running', message.testId, 'Starting test execution...');

    try {
      // Download test file from backend
      const testFile = await this.downloadTestFile(message.testId);

      if (!testFile) {
        throw new Error('Failed to download test file');
      }

      // Run the test
      const headless = message.mode === 'headless';
      const command = headless 
        ? `npx playwright test ${testFile}`
        : `npx playwright test ${testFile} --headed`;

      console.log(`📝 Running: ${command}\n`);

      if (!headless) {
        console.log('🌐 Browser will open on your local machine (visible mode)...\n');
      } else {
        console.log('🔇 Running in headless mode...\n');
      }

      this.currentProcess = exec(command, {
        cwd: process.cwd(),
        env: { ...process.env, DISPLAY: process.env.DISPLAY }
      });

      this.currentProcess.stdout?.on('data', (data: string) => {
        console.log(data.toString());
      });

      this.currentProcess.stderr?.on('data', (data: string) => {
        console.error(data.toString());
      });

      this.currentProcess.on('close', async (code: number) => {
        this.currentProcess = null;

        if (code === 0) {
          console.log('\n✅ Test execution completed successfully');
          this.sendStatus('idle', message.testId, 'Test execution completed');
        } else {
          console.error(`\n❌ Test execution failed with code ${code}`);
          this.sendStatus('idle', message.testId, 'Test execution failed');
        }

        // Cleanup downloaded file
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }

        this.currentTestId = null;
      });

    } catch (error) {
      console.error('Error during test execution:', error);
      this.sendStatus('idle', message.testId, `Error: ${error}`);
      this.currentTestId = null;
    }
  }

  private async handleStopCommand(message: CommandStopMessage): Promise<void> {
    console.log(`\n⏹️  Stopping test: ${message.testId}`);

    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }

    this.sendStatus('idle', message.testId, 'Test stopped');
    this.currentTestId = null;
  }

  private sendStatus(status: 'idle' | 'recording' | 'running', testId: string | null, message?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const statusMessage: AgentStatusMessage = {
      type: 'agent:status',
      agentId: this.options.agentId,
      status,
      testId: testId || undefined,
      message
    };

    this.ws.send(JSON.stringify(statusMessage));
  }

  private async uploadTestFile(testId: string, filePath: string): Promise<void> {
    try {
      console.log(`📤 Uploading test file for ${testId}...`);

      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      const response = await axios.post(
        `${this.options.backendUrl}/api/tests/${testId}/upload`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${this.options.token}`
          }
        }
      );

      console.log('✅ Test file uploaded successfully');
    } catch (error: any) {
      console.error('Failed to upload test file:', error.message);
      throw error;
    }
  }

  private async downloadTestFile(testId: string): Promise<string> {
    try {
      console.log(`📥 Downloading test file for ${testId}...`);

      const response = await axios.get(
        `${this.options.backendUrl}/api/tests/${testId}/download`,
        {
          responseType: 'stream',
          headers: {
            'Authorization': `Bearer ${this.options.token}`
          }
        }
      );

      // Support configurable workspace path for Docker (via WORKSPACE_PATH env var)
      const workspaceRoot = process.env.WORKSPACE_PATH || process.cwd();
      const testDir = path.join(workspaceRoot, 'temp-tests', testId);
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const filePath = path.join(testDir, 'test.spec.ts');
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('✅ Test file downloaded');
          resolve(filePath);
        });
        writer.on('error', reject);
      });
    } catch (error: any) {
      console.error('Failed to download test file:', error.message);
      throw error;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.currentProcess) {
      this.currentProcess.kill();
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

