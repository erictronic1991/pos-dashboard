import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SalesChart() {
  const [data, setData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/sales/summary', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const total = res.data.values.reduce((sum, value) => sum + value, 0);
        setTotalSales(total);
        
        setData({
          labels: res.data.labels,
          datasets: [{
            label: 'Daily Sales',
            data: res.data.values,
            backgroundColor: [
              '#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B',
              '#10B981', '#06B6D4', '#8B5CF6', '#F97316', '#84CC16'
            ],
            borderColor: [
              '#4338CA', '#6D28D9', '#DB2777', '#DC2626', '#D97706',
              '#059669', '#0891B2', '#7C2D92', '#EA580C', '#65A30D'
            ],
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: [
              '#5B21B6', '#86198F', '#BE185D', '#B91C1C', '#B45309',
              '#047857', '#0E7490', '#6B21A8', '#C2410C', '#4D7C0F'
            ],
            hoverBorderWidth: 3
          }]
        });
        setError(null);
      } catch (err) {
        setError('Failed to load sales data');
        console.error('Error fetching sales data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#374151'
        }
      },
      title: {
        display: true,
        text: '📊 Sales Performance Dashboard',
        font: {
          size: 18,
          weight: 'bold'
        },
        color: '#1F2937',
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#4F46E5',
        borderWidth: 2,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `💰 Sales: ₱${context.parsed.y.toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          },
          footer: function(tooltipItems) {
            const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
            return `📈 Total: ₱${total.toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: '600'
          },
          color: '#6B7280'
        },
        border: {
          color: '#E5E7EB'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 11,
            weight: '500'
          },
          color: '#6B7280',
          callback: function(value) {
            return `₱${value.toLocaleString('en-PH')}`;
          }
        },
        border: {
          color: '#E5E7EB'
        }
      }
    },
    elements: {
      bar: {
        borderSkipped: false
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  if (loading) {
    return (
      <div style={{
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: '12px',
        border: '2px dashed #D1D5DB'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #4F46E5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>
            📊 Loading sales data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: '12px',
        border: '2px solid #FECACA'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <p style={{ color: '#DC2626', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
            Failed to Load Sales Data
          </p>
          <p style={{ color: '#7F1D1D', fontSize: '14px' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      marginBottom: '20px'
    }}>
      {/* Summary Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '16px',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)'
      }}>
        <div>
          <h4 style={{ 
            margin: '0 0 4px 0', 
            color: '#1F2937',
            fontSize: '14px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🏪 Total Sales Period
          </h4>
          <p style={{ 
            margin: 0, 
            color: '#4F46E5',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            ₱{totalSales.toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <h4 style={{ 
            margin: '0 0 4px 0', 
            color: '#1F2937',
            fontSize: '14px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📅 Days Tracked
          </h4>
          <p style={{ 
            margin: 0, 
            color: '#059669',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {data.labels.length}
          </p>
        </div>
      </div>

      {/* Chart Container */}
      <div style={{
        height: '400px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '16px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <Bar data={data} options={options} />
      </div>

      {/* Add CSS animation for loading spinner */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}