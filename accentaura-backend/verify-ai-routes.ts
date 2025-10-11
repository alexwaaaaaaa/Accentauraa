/**
 * AI Routes Verification Script
 * 
 * This script verifies that the AI routes are properly configured and accessible.
 * Run with: npx ts-node verify-ai-routes.ts
 */

import express from 'express';
import aiRoutes from './src/routes/ai.routes';

const app = express();

// Middleware
app.use(express.json());

// Mount AI routes
app.use('/v1/ai', aiRoutes);

// Get all registered routes
function getRoutes(app: express.Application) {
  const routes: { method: string; path: string }[] = [];
  
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // Routes registered directly on the app
      const methods = Object.keys(middleware.route.methods);
      methods.forEach(method => {
        routes.push({
          method: method.toUpperCase(),
          path: middleware.route.path
        });
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods);
          methods.forEach(method => {
            const basePath = middleware.regexp.source
              .replace('\\/?', '')
              .replace('(?=\\/|$)', '')
              .replace(/\\\//g, '/')
              .replace('^', '');
            
            routes.push({
              method: method.toUpperCase(),
              path: basePath + handler.route.path
            });
          });
        }
      });
    }
  });
  
  return routes;
}

// Verify routes
console.log('🔍 Verifying AI Routes...\n');

const routes = getRoutes(app);
const aiRoutesList = routes.filter(r => r.path.includes('/v1/ai'));

console.log('✅ Registered AI Routes:');
aiRoutesList.forEach(route => {
  console.log(`   ${route.method.padEnd(6)} ${route.path}`);
});

console.log('\n📋 Expected Routes:');
const expectedRoutes = [
  { method: 'POST', path: '/v1/ai/chat' },
  { method: 'POST', path: '/v1/ai/analyze-speech' },
  { method: 'POST', path: '/v1/ai/confidence-score' },
];

expectedRoutes.forEach(route => {
  const found = aiRoutesList.some(
    r => r.method === route.method && r.path === route.path
  );
  const status = found ? '✅' : '❌';
  console.log(`   ${status} ${route.method.padEnd(6)} ${route.path}`);
});

// Check if all expected routes are registered
const allFound = expectedRoutes.every(expected =>
  aiRoutesList.some(
    r => r.method === expected.method && r.path === expected.path
  )
);

console.log('\n' + '='.repeat(50));
if (allFound) {
  console.log('✅ All AI routes are properly registered!');
  console.log('='.repeat(50));
  process.exit(0);
} else {
  console.log('❌ Some AI routes are missing!');
  console.log('='.repeat(50));
  process.exit(1);
}
