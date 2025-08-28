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
            🏪 POShi AI Loading...
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
      height: '100%',
      overflow: 'hidden'
    }}>
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
        flexShrink: 0
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
              POShi AI
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

      <nav style={{
        background: '#ffffff',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: '80px',
        zIndex: 999,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 24px',
                border: 'none',
                background: activeTab === tab.id ? tab.gradient : '#f9fafb',
                color: activeTab === tab.id ? '#ffffff' : '#1f2937',
                cursor: 'pointer',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                minWidth: '160px',
                textAlign: 'center',
                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = '#e5e7eb';
                  e.target.style.color = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = '#f9fafb';
                  e.target.style.color = '#1f2937';
                }
              }}
            >
              <div style={{ fontSize: '20px' }}>{tab.icon}</div>
              <div>{tab.label}</div>
              {activeTab === tab.id && (
                <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: '400' }}>
                  {tab.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ 
        flex: 1,
        padding: '16px',
        width: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}>
          <div style={{
            background: currentTab.gradient,
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '16px',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                fontSize: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                {currentTab.icon}
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 'bold' }}>
                  {currentTab.label}
                </h2>
                <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
                  {currentTab.description}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            overflow: 'auto',
            height: '100%',
            width: '100%'
          }}>
            {renderContent()}
          </div>
        </div>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          nav div {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          nav button {
            min-width: auto !important;
            padding: 12px 16px !important;
          }
          
          header {
            flex-direction: column !important;
            gap: 16px !important;
            text-align: center !important;
          }
          
          header > div:first-child {
            justify-content: center !important;
          }
        }
        
        @media (max-width: 480px) {
          main {
            padding: 8px !important;
          }
          
          nav {
            padding: 0 8px !important;
          }
          
          header {
            padding: 12px 16px !important;
          }
        }
        
        .pos-interface,
        .inventory-manager,
        .sales-reports {
          width: 100% !important;
          max-width: none !important;
          overflow-x: auto !important;
          margin: 0 !important;
        }
        
        table {
          width: 100% !important;
          max-width: none !important;
        }
      `}</style>
    </div>
  );
}