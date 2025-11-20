// ./backend/prismaClient.js
const { PrismaClient } = require('@prisma/client');

const prismaSingleton = () => {
  if (!global.__PRISMA_CLIENT__) {
    global.__PRISMA_CLIENT__ = new PrismaClient();
  }
  return global.__PRISMA_CLIENT__;
};

module.exports = prismaSingleton();
module.exports.getPrismaClient = prismaSingleton;
