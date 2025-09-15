import fs from 'fs';
import path from 'path';

class Logger {
  constructor() {
    this.logDir = './logs';
    this.logFile = path.join(this.logDir, 'automation.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxBackups = 5;
    
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  rotateLog() {
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        
        if (stats.size > this.maxLogSize) {
          // Rotate existing logs
          for (let i = this.maxBackups - 1; i >= 1; i--) {
            const oldFile = `${this.logFile}.${i}`;
            const newFile = `${this.logFile}.${i + 1}`;
            
            if (fs.existsSync(oldFile)) {
              if (i === this.maxBackups - 1) {
                fs.unlinkSync(oldFile);
              } else {
                fs.renameSync(oldFile, newFile);
              }
            }
          }
          
          // Move current log to .1
          fs.renameSync(this.logFile, `${this.logFile}.1`);
        }
      }
    } catch (error) {
      console.error('Error rotating log:', error.message);
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    
    return JSON.stringify(logEntry) + '\n';
  }

  writeLog(level, message, data = null) {
    try {
      this.rotateLog();
      
      const logMessage = this.formatMessage(level, message, data);
      
      // Write to file
      fs.appendFileSync(this.logFile, logMessage);
      
      // Also log to console with colors
      const colorCodes = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m',  // Yellow
        INFO: '\x1b[32m',  // Green
        DEBUG: '\x1b[36m', // Cyan
        RESET: '\x1b[0m'
      };
      
      const color = colorCodes[level] || colorCodes.INFO;
      console.log(`${color}[${level}]${colorCodes.RESET} ${message}`);
      
      if (data) {
        console.log(data);
      }
      
    } catch (error) {
      console.error('Logging error:', error.message);
    }
  }

  error(message, data = null) {
    this.writeLog('ERROR', message, data);
  }

  warn(message, data = null) {
    this.writeLog('WARN', message, data);
  }

  info(message, data = null) {
    this.writeLog('INFO', message, data);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV !== 'production') {
      this.writeLog('DEBUG', message, data);
    }
  }

  getRecentLogs(lines = 100) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.trim().split('\n');
      
      return logLines
        .slice(-lines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, timestamp: new Date().toISOString() };
          }
        });
    } catch (error) {
      console.error('Error reading logs:', error.message);
      return [];
    }
  }
}

// Singleton instance
const logger = new Logger();

export default logger;