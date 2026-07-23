#!/bin/bash
echo "🧃⚡ CHAOS COMMAND CENTER STARTUP ⚡🧃"
echo ""
echo "Starting Flask backend..."

# Start Flask in background
cd backend
python app.py &
FLASK_PID=$!
cd ..

echo "Waiting for backend to start..."
sleep 3

echo "Starting React frontend..."
npm run dev &
REACT_PID=$!

echo ""
echo "🎯 READY TO TEST! 🎯"
echo ""
echo "Flask Backend: http://localhost:5000"
echo "React Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
trap "kill $FLASK_PID $REACT_PID; exit" INT
wait
