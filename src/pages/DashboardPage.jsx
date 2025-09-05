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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    setTimeout(() => setIsLoading(false), 800);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  // Responsive breakpoints
  const isMobile = screenSize.width <= 640;
  const isTablet = screenSize.width <= 768 && screenSize.width > 640;
  const isSmallLaptop = screenSize.width <= 1024 && screenSize.width > 768;
  const isShortScreen = screenSize.height <= 600;

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

  // Dynamic header height based on screen size
  const getHeaderHeight = () => {
    if (isMobile) return '50px';
    if (isTablet || isShortScreen) return '55px';
    return '60px';
  };

  // Dynamic nav width based on screen size
  const getNavWidth = () => {
    if (isMobile) return '0px';
    if (isTablet) return '70px';
    if (isSmallLaptop) return '75px';
    return '85px';
  };

  // Dynamic nav button sizing
  const getNavButtonSize = () => {
    const baseHeight = isShortScreen ? 'auto' : 'auto';
    const padding = isMobile ? '8px 4px' : isTablet ? '10px 4px' : '12px 6px';
    const minHeight = isShortScreen ? '50px' : isTablet ? '65px' : '75px';
    
    return {
      padding,
      minHeight,
      height: baseHeight
    };
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
          color: 'white',
          padding: '20px'
        }}>
          <div style={{
            width: isMobile ? '50px' : '60px',
            height: isMobile ? '50px' : '60px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }}></div>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            fontSize: isMobile ? '20px' : '24px', 
            fontWeight: 'bold' 
          }}>
            🏪 POShi Loading...
          </h2>
          <p style={{ 
            margin: 0, 
            fontSize: isMobile ? '14px' : '16px', 
            opacity: 0.9 
          }}>
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

        /* Mobile navigation styles */
        .mobile-nav-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
          display: ${isMobile && isMobileMenuOpen ? 'block' : 'none'};
        }

        .mobile-nav-menu {
          position: fixed;
          top: ${getHeaderHeight()};
          left: ${isMobileMenuOpen ? '0' : '-280px'};
          width: 280px;
          max-width: 80vw;
          height: calc(100vh - ${getHeaderHeight()});
          background: white;
          z-index: 10000;
          transition: left 0.3s ease;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          overflow-y: auto;
        }

        /* Smooth transitions for responsive changes */
        nav, main, header {
          transition: all 0.3s ease;
        }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff',
        padding: isMobile ? '8px 12px' : '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        flexShrink: 0,
        height: getHeaderHeight(),
        minHeight: getHeaderHeight()
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ☰
            </button>
          )}
          
          <div style={{
            fontSize: isMobile ? '18px' : '24px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '4px',
            backdropFilter: 'blur(10px)'
          }}>
            🏪
          </div>
          <div>
            <h1 style={{ 
              margin: '0', 
              fontSize: isMobile ? '14px' : isTablet ? '16px' : '20px', 
              fontWeight: 'bold', 
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' 
            }}>
              POShi
            </h1>
            {!isMobile && (
              <p style={{ 
                margin: 0, 
                fontSize: isTablet ? '10px' : '11px', 
                opacity: 0.9, 
                fontWeight: '500', 
                color: '#e5e7eb'
              }}>
                Sari-Sari Store System
              </p>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px' }}>
          <div style={{ 
            textAlign: 'right', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1px' 
          }}>
            <div style={{ 
              fontSize: isMobile ? '8px' : '9px', 
              fontWeight: '600', 
              opacity: 0.9, 
              color: '#e5e7eb',
              display: isMobile && screenSize.width < 400 ? 'none' : 'block'
            }}>
              {currentTime.toLocaleDateString('en-PH', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
            <div style={{ 
              fontSize: isMobile ? '10px' : '11px', 
              fontWeight: 'bold', 
              color: '#ffffff' 
            }}>
              {currentTime.toLocaleTimeString('en-PH', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: isMobile ? '4px 8px' : '6px 12px',
              background: '#ff6b6b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '10px' : '11px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              minHeight: isMobile ? '28px' : '32px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ff8787';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#ff6b6b';
            }}
          >
            {isMobile && screenSize.width < 400 ? '🚪' : 'Logout'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <div 
        className="mobile-nav-overlay"
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Mobile Navigation Menu */}
      <div className="mobile-nav-menu">
        <div style={{ padding: '16px 0' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '16px 20px',
                border: 'none',
                background: activeTab === tab.id ? tab.gradient : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#1f2937',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                transition: 'all 0.3s ease',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '24px' }}>{tab.icon}</span>
              <div>
                <div>{tab.label}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{tab.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        flex: '1', 
        overflow: 'hidden', 
        height: `calc(100vh - ${getHeaderHeight()})` 
      }}>
        {/* Desktop Navigation - hidden on mobile */}
        {!isMobile && (
          <nav style={{
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            boxShadow: '2px 0 4px rgba(0, 0, 0, 0.05)',
            width: getNavWidth(),
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowY: 'auto'
            }}>
              {tabs.map((tab, index) => {
                const buttonSize = getNavButtonSize();
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      ...buttonSize,
                      border: 'none',
                      background: activeTab === tab.id ? tab.gradient : 'transparent',
                      color: activeTab === tab.id ? '#ffffff' : '#1f2937',
                      cursor: 'pointer',
                      fontSize: isTablet ? '9px' : '11px',
                      fontWeight: activeTab === tab.id ? '600' : '500',
                      transition: 'all 0.3s ease',
                      textAlign: 'center',
                      borderBottom: index < tabs.length - 1 ? '1px solid #e5e7eb' : 'none',
                      flex: isShortScreen ? '0 0 auto' : '1 1 0'
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
                    <span style={{ 
                      fontSize: isTablet ? '16px' : '18px', 
                      marginBottom: '4px',
                      lineHeight: '1'
                    }}>
                      {tab.icon}
                    </span>
                    <span style={{ 
                      lineHeight: '1.2',
                      marginBottom: '2px'
                    }}>
                      {tab.label}
                    </span>
                    {!isTablet && !isShortScreen && (
                      <small style={{ 
                        fontSize: '8px', 
                        opacity: 0.7, 
                        lineHeight: '1'
                      }}>
                        {tab.description}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <main style={{
          flex: '1',
          overflow: 'hidden',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: '#f8f9fa',
          width: isMobile ? '100%' : `calc(100% - ${getNavWidth()})`
        }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}