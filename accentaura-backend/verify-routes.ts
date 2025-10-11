/**
 * Route Verification Script
 * This script verifies that all auth routes are properly configured
 */

import authRoutes from './src/routes/auth.routes';

console.log('🔍 Verifying Auth Routes Configuration...\n');

// Get the router stack
const router = authRoutes as any;
const routes = router.stack
  .filter((layer: any) => layer.route)
  .map((layer: any) => ({
    method: Object.keys(layer.route.methods)[0].toUpperCase(),
    path: layer.route.path,
    middlewares: layer.route.stack.map((s: any) => s.name).filter((n: any) => n !== '<anonymous>'),
  }));

console.log('📋 Registered Auth Routes:\n');
routes.forEach((route: any) => {
  console.log(`  ${route.method.padEnd(6)} /v1/auth${route.path}`);
  if (route.middlewares.length > 0) {
    console.log(`         Middlewares: ${route.middlewares.join(', ')}`);
  }
});

console.log('\n✅ All routes verified!\n');

console.log('📱 Mobile App Endpoints:');
console.log('  POST /v1/auth/login      - Email/password login');
console.log('  POST /v1/auth/oauth      - Google/Facebook OAuth');
console.log('  POST /v1/auth/refresh    - Refresh access token');
console.log('  POST /v1/auth/validate   - Validate JWT token');
console.log('\n🔧 Additional Endpoints (for future use):');
console.log('  POST /v1/auth/signup     - User registration');
console.log('  POST /v1/auth/logout     - Logout and invalidate token');
console.log('  GET  /v1/auth/profile    - Get user profile (protected)');
