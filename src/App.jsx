import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import './App.css'; // Create and import a CSS file for styles

function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    // Check if token exists in localStorage
    return !!localStorage.getItem('token');
  });

  return (
    <div className="app-container">
      {loggedIn ? (
        <DashboardPage />
      ) : (
        <LoginPage onLogin={() => setLoggedIn(true)} />
      )}
    </div>
  );
}

export default App;