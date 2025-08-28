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


  console.log('Raw salesDetails:', salesDetails);

  const validStart = dayjs(dateRange.startDate).startOf('day');
  const validEnd = dayjs(dateRange.endDate).endOf('day');
  const formattedStart = validStart.format('MMM D, YYYY hh:mm A');
  const formattedEnd = validEnd.format('MMM D, YYYY hh:mm A');


  return (
    <div style={{ padding: '20px' }}>
      <h2>Coverage Period</h2>

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

      {/* Sales Chart */}
      <div style={{
        backgroundColor: 'black',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px'
      }}>

        <div style={{ marginBottom: '30px' }}>
          <SalesChart />
        </div>

      </div>
    
    </div>
  );
};
export default SalesReports;