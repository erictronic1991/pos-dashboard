import { useState, useEffect } from 'react';
import BarcodeScanner from './BarcodeScanner';
import axios from 'axios';

const POSInterface = () => {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [total, setTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE = 'http://localhost:8000';

  // Calculate total whenever cart changes
  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  }, [cart]);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage('Error loading products');
    }
  };

  const handleBarcodeScanned = async (barcode) => {
    try {
      const response = await axios.get(`${API_BASE}/products/barcode/${barcode}`);
      const product = response.data;
      
      if (product && product.id) {
        if (product.quantity <= 0) {
          setMessage(`Product "${product.name}" is out of stock!`);
          return;
        }
        
        setCurrentProduct(product);
        addToCart(product);
        setMessage(`Added ${product.name} to cart`);
      } else {
        setMessage(`Product with barcode ${barcode} not found`);
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      setMessage('Error scanning barcode');
    }
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        // Check if we have enough stock
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.quantity) {
          setMessage(`Not enough stock for ${product.name}. Available: ${product.quantity}`);
          return prevCart;
        }
        
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        if (quantity > product.quantity) {
          setMessage(`Not enough stock for ${product.name}. Available: ${product.quantity}`);
          return prevCart;
        }
        
        return [...prevCart, { ...product, quantity }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.quantity) {
      setMessage(`Not enough stock for ${product.name}. Available: ${product.quantity}`);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const processSale = async () => {
    if (cart.length === 0) {
      setMessage('Cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const saleData = {
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: total,
        paymentMethod: paymentMethod
      };

      const response = await axios.post(`${API_BASE}/sales`, saleData);
      
      if (response.data.success) {
        setMessage(`Sale completed! Transaction ID: ${response.data.saleId}`);
        setCart([]);
        setCurrentProduct(null);
        loadProducts(); // Refresh product quantities
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      setMessage('Error processing sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setCurrentProduct(null);
    setMessage('Cart cleared');
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {/* Left Panel - Scanner and Product Selection */}
      <div style={{ flex: 1 }}>
        <BarcodeScanner 
          onScan={handleBarcodeScanned}
          onError={(error) => setMessage(error)}
        />
        
        {/* Quick Product Selection */}
        <div style={{ marginTop: '20px' }}>
          <h3>Quick Product Selection</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '10px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {products.map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: product.quantity <= 0 ? '#f8d7da' : '#fff',
                  opacity: product.quantity <= 0 ? 0.6 : 1
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                <div>₱{product.price.toFixed(2)}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Stock: {product.quantity}
                </div>
                {product.barcode && (
                  <div style={{ fontSize: '10px', color: '#999' }}>
                    {product.barcode}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart and Checkout */}
      <div style={{ flex: 1, minWidth: '400px' }}>
        <div style={{ 
          border: '2px solid #ddd', 
          borderRadius: '8px', 
          padding: '20px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3>Shopping Cart</h3>
          
          {cart.length === 0 ? (
            <p>Cart is empty</p>
          ) : (
            <div>
              {cart.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      ₱{item.price.toFixed(2)} each
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      style={{
                        width: '30px',
                        height: '30px',
                        border: '1px solid #ddd',
                        backgroundColor: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '30px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      style={{
                        width: '30px',
                        height: '30px',
                        border: '1px solid #ddd',
                        backgroundColor: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                    <div style={{ minWidth: '80px', textAlign: 'right' }}>
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total and Payment */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              textAlign: 'right',
              marginBottom: '20px'
            }}>
              Total: ₱{total.toFixed(2)}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Payment Method:
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="gcash">GCash</option>
                <option value="paymaya">PayMaya</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={clearCart}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Cart
              </button>
              <button
                onClick={processSale}
                disabled={cart.length === 0 || isProcessing}
                style={{
                  flex: 2,
                  padding: '12px',
                  backgroundColor: cart.length === 0 || isProcessing ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: cart.length === 0 || isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            color: '#155724'
          }}>
            {message}
            <button
              onClick={() => setMessage('')}
              style={{
                float: 'right',
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default POSInterface;