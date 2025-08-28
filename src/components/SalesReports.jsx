import { useState, useEffect } from 'react';
import axios from 'axios';
import SalesChart from "./SalesChart";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const today = dayjs().format('YYYY-MM-DD'); 




const SalesReports = () => {
  const [sales, setSales] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedPeriod, setSelectedPeriod] = useState('today');
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
  const [filterUnpaidOnly, setFilterUnpaidOnly] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  //const [startDate, setStartDate] = useState('');
  //const [endDate, setEndDate] = useState('');
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);


  const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    loadSales();
    loadAnalytics();
  }, [dateRange, selectedPeriod]);

  useEffect(() => {
    axios.get(`${API_BASE}/sales/details`, {
      params: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }
    })
    .then(res => setSalesDetails(res.data))
    .catch(err => console.error('Error loading sales details:', err));
  }, [dateRange]);

  useEffect(() => {
  axios.get(`${API_BASE}/sales/analytics/summary?period=${selectedPeriod}`)
    .then(res => {
      const analyticsData = Array.isArray(res.data) ? res.data : [];
      setAnalytics(analyticsData);

      // ✅ Calculate totals from analytics
      const total = analyticsData.reduce((sum, day) => sum + day.daily_total, 0);
      const transactions = analyticsData.reduce((sum, day) => sum + day.transaction_count, 0);

      setTotalSales(total);
      setTotalTransactions(transactions);
    })
    .catch(err => console.error('Error loading analytics:', err));
  }, [selectedPeriod]);

  
  //useEffect(() => {
  //const today = new Date();
  //const pastDate = new Date();
  //pastDate.setDate(today.getDate() - parseInt(selectedPeriod));

  //setDateRange({
  //  startDate: pastDate.toISOString().split('T')[0],
  //  endDate: today.toISOString().split('T')[0]
  //});
  //}, [selectedPeriod]);

  useEffect(() => {
  const today = dayjs().format('YYYY-MM-DD');

  if (selectedPeriod === 'today') {
    setDateRange({ startDate: today, endDate: today });
  } else {
    const start = dayjs().subtract(Number(selectedPeriod) - 1, 'day').format('YYYY-MM-DD');
    setDateRange({ startDate: start, endDate: today });
  }
  }, [selectedPeriod]);



  const handleMarkAsPaid = (sale) => {
  axios.put(`${API_BASE}/sales/${sale.id}/mark-paid`)
    .then(() => {
      // ✅ Refresh the transaction list
      axios.get(`${API_BASE}/sales/details`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      }).then(res => setSalesDetails(res.data));
    })
    .catch(err => console.error('Error marking sale as paid:', err));
};




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

  const filteredSales = salesDetails.filter(sale => {
  const matchesStatus = filterUnpaidOnly ? sale.status === 'unpaid' : true;
  const matchesCustomer = filterCustomer.trim()
    ? sale.customer_name.toLowerCase().includes(filterCustomer.trim().toLowerCase())
    : true;
  return matchesStatus && matchesCustomer;
  });

  console.log('Raw salesDetails:', salesDetails);

  //const validStart = dayjs(startDate).startOf('day'); // 00:00 AM
  //const validEnd = dayjs(endDate).endOf('day');       // 11:59 PM
  //const formattedStart = validStart.format('MMM D, YYYY hh:mm A');
  //const formattedEnd = validEnd.format('MMM D, YYYY hh:mm A');

  const validStart = dayjs(dateRange.startDate).startOf('day');
  const validEnd = dayjs(dateRange.endDate).endOf('day');
  const formattedStart = validStart.format('MMM D, YYYY hh:mm A');
  const formattedEnd = validEnd.format('MMM D, YYYY hh:mm A');


  let unpaidSummary = [];
  try {
    unpaidSummary = salesDetails.filter(sale => {
      const isUnpaid = sale.status === 'unpaid';
      const matchesCustomer = filterCustomer.trim()
        ? sale.customer_name?.toLowerCase().includes(filterCustomer.trim().toLowerCase())
        : true;

      const withinDateRange = (() => {
        if (!sale.created_at || typeof sale.created_at !== 'string') return false;

        const iso = sale.created_at.includes(' ') ? sale.created_at.replace(' ', 'T') : sale.created_at;
        const parsed = dayjs(iso);

        if (!parsed.isValid()) {
          console.warn('Invalid created_at:', sale.created_at);
          return false;
        }

        return parsed.isBetween(validStart, validEnd, null, '[]');
      })();

      return isUnpaid && matchesCustomer && withinDateRange;
      });
    } catch (err) {
      console.error('Error filtering unpaidSummary:', err);
    }

    console.log('Raw salesDetails:', salesDetails);
    console.log('filterCustomer:', filterCustomer);
    console.log('unpaidSummary:', unpaidSummary);
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);


    const totalOwed = unpaidSummary.reduce((sum, sale) => sum + sale.total, 0);

    console.log('Unpaid summary count:', unpaidSummary.length);


  

  return (
    <div style={{ padding: '20px' }}>
      <h2>-</h2>

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
          <label style={{ display: 'block', marginBottom: '5px' }}>Coverage Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="today">Today</option> {/* ✅ New default */}
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

      {/* Date Validation */}
      {(!startDate || !endDate) && (
      <div style={{ color: '#999', fontSize: '12px', marginBottom: '10px' }}>
      Please select a valid date range to view summary.
      </div>
      )}

      {/* Summary Row */}
      {filterCustomer.trim() && unpaidSummary.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '20px',
            fontSize: '20px',
            color: '#856404',
            fontFamily: 'monospace',
            borderBottom: '1px dashed #ccc'
          }}>
          <strong>Summary:</strong> Si {filterCustomer.trim()} ay may utang na <strong>₱{totalOwed.toFixed(2)}</strong> from <strong>{formattedStart}</strong> to <strong>{formattedEnd}</strong>.
          </div>
      )}

      {/* Filter Controls */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
          <label>
            <input
              type="checkbox"
              checked={filterUnpaidOnly}
              onChange={(e) => setFilterUnpaidOnly(e.target.checked)}
            />
            {' '}Show only unpaid transactions
          </label>
        </div >

      {/* Creditor Filter */}
        <input
          type="text"
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          placeholder="Filter by customer name"
          style={{
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '14px',
          width: '250px'
          }}
          />

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
    {salesDetails.length === 0 ? (
      <p>No transactions found.</p>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>🕒 Date</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>🆔 ID</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>🛒 Items</th>
              <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #dee2e6' }}>💰 Total</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>💳 Payment</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>📊 Status</th>
              <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>⚡ Actions</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>📝 Remarks</th>
              <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>👤 Customer</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => (
              <tr key={sale.id} style={{
                backgroundColor: sale.status === 'cancelled' ? '#f8d7da' : 'white'
              }}>
                <td>
              {(() => {
              try {
              const raw = sale.created_at;
                  if (!raw || typeof raw !== 'string') return '—';
                    const iso = raw.replace(' ', 'T');
                      return dayjs(iso).format('MMM D, YYYY h:mm A');
                  } catch {
                  return 'Invalid date';
                  }
                })()}
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
                        {item.name} × {item.quantity} @ ₱{item.price.toFixed(2)}
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
                  ₱{sale.total.toFixed(2)}
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
                      sale.paymentMethod === 'cash' ? '#d4edda' :
                      sale.paymentMethod === 'credit' ? '#cce5ff' :
                      sale.paymentMethod === 'gcash' ? '#fff3cd' : '#f8d7da',
                    color:
                      sale.paymentMethod === 'cash' ? '#155724' :
                      sale.paymentMethod === 'credit' ? '#004085' :
                      sale.paymentMethod === 'gcash' ? '#856404' : '#721c24'
                  }}>
                    {sale.paymentMethod.toUpperCase()}
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
                    sale.status === 'unpaid' ? '#ffc107' :
                    sale.modified_at ? '#17a2b8' : '#28a745',
                    color: 
                    sale.status === 'cancelled' ? 'white' :
                    sale.status === 'unpaid' ? '#000' :
                    sale.modified_at ? 'white' : 'white'
                  }}>
                  {sale.status === 'cancelled' ? '❌ CANCELLED' :
                    sale.status === 'unpaid' ? '💸 UNPAID' :
                    sale.modified_at ? '✏️ MODIFIED' : '✅ COMPLETED'}
                  </span>

                </td>
                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #dee2e6' }}>

                  {sale.status === 'unpaid' ? (
                  <button
                  onClick={() => handleMarkAsPaid(sale)}
                  style={{
                  padding: '4px 8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
                title="Mark as Paid"
                  >
                  ✅ Mark As Paid
                  </button>
                  ) : sale.status !== 'cancelled' ? (
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
                ) : (
                <span style={{ fontSize: '12px', color: '#666' }}>
                No actions
                </span>
                )}
                </td>
                {/*Column 8: Remarks*/}
                <td style={{ padding: '10px', border: '1px solid #dee2e6', fontSize: '12px' }}>
                  {sale.status === 'cancelled' && sale.cancellation_reason ? (
                  <span style={{ color: '#dc3545', fontStyle: 'italic' }}>
                  Reason: {sale.cancellation_reason}
                  </span>
                ) : sale.status === 'completed' && sale.paid_at ? (
                <span style={{ color: '#28a745' }}>
                Paid On: {formatDate(sale.paid_at)}
                </span>
                ) : sale.status === 'unpaid' ? (
                <span style={{ color: '#ffc107' }}>
                Awaiting payment
                </span>
                ) : (
                <span style={{ color: '#999' }}>No remarks</span>
                )}
                </td>
                {/*Column 9: Customers*/}
                <td style={{ padding: '10px', border: '1px solid #dee2e6', fontSize: '12px' }}>
                {sale.customer_name || <span style={{ color: '#999' }}>—</span>}
                </td>

              </tr>
            ))}
          </tbody>
          </table>
          </div>
          )}
          </div>
      )}

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
    
    </div>
  );
};
export default SalesReports;