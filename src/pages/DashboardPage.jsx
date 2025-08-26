import { useState } from 'react';
import POSInterface from '../components/POSInterface';
import InventoryManager from '../components/InventoryManager';
import SalesReports from '../components/SalesReports';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('pos');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const tabs = [
    { id: 'pos', label: 'POS System', icon: '🛒' },
    { id: 'inventory', label: 'Inventory Management', icon: '📦' },
    { id: 'reports', label: 'Sales Reports', icon: '📊' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'pos':
        return <POSInterface />;
      case 'inventory':
        return <InventoryManager />;
      case 'reports':
        return <SalesReports />;
      default:
        return <POSInterface />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#007bff',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>
          🏪 POShi AI - Sari-Sari Store POS
        </h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6',
        padding: '0 20px'
      }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '15px 20px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ marginRight: '8px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: '0' }}>
        {renderContent()}
      </div>
    </div>
  );
}
