import { useState, useEffect } from 'react';
import axios from 'axios';

const SalesReports = () => {
  const [sales, setSales] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedPeriod, setSelectedPeriod] = useState('7');
  const [totalSales, setTotalSales] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [salesDetails, setSalesDetails] = useState([]);


  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    loadSales();
    loadAnalytics();
  }, [dateRange, selectedPeriod]);

  useEffect(() => {
  axios.get(`${API_BASE}/sales/details`)
    .then(res => setSalesDetails(res.data))
    .catch(err => console.error('Error loading sales details:', err));
  }, []);



  const loadSales = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate + ' 00:00:00');
      if (dateRange.endDate) params.append('endDate', dateRange.endDate + ' 23:59:59');
      
      console.log('Loading sales with URL:', `${API_BASE}/sales?${params.toString()}`);
      
      const response = await axios.get(`${API_BASE}/sales?${params.toString()}`);
      console.log('Sales response:', response.data);
      
      // Ensure response.data is an array
      const salesData = Array.isArray(response.data) ? response.data : [];
      setSales(salesData);
      
      // Calculate totals
      const total = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
      setTotalSales(total);
      setTotalTransactions(salesData.length);
    } catch (error) {
      console.error('Error loading sales:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to load sales data';
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to backend server. Please ensure the backend is running on port 8000.';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check if the backend is running.';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
      setSales([]);
      setTotalSales(0);
      setTotalTransactions(0);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      console.log('Loading analytics with URL:', `${API_BASE}/sales/analytics/summary?period=${selectedPeriod}`);
      
      const response = await axios.get(`${API_BASE}/sales/analytics/summary?period=${selectedPeriod}`);
      console.log('Analytics response:', response.data);
      
      // Ensure response.data is an array
      const analyticsData = Array.isArray(response.data) ? response.data : [];
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalytics([]);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const thStyle = {
  padding: '12px',
  border: '1px solid #dee2e6',
  textAlign: 'left',
  backgroundColor: '#f8f9fa'
  };

  const tdStyle = {
  padding: '12px',
  border: '1px solid #dee2e6',
  verticalAlign: 'top'
  };


  const exportToCSV = () => {
    const headers = ['Date', 'Transaction ID', 'Items', 'Total', 'Payment Method', 'Status'];
    const csvData = sales.map(sale => [
      formatDate(sale.timestamp),
      sale.id,
      sale.items.map(item => `${item.name} (${item.quantity})`).join('; '),
      sale.total,
      sale.payment_method,
      sale.status || 'completed'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCancelSale = (sale) => {
    setSelectedSale(sale);
    setShowCancelModal(true);
  };

  const confirmCancelSale = async () => {
    if (!selectedSale || !cancelReason.trim()) {
      setMessage('Please provide a cancellation reason');
      setMessageType('error');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/sales/${selectedSale.id}/cancel`, {
        reason: cancelReason
      });

      if (response.data.success) {
        setMessage(`Transaction #${selectedSale.id} cancelled successfully. Refund amount: ${formatCurrency(response.data.refundAmount)}`);
        setMessageType('success');
        
        // Refresh sales data
        loadSales();
        
        // Close modal and reset
        setShowCancelModal(false);
        setSelectedSale(null);
        setCancelReason('');
      }
    } catch (error) {
      console.error('Error cancelling sale:', error);
      setMessage(error.response?.data?.error || 'Failed to cancel transaction');
      setMessageType('error');
    }
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setSelectedSale(null);
    setCancelReason('');
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Sales Reports</h2>
        <div style={{ 
          padding: '40px', 
          fontSize: '18px', 
          color: '#666' 
        }}>
          Loading sales data...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Sales Reports</h2>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '15px',
          marginBottom: '20px',
          color: '#721c24'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>❌</span>
            <span>{error}</span>
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            Please check if the backend server is running on port 8000.
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        gap: '20px',
        alignItems: 'end',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Start Date:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>End Date:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Analytics Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <button
          onClick={exportToCSV}
          disabled={sales.length === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: sales.length === 0 ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sales.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Total Sales</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {formatCurrency(totalSales)}
          </div>
        </div>
        <div style={{
          backgroundColor: '#28a745',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Transactions</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {totalTransactions}
          </div>
        </div>
        <div style={{
          backgroundColor: '#17a2b8',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Average Sale</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {formatCurrency(totalTransactions > 0 ? totalSales / totalTransactions : 0)}
          </div>
        </div>
      </div>

      {/* Analytics Chart Data */}
      {analytics.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3>Daily Sales Trend</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>Transactions</th>
                  <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>Total Sales</th>
                  <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>Average</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map(day => (
                  <tr key={day.date}>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      {new Date(day.date).toLocaleDateString('en-PH')}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {day.transaction_count}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {formatCurrency(day.daily_total)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>
                      {formatCurrency(day.transaction_count > 0 ? day.daily_total / day.transaction_count : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales Transactions */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h3>Recent Transactions</h3>
        {sales.length === 0 ? (
          <p>No sales found for the selected date range.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>ID</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Items</th>
                  <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>Total</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>Payment</th>
                  <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} style={{
                    backgroundColor: sale.status === 'cancelled' ? '#f8d7da' : 'white'
                  }}>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      {formatDate(sale.timestamp)}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      #{sale.id}
                      {sale.status === 'cancelled' && (
                        <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '2px' }}>
                          Cancelled: {sale.cancelled_at ? formatDate(sale.cancelled_at) : 'N/A'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      <div>
                        {sale.items.map((item, index) => (
                          <div key={index} style={{ fontSize: '12px', marginBottom: '2px' }}>
                            {item.name} × {item.quantity} @ {formatCurrency(item.price)}
                          </div>
                        ))}
                      </div>
                      {sale.cancellation_reason && (
                        <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '4px', fontStyle: 'italic' }}>
                          Reason: {sale.cancellation_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ 
                      padding: '10px', 
                      textAlign: 'right', 
                      border: '1px solid #dee2e6',
                      fontWeight: 'bold',
                      textDecoration: sale.status === 'cancelled' ? 'line-through' : 'none',
                      color: sale.status === 'cancelled' ? '#dc3545' : 'inherit'
                    }}>
                      {formatCurrency(sale.total)}
                      {sale.status === 'cancelled' && (
                        <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '2px' }}>
                          REFUNDED
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor: 
                          sale.payment_method === 'cash' ? '#d4edda' :
                          sale.payment_method === 'card' ? '#cce5ff' :
                          sale.payment_method === 'gcash' ? '#fff3cd' : '#f8d7da',
                        color:
                          sale.payment_method === 'cash' ? '#155724' :
                          sale.payment_method === 'card' ? '#004085' :
                          sale.payment_method === 'gcash' ? '#856404' : '#721c24'
                      }}>
                        {sale.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: 
                          sale.status === 'cancelled' ? '#dc3545' :
                          sale.modified_at ? '#ffc107' : '#28a745',
                        color: 
                          sale.status === 'cancelled' ? 'white' :
                          sale.modified_at ? '#000' : 'white'
                      }}>
                        {sale.status === 'cancelled' ? '❌ CANCELLED' :
                         sale.modified_at ? '✏️ MODIFIED' : '✅ COMPLETED'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {sale.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelSale(sale)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                          title="Cancel Transaction"
                        >
                          🗑️ Cancel
                        </button>
                      )}
                      {sale.status === 'cancelled' && (
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          No actions
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Transaction Modal */}
      {showCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            minWidth: '500px',
            maxWidth: '600px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#dc3545' }}>🗑️ Cancel Transaction</h3>
            
            {selectedSale && (
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '4px', 
                marginBottom: '20px' 
              }}>
                <div><strong>Transaction ID:</strong> #{selectedSale.id}</div>
                <div><strong>Date:</strong> {formatDate(selectedSale.timestamp)}</div>
                <div><strong>Total Amount:</strong> {formatCurrency(selectedSale.total)}</div>
                <div><strong>Items:</strong></div>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {selectedSale.items.map((item, index) => (
                    <li key={index} style={{ fontSize: '14px' }}>
                      {item.name} × {item.quantity} @ {formatCurrency(item.price)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Cancellation Reason: *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this transaction..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
                autoFocus
              />
            </div>

            <div style={{ 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '4px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '5px' }}>
                ⚠️ Warning: This action will:
              </div>
              <ul style={{ margin: '0', paddingLeft: '20px', color: '#856404' }}>
                <li>Mark this transaction as cancelled</li>
                <li>Restore all sold items back to inventory</li>
                <li>Record the refund amount: {selectedSale ? formatCurrency(selectedSale.total) : '₱0.00'}</li>
                <li>Update cash on hand (you'll need to manually adjust cash drawer)</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeCancelModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCancelSale}
                disabled={!cancelReason.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !cancelReason.trim() ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !cancelReason.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                🗑️ Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '15px 20px',
          backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
          border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: messageType === 'success' ? '#155724' : '#721c24',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1001,
          maxWidth: '400px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{messageType === 'success' ? '✅' : '❌'}</span>
            <span style={{ flex: 1 }}>{message}</span>
            <button
              onClick={() => setMessage('')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                color: 'inherit',
                padding: '0 5px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    
    {/* Detailed Transaction Log */}
    {salesDetails.length > 0 && (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '30px',
        marginBottom: '30px'
      }}>
        <h3>🧾 All Transactions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>🕒 Timestamp</th>
                <th style={thStyle}>🛒 Items</th>
                <th style={thStyle}>💰 Total</th>
                <th style={thStyle}>💳 Payment</th>
              </tr>
            </thead>
            <tbody>
              {salesDetails.map(sale => (
                <tr key={sale.id}>
                  <td style={tdStyle}>{formatDate(sale.created_at)}</td>
                  <td style={tdStyle}>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {sale.items.map((item, idx) => (
                        <li key={idx}>
                          {item.name} × {item.quantity} — ₱{(item.price * item.quantity).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                    </td>
                    <td style={tdStyle}>₱{sale.total.toFixed(2)}</td>
                    <td style={tdStyle}>{sale.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  </div>
)}


    </div>
  );
};



export default SalesReports;