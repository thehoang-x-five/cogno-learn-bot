import { useState, useEffect } from 'react';

export default function ChatPageSimple() {
  const [message, setMessage] = useState('Chat page loaded!');

  useEffect(() => {
    console.log('ChatPageSimple mounted');
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chat AI (Simple Test)</h1>
      <p>{message}</p>
      <button 
        onClick={() => setMessage('Button clicked!')}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test Button
      </button>
    </div>
  );
}
