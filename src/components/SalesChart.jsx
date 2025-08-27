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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/sales/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData({
        labels: res.data.labels,
        datasets: [{ label: 'Sales', data: res.data.values, backgroundColor: 'teal' }]
      });
    };
    fetchData();
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Sales Summary' }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: value => `₱${value}`
        }
      }
    }
    };


  
  return <Bar data={data} options={options} />;
}
