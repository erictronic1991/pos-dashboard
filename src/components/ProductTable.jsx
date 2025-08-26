import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ProductTable() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/products', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(res.data);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div>
      <h3>Inventory</h3>
      <table border="1" cellPadding="8" style={{ width: '100%', marginTop: '10px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Price (₱)</th>
            <th>Quantity</th>
            <th>Barcode</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr><td colSpan="4">No products found</td></tr>
          ) : (
            products.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.price.toFixed(2)}</td>
                <td>{product.quantity}</td>
                <td>{product.barcode}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
