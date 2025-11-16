#!/usr/bin/env node

// Helper script to generate JWT tokens for demo/testing

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Generate tokens for different use cases
const tokens = {
  user: jwt.sign(
    {
      sub: 'demo-user',
      scopes: ['accounts:read']
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  ),
  admin: jwt.sign(
    {
      sub: 'demo-admin',
      scopes: ['accounts:read', 'admin:simulate', 'admin:cache']
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
};

console.log('BunnyWallet Demo Tokens\n');
console.log('=======================\n');

console.log('User Token (accounts:read only):');
console.log(tokens.user);
console.log('\n');

console.log('Admin Token (all scopes):');
console.log(tokens.admin);
console.log('\n');

console.log('Usage:');
console.log('  export TOKEN="<token>"');
console.log('  curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/v1/accounts/BNK-001');
console.log('\n');
