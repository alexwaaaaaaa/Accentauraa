#!/bin/bash

# AI Microservice Test Runner
# This script runs the pytest test suite for the FastAPI AI microservice

set -e  # Exit on error

echo "=================================="
echo "AI Microservice Test Runner"
echo "=================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "main.py" ]; then
    echo "Error: main.py not found. Please run this script from the ai-microservice directory."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not installed."
    exit 1
fi

echo "Installing dependencies..."
pip3 install -r requirements.txt > /dev/null 2>&1
pip3 install -r requirements-dev.txt > /dev/null 2>&1
echo "✓ Dependencies installed"
echo ""

# Parse command line arguments
COVERAGE=false
VERBOSE=false
SPECIFIC_TEST=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --test|-t)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: ./run_tests.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -c, --coverage     Run tests with coverage report"
            echo "  -v, --verbose      Run tests with verbose output"
            echo "  -t, --test FILE    Run specific test file"
            echo "  -h, --help         Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run_tests.sh                          # Run all tests"
            echo "  ./run_tests.sh --coverage               # Run with coverage"
            echo "  ./run_tests.sh --verbose                # Run with verbose output"
            echo "  ./run_tests.sh --test test_chat.py      # Run specific test file"
            echo "  ./run_tests.sh -c -v                    # Run with coverage and verbose"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build pytest command
PYTEST_CMD="pytest"

if [ "$VERBOSE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -v"
fi

if [ "$COVERAGE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD --cov=. --cov-report=html --cov-report=term-missing"
fi

if [ -n "$SPECIFIC_TEST" ]; then
    PYTEST_CMD="$PYTEST_CMD tests/$SPECIFIC_TEST"
fi

# Run tests
echo "Running tests..."
echo "Command: $PYTEST_CMD"
echo ""

$PYTEST_CMD

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "=================================="
    echo "✓ All tests passed!"
    echo "=================================="
    
    if [ "$COVERAGE" = true ]; then
        echo ""
        echo "Coverage report generated:"
        echo "  - Terminal: See above"
        echo "  - HTML: Open htmlcov/index.html in your browser"
    fi
else
    echo ""
    echo "=================================="
    echo "✗ Some tests failed"
    echo "=================================="
    exit 1
fi
