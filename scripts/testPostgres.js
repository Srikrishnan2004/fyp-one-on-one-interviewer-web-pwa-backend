#!/usr/bin/env node

import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fyp_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password_here',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

console.log('🔍 Testing PostgreSQL Connection...');
console.log('📋 Configuration:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Password: ${dbConfig.password ? '***' : 'NOT SET'}`);
console.log('');

// Create connection pool
const pool = new Pool(dbConfig);

async function testConnection() {
  let client;
  
  try {
    console.log('🔄 Attempting to connect to PostgreSQL...');
    
    // Test basic connection
    client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test database version
    const versionResult = await client.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', versionResult.rows[0].version.split(' ')[0]);
    
    // Test database name
    const dbNameResult = await client.query('SELECT current_database()');
    console.log('🗄️  Current Database:', dbNameResult.rows[0].current_database);
    
    // Test user
    const userResult = await client.query('SELECT current_user');
    console.log('👤 Current User:', userResult.rows[0].current_user);
    
    // Test if our tables exist
    console.log('\n🔍 Checking for application tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'sessions', 'conversations', 'performance')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ Found application tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  No application tables found. Run database_setup.sql to create them.');
    }
    
    // Test table counts
    console.log('\n📊 Table Record Counts:');
    for (const table of ['users', 'sessions', 'conversations', 'performance']) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ${table}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`   ${table}: Table does not exist`);
      }
    }
    
    // Test connection pool
    console.log('\n🏊 Testing connection pool...');
    console.log(`   Total connections: ${pool.totalCount}`);
    console.log(`   Idle connections: ${pool.idleCount}`);
    console.log(`   Waiting connections: ${pool.waitingCount}`);
    
    console.log('\n✅ PostgreSQL connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ PostgreSQL connection failed:');
    console.error('   Error:', error.message);
    
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Make sure PostgreSQL is running');
      console.error('   - Check if the host and port are correct');
      console.error('   - Verify firewall settings');
    } else if (error.code === '28P01') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check username and password');
      console.error('   - Verify user has access to the database');
    } else if (error.code === '3D000') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Database does not exist');
      console.error('   - Create the database first: CREATE DATABASE virtual_interviewer_db;');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check hostname/IP address');
      console.error('   - Verify network connectivity');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function testEnvironmentVariables() {
  console.log('🔧 Checking environment variables...');
  
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('⚠️  Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Create a .env file based on env.example');
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  console.log('');
}

async function runTests() {
  console.log('🚀 PostgreSQL Connection Test Script');
  console.log('=====================================\n');
  
  await testEnvironmentVariables();
  await testConnection();
  
  // Close the pool
  await pool.end();
  console.log('\n🔌 Connection pool closed');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await pool.end();
  process.exit(0);
});

// Run the tests
runTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
