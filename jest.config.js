/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    workerIdleMemoryLimit: '512MB',
    roots: ['./src'],
};
