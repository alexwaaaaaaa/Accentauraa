"""Quick test for confidence analysis endpoint"""
import sys
sys.path.insert(0, '.')

# Test import
try:
    from main import app
    print('✅ Main module imports successfully')
except Exception as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)

# Check if confidence endpoint exists
from fastapi.testclient import TestClient
client = TestClient(app)

# Test the endpoint
print('\nTesting confidence analysis endpoint...')
response = client.post(
    '/analyze/confidence',
    json={'text': 'I think maybe this could work.'}
)

print(f'Status code: {response.status_code}')
if response.status_code == 200:
    print('✅ Endpoint returns 200 OK')
    result = response.json()
    print(f'Confidence: {result.get("confidence")}')
    print(f'Suggestions count: {len(result.get("suggestions", []))}')
    print('\nSuggestions:')
    for i, suggestion in enumerate(result.get("suggestions", []), 1):
        print(f'  {i}. {suggestion}')
elif response.status_code == 500:
    print('⚠️  Endpoint exists but returned 500 (may need Gemini API)')
    print(f'Response: {response.json()}')
else:
    print(f'❌ Unexpected status code: {response.status_code}')
    print(f'Response: {response.text}')

# Test empty text validation
print('\n--- Testing empty text validation ---')
response = client.post(
    '/analyze/confidence',
    json={'text': ''}
)
print(f'Status code: {response.status_code}')
if response.status_code == 400:
    print('✅ Correctly rejects empty text')
else:
    print(f'❌ Expected 400, got {response.status_code}')

# Test long text validation
print('\n--- Testing long text validation ---')
long_text = 'This is a test. ' * 400  # ~6400 characters
response = client.post(
    '/analyze/confidence',
    json={'text': long_text}
)
print(f'Status code: {response.status_code}')
if response.status_code == 400:
    print('✅ Correctly rejects text that is too long')
else:
    print(f'❌ Expected 400, got {response.status_code}')

print('\n✅ All tests completed!')
