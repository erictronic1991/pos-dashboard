import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    // Check if token exists in localStorage
    return !!localStorage.getItem('token');
  });

  return (
    <div style={{ padding: '20px' }}>
      {loggedIn ? (
        <DashboardPage />
      ) : (
        <LoginPage onLogin={() => setLoggedIn(true)} />
      )}
    </div>
  );
}

export default App;
