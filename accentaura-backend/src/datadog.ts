/**
 * DataDog APM Initialization
 * 
 * This file MUST be imported before any other application code
 * to ensure proper instrumentation of all modules.
 * 
 * Usage in server.ts:
 * import './datadog'; // First import
 * import express from 'express'; // Then other imports
 */

import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (DATADOG_API_KEY) {
  try {
    const tracer = require('dd-trace');
    
    tracer.init({
      // Service identification
      service: 'accentaura-backend',
      env: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      
      // Enable runtime metrics collection
      runtimeMetrics: true,
      
      // Enable profiling in production
      profiling: NODE_ENV === 'production',
      
      // Sampling configuration
      sampleRate: NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Log injection for correlation between logs and traces
      logInjection: true,
      
      // Additional tags
      tags: {
        'service.name': 'accentaura-backend',
        'service.version': process.env.npm_package_version || '1.0.0',
        'deployment.environment': NODE_ENV,
      },
      
      // Plugin configuration
      plugins: true, // Auto-instrument supported libraries
      
      // Hostname reporting
      reportHostname: true,
    });
    
    console.log('✅ DataDog APM initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize DataDog APM:', error);
  }
} else {
  console.log('ℹ️  DataDog API key not configured - skipping DataDog APM initialization');
}

// Export tracer for manual instrumentation if needed
export const tracer = DATADOG_API_KEY ? require('dd-trace') : null;
