/**
 * Tests for SchemaValidator class
 */

const { expect } = require('chai');
const SchemaValidator = require('../../src/plugins/schema-validator');

describe('SchemaValidator', () => {
  describe('createValidator', () => {
    it('creates a validator function from a JSON Schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const validator = SchemaValidator.createValidator(schema);

      expect(validator).to.be.a('function');
    });
  });

  describe('validate', () => {
    it('returns valid=true for data matching the schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };
      const data = { name: 'test' };

      const validator = SchemaValidator.createValidator(schema);
      const result = SchemaValidator.validate(data, validator);

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.undefined;
    });

    it('returns valid=false with errors for data not matching the schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };
      const data = { name: 123 }; // Invalid: should be string

      const validator = SchemaValidator.createValidator(schema);
      const result = SchemaValidator.validate(data, validator);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array');
      expect(result.errors.length).to.be.greaterThan(0);
    });

    it('validates required fields', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        required: ['name']
      };
      const data = {}; // Missing required field

      const validator = SchemaValidator.createValidator(schema);
      const result = SchemaValidator.validate(data, validator);

      expect(result.valid).to.be.false;
      expect(result.errors).to.be.an('array');
      expect(result.errors.length).to.be.greaterThan(0);
    });
  });

  describe('formatErrors', () => {
    it('formats validation errors into a readable message', () => {
      const errors = [
        {
          instancePath: '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string'
        }
      ];

      const formatted = SchemaValidator.formatErrors(errors);

      expect(formatted).to.be.a('string');
      expect(formatted).to.include('name');
    });

    it('handles multiple errors', () => {
      const errors = [
        {
          instancePath: '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string'
        },
        {
          instancePath: '/age',
          schemaPath: '#/properties/age/minimum',
          keyword: 'minimum',
          params: { minimum: 0 },
          message: 'must be >= 0'
        }
      ];

      const formatted = SchemaValidator.formatErrors(errors);

      expect(formatted).to.be.a('string');
      expect(formatted).to.include('name');
      expect(formatted).to.include('age');
    });

    it('returns empty string for no errors', () => {
      const formatted = SchemaValidator.formatErrors([]);

      expect(formatted).to.equal('');
    });
  });
});