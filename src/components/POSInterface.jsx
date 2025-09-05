import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import api from "../api";
import { API_BASE_URL } from '../api'; // Adjust pa
import './POSinterface.css'; // Add this line

const POSInterface = () => {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [total, setTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [bestsellers, setBestsellers] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [customerName, setCustomerName] = useState('');

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  }, [cart]);

  useEffect(() => {
    loadProducts();
    loadBestsellers();
  }, []);

  useEffect(() => {
    const payment = parseFloat(paymentAmount);
    if (!isNaN(payment)) {
      setChangeAmount(payment - total);
    } else {
      setChangeAmount(0);
    }
  }, [paymentAmount, total]);

  const loadProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage('Error loading products');
    }
  };

  const loadBestsellers = async () => {
    try {
      const response = await api.get("/sales/bestsellers/");
      setBestsellers(response.data || []);
    } catch (error) {
      console.error('Error loading bestsellers:', error);
      setBestsellers([]);
    }
  };

  const getUniqueCategories = () => {
    const categories = products
      .map(product => product.category)
      .filter(category => category && category.trim() !== '')
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .sort();
    return categories;
  };

  const getDisplayProducts = () => {
    let filtered = products;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name && product.name.toLowerCase().includes(search)) ||
        (product.brand && product.brand.toLowerCase().includes(search)) ||
        (product.category && product.category.toLowerCase().includes(search))
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    return filtered;
  };

  const getCategoryProductCount = (category) => {
    if (category === 'all') {
      return products.length;
    }
    return products.filter(product => product.category === category).length;
  };

  const handleBarcodeScanned = async (barcode) => {
    try {
      const response = await api.get("/products/barcode/"+{barcode});
      const product = response.data;
      if (product && product.id) {
        if (product.quantity <= 0) {
          setMessage(`Product "${product.name}" is out of stock!`);
          return;
        }
        setCurrentProduct(product);
        addToCart(product);
        setMessage(`Added ${product.name} to cart`);
        setSearchTerm('');
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
  if (paymentMethod === 'cash' && (isNaN(paymentAmount) || parseFloat(paymentAmount) < total)) {
    setMessage('Payment amount must be at least the total amount due');
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
      paymentMethod: paymentMethod,
      customer_name: customerName || paymentMethod
    };
    
    // Fix 1: Change from api.get to api.post for sales creation
    const saleResponse = await api.post('/sales', saleData);
    
    if (saleResponse.data.success) {
      let updateSuccess = true;
      let updateMessage = `Sale completed! Transaction ID: ${saleResponse.data.saleId}`;

      if (['cash', 'gcash', 'paymaya'].includes(paymentMethod)) {
        const updateData = {
          transaction_type: 'add',
          description: `${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} sale (Transaction ID: ${saleResponse.data.saleId})`,
          reference_id: saleResponse.data.saleId
        };
        
        // Map payment method to the expected field
        if (paymentMethod === 'cash') {
          updateData.cashOnHand = total;
        } else if (paymentMethod === 'gcash') {
          updateData.gcashBalance = total;
        } else if (paymentMethod === 'paymaya') {
          updateData.paymayaBalance = total;
        }

        try {
          // Fix 2: Change from api.get to api.post for cash register update
          const updateResponse = await api.post('/cash/update', updateData);
          
          if (updateResponse.data.message !== 'Cash balances updated successfully') {
            updateSuccess = false;
            updateMessage += `. ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} register update failed.`;
          }
        } catch (updateError) {
          console.error(`Error updating ${paymentMethod} register:`, updateError);
          updateSuccess = false;
          updateMessage += `. Error updating ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} register: ${updateError.message}`;
        }
      }

      if (updateSuccess && paymentMethod !== 'credit') {
        updateMessage += `. ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} register updated.`;
      }

      setMessage(updateMessage);
      setCart([]);
      setCurrentProduct(null);
      setPaymentAmount('');
      setChangeAmount(0);
      setCustomerName('');
      setShowCheckoutModal(false); // Fix 3: Close the modal on success
      loadProducts();
    }
  } catch (error) {
    console.error('Error processing sale:', error);
    console.log('Error details:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      } : 'No response received',
      request: error.request ? error.request : 'No request data'
    });
    setMessage('Error processing sale: ' + (error.response?.data?.message || error.message));
  } finally {
    setIsProcessing(false);
  }
};

  const clearCart = () => {
    setCart([]);
    setCurrentProduct(null);
    setMessage('Cart cleared');
  };

  const handleSearchInput = async (e) => {
    const input = e.target.value;
    setSearchTerm(input);

    const isBarcode = input.length >= 8 && /^\d+$/.test(input);
    if (e.key === 'Enter' && isBarcode) {
      await handleBarcodeScanned(input);
    }
  };

  // Get category emoji based on category name
  const getCategoryEmoji = (category) => {
    const categoryEmojis = {
      'beverages': '🥤',
      'snacks': '🍿',
      'food': '🍽️',
      'drinks': '🥤',
      'electronics': '📱',
      'clothing': '👕',
      'home': '🏠',
      'beauty': '💄',
      'health': '💊',
      'toys': '🧸',
      'books': '📚',
      'sports': '⚽',
      'automotive': '🚗',
      'garden': '🌱',
      'office': '🖊️',
      'tools': '🔧',
      'music': '🎵',
      'games': '🎮'
    };
    
    const lowerCategory = category.toLowerCase();
    return categoryEmojis[lowerCategory] || '📦';
  };

  // Add this new state variable at the top with your other useState declarations
const [showCheckoutModal, setShowCheckoutModal] = useState(false);

return (
  <div className="pos-container">
   

    <div className="left-panel">
      <div className="browse-products">
        <div className="products-header">
          <h3>Browse Products</h3>
          <div className="search-container">
            <input
              className="search-input"
              type="text"
              placeholder="Search products or enter barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchInput}
            />
            <span className={`search-icon ${searchTerm.length >= 8 && /^\d+$/.test(searchTerm) ? 'barcode-mode' : ''}`}>
              {searchTerm.length >= 8 && /^\d+$/.test(searchTerm) ? '🔢' : '🔍'}
            </span>
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                ×
              </button>
            )}
          </div>
          
          <div className="category-tabs">
            <div
              onClick={() => setSelectedCategory('all')}
              className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
            >
              <span>🏪</span>
              <span>All</span>
              <span className="category-count">{getCategoryProductCount('all')}</span>
            </div>
            {getUniqueCategories().map(category => (
              <div
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
              >
                <span>{getCategoryEmoji(category)}</span>
                <span>{category}</span>
                <span className="category-count">{getCategoryProductCount(category)}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="products-grid">
          {getDisplayProducts().map(product => (
  <div
    key={product.id}
    onClick={() => product.quantity > 0 && addToCart(product)}
    className={`product-card ${product.quantity <= 0 ? 'out-of-stock' : ''}`}
  >
    {bestsellers.some(b => b.product_id === product.id) && (
      <div className="bestseller-badge">⭐ HOT</div>
    )}
    
    <div className="product-image-container">
      {product.image_url ? (
        <img
          src={`${API_BASE_URL}${product.image_url}`}
          alt={product.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div style={{
        display: product.image_url ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        fontSize: 'clamp(24px, 6vw, 36px)',
        color: '#dee2e6'
      }}>
        📦
      </div>
    </div>
    
    <div className="product-details">
      <div className="product-content-wrapper">
        <div className="product-name">
          {product.name}
        </div>
        
        {product.description && (
          <div className="product-description">
            {product.description}
          </div>
        )}
        
        <div className="product-bottom-info">
          <div className="product-price">
            ₱{product.price.toFixed(2)}
          </div>
          
          <div className="product-stock-row">
            <span 
              className="stock-info"
              style={{
                color: product.quantity <= 5 ? '#dc3545' : 
                       product.quantity <= 20 ? '#ffc107' : '#28a745'
              }}
            >
              📦 Stock: {product.quantity}
            </span>
            
            {product.quantity <= 5 && product.quantity > 0 && (
              <span className="stock-badge" style={{
                background: 'linear-gradient(135deg, #dc3545, #c82333)',
                color: 'white'
              }}>
                LOW
              </span>
            )}
            {product.quantity > 5 && product.quantity <= 20 && (
              <span className="stock-badge" style={{
                background: 'linear-gradient(135deg, #ffc107, #ffb300)',
                color: '#000'
              }}>
                MED
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
    
    {product.quantity <= 0 && (
      <div style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'linear-gradient(135deg, rgba(220, 53, 69, 0.9), rgba(183, 28, 28, 0.9))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 'clamp(8px, 2vw, 12px)',
        fontWeight: 'bold',
        borderRadius: '8px',
        zIndex: 3
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(12px, 3vw, 16px)', marginBottom: '2px' }}>🚫</div>
          <div>OUT OF STOCK</div>
        </div>
      </div>
    )}
  </div>
))}
        </div>
        
        {getDisplayProducts().length === 0 && (
          <div className="empty-products-message">
            {searchTerm || selectedCategory !== 'all' ? (
              <>
                🔍 No products match your filters
                <br />
                <small>Try adjusting search or category</small>
              </>
            ) : (
              <>
                📦 No products available
                <br />
                <small>Add products in Inventory Management</small>
              </>
            )}
          </div>
        )}
      </div>
    </div>

    <div className="right-panel">
      <div className="checkout-card">
        <div className="cart-header">
          <h3>Shopping Cart {cart.length > 0 && `(${cart.length})`}</h3>
        </div>
        
        <div className="total-display">
          Total: ₱{total.toFixed(2)}
        </div>
        
        <div className="cart-container">
          {cart.length === 0 ? (
            <div className="empty-cart-message">
              🛒 Cart is empty
              <br />
              <small>Add products to get started</small>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name" title={item.name}>
                    {item.name}
                  </div>
                  <div className="cart-item-price">₱{item.price.toFixed(2)} each</div>
                </div>
                <div className="cart-controls">
                  <button 
                    className="qty-button" 
                    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                    title="Decrease quantity"
                  >
                    -
                  </button>
                  <span style={{ 
                    minWidth: 'clamp(16px, 4vw, 24px)', 
                    textAlign: 'center', 
                    fontSize: 'clamp(9px, 2vw, 12px)',
                    fontWeight: '600',
                    padding: '0 clamp(2px, 0.5vw, 4px)'
                  }}>
                    {item.quantity}
                  </span>
                  <button 
                    className="qty-button" 
                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                    title="Increase quantity"
                  >
                    +
                  </button>
                  <div style={{ 
                    minWidth: 'clamp(40px, 10vw, 60px)', 
                    textAlign: 'right', 
                    fontSize: 'clamp(9px, 2vw, 12px)', 
                    fontWeight: '600',
                    margin: '0 clamp(2px, 0.5vw, 6px)'
                  }}>
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </div>
                  <button 
                    className="remove-button" 
                    onClick={() => removeFromCart(item.id)}
                    title="Remove from cart"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="action-buttons">
          <button onClick={clearCart} className="clear-cart-btn">
            Clear Cart
          </button>
          <button
            onClick={() => setShowCheckoutModal(true)}
            disabled={cart.length === 0}
            className="checkout-btn"
          >
            Checkout
          </button>
        </div>
        
        {message && (
          <div className="message-alert">
            {message}
            <button
              style={{
                position: 'absolute',
                right: 'clamp(6px, 1.5vw, 10px)',
                top: 'clamp(6px, 1.5vw, 10px)',
                background: 'none',
                border: 'none',
                fontSize: 'clamp(12px, 2.5vw, 16px)',
                cursor: 'pointer',
                color: '#155724',
                padding: '0',
                width: 'clamp(14px, 3.5vw, 18px)',
                height: 'clamp(14px, 3.5vw, 18px)'
              }}
              onClick={() => setMessage('')}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Checkout Modal */}
    {showCheckoutModal && (
      <div className="checkout-modal-overlay">
        <div className="checkout-modal">
          <div className="checkout-modal-header">
            <h3>Complete Sale</h3>
            <button 
              className="modal-close-btn"
              onClick={() => setShowCheckoutModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 'clamp(18px, 4vw, 24px)',
                cursor: 'pointer',
                color: '#6c757d',
                width: 'clamp(24px, 6vw, 32px)',
                height: 'clamp(24px, 6vw, 32px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
            >
              ×
            </button>
          </div>
          
          <div className="checkout-modal-content">
            <div style={{
              marginBottom: 'clamp(16px, 4vw, 24px)',
              padding: 'clamp(12px, 3vw, 16px)',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <h4 style={{
                margin: '0 0 clamp(8px, 2vw, 12px) 0',
                fontSize: 'clamp(12px, 2.5vw, 16px)',
                fontWeight: '600'
              }}>Order Summary</h4>
              <div style={{ marginBottom: 'clamp(8px, 2vw, 12px)' }}>
                {cart.map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 0',
                    fontSize: 'clamp(10px, 2vw, 13px)'
                  }}>
                    <span style={{ flex: 1, fontWeight: '500' }}>{item.name}</span>
                    <span style={{ margin: '0 clamp(8px, 2vw, 12px)', color: '#6c757d' }}>x{item.quantity}</span>
                    <span style={{ fontWeight: '600' }}>₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div style={{
                borderTop: '1px solid #dee2e6',
                paddingTop: 'clamp(6px, 1.5vw, 8px)',
                textAlign: 'right',
                fontSize: 'clamp(14px, 3vw, 18px)',
                fontWeight: 'bold'
              }}>
                Total: ₱{total.toFixed(2)}
              </div>
            </div>
            
            <div style={{ marginBottom: 'clamp(16px, 4vw, 20px)' }}>
              <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'clamp(4px, 1vw, 6px)',
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  fontWeight: '500'
                }}>Payment Method:</label>
                <div className="modal-payment-buttons">
                  <button
                    className={`modal-payment-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    💵 Cash
                  </button>
                  <button
                    className={`modal-payment-btn ${paymentMethod === 'credit' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('credit')}
                  >
                    📝 Credit
                  </button>
                  <button
                    className={`modal-payment-btn ${paymentMethod === 'gcash' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('gcash')}
                  >
                    📱 GCash
                  </button>
                  <button
                    className={`modal-payment-btn ${paymentMethod === 'paymaya' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('paymaya')}
                  >
                    💳 PayMaya
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 'clamp(4px, 1vw, 6px)',
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  fontWeight: '500'
                }}>Customer Name:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="form-input"
                />
              </div>
              
              {paymentMethod === 'cash' && (
                <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: 'clamp(4px, 1vw, 6px)',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    fontWeight: '500'
                  }}>Payment Given:</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount given"
                    className="form-input"
                    style={{
                      fontSize: 'clamp(13px, 3vw, 16px)',
                      fontWeight: 'bold',
                      textAlign: 'right'
                    }}
                    autoFocus
                  />
                  <div style={{
                    textAlign: 'right',
                    fontSize: 'clamp(12px, 2.5vw, 16px)',
                    fontWeight: 'bold',
                    padding: 'clamp(4px, 1vw, 6px) clamp(6px, 1.5vw, 8px)',
                    background: '#e2f0d9',
                    border: '1px solid #c3e6cb',
                    borderRadius: '4px',
                    marginTop: 'clamp(6px, 1.5vw, 8px)',
                    color: '#155724'
                  }}>
                    Change Due: ₱{(changeAmount > 0 ? changeAmount : 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="checkout-modal-footer">
            <button 
              className="cancel-btn"
              onClick={() => setShowCheckoutModal(false)}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await processSale();
              }}
              disabled={cart.length === 0 || isProcessing || (paymentMethod === 'cash' && (isNaN(paymentAmount) || parseFloat(paymentAmount) < total))}
              className="complete-sale-btn"
            >
              {isProcessing ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

const qtyButton = {
  width: '44px',
  height: '44px',
  border: '1px solid #dee2e6',
  backgroundColor: '#fff',
  cursor: 'pointer',
  borderRadius: '4px'
};

const removeButton = {
  padding: '6px 8px',
  backgroundColor: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  minWidth: '44px',
  minHeight: '44px'
};

const clearButton = {
  flex: 1,
  padding: '10px',
  backgroundColor: '#6c757d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  minHeight: '44px'
};

const completeButton = {
  flex: 2,
  padding: '10px',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  minHeight: '44px'
};

export default POSInterface;