import { useState, useEffect } from 'react';
import POSInterface from '../components/POSInterface';
import InventoryManager from '../components/InventoryManager';
import SalesReports from '../components/SalesReports';
import SalesAnalytics from '../components/SalesAnalytics';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('pos');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    setTimeout(() => setIsLoading(false), 800);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const tabs = [
    { 
      id: 'pos', 
      label: 'POS System', 
      icon: '🛒',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: 'Process sales & transactions'
    },
    { 
      id: 'inventory', 
      label: 'Inventory Management', 
      icon: '📦',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: 'Manage products & stock'
    },
    { 
      id: 'reports', 
      label: 'Transaction History', 
      icon: '📋',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: 'Sales & Creditor Logs'
    },
    { 
      id: 'analytics', 
      label: 'Sales Dashboard', 
      icon: '💹',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: 'Analytics & Insights'
    }
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'pos':
        return <POSInterface />;
      case 'inventory':
        return <InventoryManager />;
      case 'reports':
        return <SalesReports />;
      case 'analytics':
        return <SalesAnalytics />;
      default:
        return <POSInterface />;
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }}></div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
            🏪 POShi Loading...
          </h2>
          <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
            Setting up your sari-sari store dashboard
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <style jsx global>{`
        :root {
          --header-height: 80px;
          --nav-width: 80px; /* Fixed width for vertical nav on mobile */
        }

        @media (min-width: 768px) {
          :root {
            --nav-width: 200px; /* Wider nav on larger screens */
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          header {
            padding: 12px 16px !important;
          }
          main {
            padding: 8px !important;
          }
        }
      `}</style>

      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        flexShrink: 0,
        height: 'var(--header-height)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            fontSize: '32px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '8px',
            backdropFilter: 'blur(10px)'
          }}>
            🏪
          </div>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}>
              POShi
            </h1>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, fontWeight: '500', color: '#e5e7eb' }}>
              Sari-Sari Store Management System
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9, color: '#e5e7eb' }}>
              📅 {currentTime.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
              🕐 {currentTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 20px',
              background: '#ff6b6b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ff8787';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(255, 107, 107, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#ff6b6b';
              e.target.style.transform = 'translateY(0px)';
              e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
            }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: '1 1 auto', overflow: 'hidden' }}>
        <nav style={{
          background: '#ffffff',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid #e5e7eb',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
          position: 'sticky',
          top: 'var(--header-height)',
          marginTop: '-38px', // Added to move the nav upward
          zIndex: 999,
          zIndex: 999,
          width: 'var(--nav-width)',
          flexShrink: 0,
          overflow: 'auto'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '16px 8px',
                border: 'none',
                background: activeTab === tab.id ? tab.gradient : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#1f2937',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'center',
                borderBottom: '1px solid #e5e7eb',
                boxShadow: activeTab === tab.id ? 'inset 0 2px 6px rgba(0, 0, 0, 0.1)' : 'none',
                whiteSpace: 'normal', /* Allow text to wrap */
                overflow: 'visible' /* Prevent text cutoff */
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = '#f0f2f5';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '20px', marginBottom: '4px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
              <small style={{ fontSize: '10px', opacity: 0.7 }}>{tab.description}</small>
            </button>
          ))}
        </nav>

        <main style={{
          flex: '1 1 auto',
          overflow: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - var(--header-height))', /* Full height minus header */
          minHeight: 0,
          marginTop: '-20px'
        }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}