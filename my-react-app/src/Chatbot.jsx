import React, { useState } from 'react';
import axios from 'axios';
import './ChatBot.css';

function ChatBot() {
  const [messages, setMessages] = useState([
    { text: 'Hello! Please provide me a CSV file of your expenses so I can help you', user: false }
  ]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const sendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage = { text: input, user: true };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');

    try {
      const response = await axios.post('http://localhost:3001/chat', { message: input });
      const botMessage = { text: response.data.response, user: false };
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      const errorMessage = { text: 'Sorry, there was an error. Please try again.', user: false };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);

    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('http://localhost:3001/upload-csv', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        const botMessage = { text: response.data.response, user: false };
        setMessages(prevMessages => [...prevMessages, botMessage]);
      } catch (error) {
        const errorMessage = { text: 'Sorry, there was an error processing the file. Please try again.', user: false };
        setMessages(prevMessages => [...prevMessages, errorMessage]);
      }
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`chat-container ${darkMode ? 'dark' : ''}`}>
      <div className="chat-header">
        <span>ChatBot</span>
        <button onClick={toggleDarkMode}>
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={message.user ? 'user-message' : 'bot-message'}>
            {message.text}
          </div>
        ))}
      </div>
      <div className={`chat-input ${darkMode ? 'dark' : ''}`}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message here..."
        />
        <button onClick={sendMessage}>Send</button>
        <input type="file" accept=".csv" onChange={handleFileUpload} />
      </div>
    </div>
  );
}

export default ChatBot;
