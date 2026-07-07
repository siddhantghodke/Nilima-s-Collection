import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PORT = 3001;

async function killPort() {
  try {
    if (process.platform === 'win32') {
      // Find PID on port
      const { stdout } = await execAsync(`netstat -ano | findstr :${PORT}`);
      const lines = stdout.split('\n').filter(line => line.includes(`:${PORT}`));
      
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
          pids.add(parseInt(pid, 10));
        }
      }
      
      for (const pid of pids) {
        console.log(`Killing process ${pid} on port ${PORT}...`);
        try {
          await execAsync(`taskkill /F /PID ${pid}`);
          console.log(`Successfully killed process ${pid}.`);
        } catch (err) {
          console.error(`Failed to kill process ${pid}:`, err.message);
        }
      }
    } else {
      // macOS/Linux
      const { stdout } = await execAsync(`lsof -t -i:${PORT}`);
      const pids = stdout.split('\n').filter(Boolean);
      for (const pid of pids) {
        console.log(`Killing process ${pid} on port ${PORT}...`);
        try {
          await execAsync(`kill -9 ${pid}`);
          console.log(`Successfully killed process ${pid}.`);
        } catch (err) {
          console.error(`Failed to kill process ${pid}:`, err.message);
        }
      }
    }
  } catch (err) {
    // If netstat or lsof fails, it usually means no process is listening on the port, which is fine
    console.log(`Port ${PORT} is free or no matching process found.`);
  }
}

killPort();
