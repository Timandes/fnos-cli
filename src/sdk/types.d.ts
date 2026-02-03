/**
 * TypeScript Type Definitions for fnos-cli Plugin SDK
 */

/**
 * Plugin Definition Interface
 */
export interface PluginDefinition {
  /** Plugin unique identifier */
  name: string;
  /** Plugin version (semantic versioning) */
  version: string;
  /** Plugin description */
  description: string;
  /** JSON Schema for plugin configuration validation */
  schema: JSONSchema7;
  /** Plugin initialization function */
  init: (config: any, deps: PluginDeps) => Promise<Commands>;
}

/**
 * Command Configuration Interface
 */
export interface CommandConfig {
  /** Command description */
  description: string;
  /** Command action handler */
  action: (options: CommandOptions) => Promise<any>;
  /** Command parameters */
  params?: CommandParam[];
}

/**
 * Command Parameter Interface
 */
export interface CommandParam {
  /** Parameter name */
  name: string;
  /** Whether parameter is required */
  required?: boolean;
  /** Parameter description */
  description?: string;
  /** Custom option format (e.g., "--custom-name <value>") */
  option?: string;
}

/**
 * Plugin Dependencies Interface
 */
export interface PluginDeps {
  /** Winston logger instance */
  logger: any;
  /** Settings instance */
  settings: any;
  /** Readonly authentication credentials or null */
  auth: Readonly<AuthCredentials> | null;
  /** Function to get SDK instance */
  getSDKInstance: (client: any, className: string) => any;
}

/**
 * Command Options Interface
 */
export interface CommandOptions {
  [key: string]: any;
  /** Output raw JSON */
  raw?: boolean;
  /** Verbose output (info level) */
  verbose?: boolean;
  /** Debug output (debug level) */
  debug?: boolean;
  /** Silly output (silly level) */
  silly?: boolean;
  /** Authentication credentials */
  credentials?: AuthCredentials;
}

/**
 * Authentication Credentials Interface
 */
export interface AuthCredentials {
  /** Server endpoint */
  endpoint: string;
  /** Username */
  username: string;
  /** Password */
  password: string;
  /** Token */
  token: string;
  /** Long token */
  longToken: string;
  /** Secret */
  secret: string;
}

/**
 * Commands Interface
 */
export interface Commands {
  [commandName: string]: CommandConfig;
}

/**
 * JSON Schema Draft 7 (simplified)
 */
export interface JSONSchema7 {
  type?: string | string[];
  properties?: Record<string, JSONSchema7>;
  required?: string[];
  items?: JSONSchema7;
  additionalProperties?: boolean | JSONSchema7;
  minimum?: number;
  maximum?: number;
  enum?: any[];
  const?: any;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  format?: string;
  default?: any;
  description?: string;
  title?: string;
  $schema?: string;
  $id?: string;
  definitions?: Record<string, JSONSchema7>;
}

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors (if invalid) */
  errors?: Array<any>;
}