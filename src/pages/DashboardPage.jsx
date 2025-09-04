import React from 'react';
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
      label: 'POS', 
      icon: '🛒',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      description: 'Sales'
    },
    { 
      id: 'inventory', 
      label: 'Inventory', 
      icon: '📦',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      description: 'Stock'
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: '📋',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      description: 'History'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: '💹',
      gradient: 'linear-gradient(135deg, #8ffe4fff 0%, #c7f0b0ff 100%)',
      description: 'Insights'
    }
  ];

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
          --header-height: 60px;
          --nav-width: 80px;
        }

        @media (max-width: 1366px) {
          :root {
            --header-height: 50px;
            --nav-width: 120px;
          }
        }

        @media (max-width: 768px) {
          :root {
            --header-height: 45px;
            --nav-width: 80px;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>

      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        flexShrink: 0,
        height: 'var(--header-height)',
        minHeight: 'var(--header-height)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: '24px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '4px',
            backdropFilter: 'blur(10px)'
          }}>
            🏪
          </div>
          <div>
            <h1 style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
              POShi
            </h1>
            <p style={{ margin: 0, fontSize: '11px', opacity: 0.9, fontWeight: '500', color: '#e5e7eb' }}>
              Sari-Sari Store System
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', opacity: 0.9, color: '#e5e7eb' }}>
              {currentTime.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>
              {currentTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              background: '#ff6b6b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              minHeight: '32px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ff8787';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#ff6b6b';
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: '1', overflow: 'hidden', height: 'calc(100vh - var(--header-height))' }}>
        <nav style={{
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          boxShadow: '2px 0 4px rgba(0, 0, 0, 0.05)',
          width: 'var(--nav-width)',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
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
                padding: '12px 6px',
                border: 'none',
                background: activeTab === tab.id ? tab.gradient : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#1f2937',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                borderBottom: '1px solid #e5e7eb',
                minHeight: '70px',
                flex: '1'
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
              <span style={{ fontSize: '18px', marginBottom: '4px' }}>{tab.icon}</span>
              <span style={{ lineHeight: '1.2' }}>{tab.label}</span>
              <small style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>{tab.description}</small>
            </button>
          ))}
        </nav>

        <main style={{
          flex: '1',
          overflow: 'hidden',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: '#f8f9fa'
        }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}