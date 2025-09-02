import { isDebugEnabled, type AppConfig } from "@/config";
import { apiService, type ApiService } from "@/services/api";

// Define the services available throughout the application
export interface Services {
  apiService: ApiService;
}

// Define logging service for debug purposes
interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

const logger = (config: AppConfig): Logger => {
  const debugEnabled = isDebugEnabled(config);

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (debugEnabled) {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(`[INFO] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`[WARN] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`[ERROR] ${message}`, ...args);
    },
  };
};

// Create all services with their dependencies
const createServices = ({ config }: { config: AppConfig }): Services => {
  const loggerService = logger(config);

  loggerService.debug("Initializing services with configuration:", config);

  // Create API service with configuration dependency
  const api = apiService({ config });

  loggerService.info("All services initialized successfully");

  return {
    apiService: api,
  };
};

export { createServices };
