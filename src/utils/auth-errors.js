class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.exitCode = 3;
  }
}

module.exports = { AuthenticationError };
