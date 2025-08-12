/**
 * Type definitions for the configuration system
 */

export interface BotConfig {
  token: string;
  clientId: string;
  guildId: string;
  telegramToken: string;
  environment: string;
  prefix: string;
  ownerId: string;
}

export interface LoggingConfig {
  level: string;
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
  maxFileSize: number;
  maxFiles: number;
}

export interface WeatherAPIConfig {
  key: string;
  baseUrl: string;
  timeout: number;
}

export interface APIConfig {
  weather: WeatherAPIConfig;
}

export interface FeaturesConfig {
  weatherCommand: boolean;
  musicCommands: boolean;
  moderationCommands: boolean;
  funCommands: boolean;
  utilityCommands: boolean;
  telegramIntegration: boolean;
  qrCodeGeneration: boolean;
  currencyExchange: boolean;
}

export interface Config {
  bot: BotConfig;
  logging: LoggingConfig;
  apis: APIConfig;
  features: FeaturesConfig;
  isDevelopment(): boolean;
  isProduction(): boolean;
  validateRequiredEnvVars(): void;
}

// Default export type for the config instance
declare const config: Config;
export default config;
