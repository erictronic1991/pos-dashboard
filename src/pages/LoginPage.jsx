import { useState } from 'react';
import axios from 'axios';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:8000/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      onLogin();
    } catch (err) {
      alert('Login failed');
    }
  };

  const handleRegister = async () => {
  try {
    const res = await axios.post('http://localhost:8000/auth/register', { username, password });
    alert('Registration successful! You can now log in.');
  } catch (err) {
    const message = err.response?.data?.error || err.message || 'Unknown error';
    alert('Registration failed: ' + message);
  }
};


  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <div style={{ marginTop: '10px' }}>
        <button onClick={handleLogin}>Login</button>
        <button onClick={handleRegister} style={{ marginLeft: '10px' }}>Register</button>
      </div>
    </div>
  );
}
