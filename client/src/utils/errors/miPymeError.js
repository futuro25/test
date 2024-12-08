export default class MiPymeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MiPymeError';
  }
}