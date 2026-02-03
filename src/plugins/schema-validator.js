/**
 * Schema Validator using ajv
 * Provides JSON Schema validation for plugin configurations
 *
 * @class SchemaValidator
 */

const Ajv = require('ajv');

/**
 * Schema Validator class
 * Provides methods to create validators, validate data, and format errors
 */
class SchemaValidator {
  /**
   * Create a validator function from a JSON Schema
   * @param {Object} schema - JSON Schema object (Draft 7)
   * @returns {Function} Validator function that returns boolean
   * @throws {Error} If schema is invalid
   *
   * @example
   * const schema = { type: 'object', properties: { name: { type: 'string' } } };
   * const validate = SchemaValidator.createValidator(schema);
   */
  static createValidator(schema) {
    const ajv = new Ajv();
    return ajv.compile(schema);
  }

  /**
   * Validate data using a validator function
   * @param {Object} data - Data to validate
   * @param {Function} validate - Validator function from createValidator
   * @returns {Object} Validation result { valid: boolean, errors?: Array<Object> }
   *
   * @example
   * const result = SchemaValidator.validate(data, validate);
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors);
   * }
   */
  static validate(data, validate) {
    const valid = validate(data);
    if (valid) {
      return { valid: true };
    }
    return { valid: false, errors: validate.errors };
  }

  /**
   * Format validation errors into a readable message
   * @param {Array<Object>} errors - ajv error array
   * @returns {string} Formatted error message, empty string if no errors
   *
   * @example
   * const message = SchemaValidator.formatErrors(result.errors);
   * // Returns: "/name: must be string; /age: must be >= 0"
   */
  static formatErrors(errors) {
    if (!errors || errors.length === 0) {
      return '';
    }

    return errors
      .map(err => {
        const path = err.instancePath || 'root';
        return `${path}: ${err.message}`;
      })
      .join('; ');
  }
}

module.exports = SchemaValidator;