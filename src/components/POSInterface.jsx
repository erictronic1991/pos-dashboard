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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'bestsellers', 'category'
  const [bestsellers, setBestsellers] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);


  const API_BASE = 'http://localhost:8000';

  // Calculate total whenever cart changes
  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  }, [cart]);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
    loadBestsellers();
  }, []);

  //Change amount
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
      const response = await axios.get(`${API_BASE}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage('Error loading products');
    }
  };

  const loadBestsellers = async () => {
    try {
      // Get bestsellers from sales data
      const response = await axios.get(`${API_BASE}/sales/bestsellers`);
      setBestsellers(response.data || []);
    } catch (error) {
      console.error('Error loading bestsellers:', error);
      // If bestsellers endpoint doesn't exist, use mock data based on existing products
      setBestsellers([]);
    }
  };

  // Get unique categories
  const getUniqueCategories = () => {
    const categories = products
      .map(product => product.category)
      .filter(category => category && category.trim() !== '')
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .sort();
    return categories;
  };

  // Filter products based on search and category
  const getFilteredProducts = () => {
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

  // Get products to display based on view mode
  const getDisplayProducts = () => {
    switch (viewMode) {
      case 'bestsellers':
        // Show bestsellers first, then other products
        const bestsellerIds = bestsellers.map(b => b.product_id);
        const bestsellerProducts = products.filter(p => bestsellerIds.includes(p.id));
        return bestsellerProducts.length > 0 ? bestsellerProducts : products.slice(0, 12);
      
      case 'category':
        return getFilteredProducts();
      
      default:
        return getFilteredProducts();
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
        
        {/* Manual Search and Product Selection */}
        <div style={{ marginTop: '20px' }}>
          <h3>Product Search & Selection</h3>
          
          {/* Search Bar */}
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="🔍 Search by name, brand, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '90%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>

          {/* View Mode Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '5px', 
            marginBottom: '15px',
            borderBottom: '1px solid #ddd'
          }}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: '10px 15px',
                border: 'none',
                borderBottom: viewMode === 'all' ? '3px solid #007bff' : '3px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontWeight: viewMode === 'all' ? 'bold' : 'normal',
                color: viewMode === 'all' ? '#007bff' : '#666'
              }}
            >
              🛍️ All Products
            </button>
            <button
              onClick={() => setViewMode('bestsellers')}
              style={{
                padding: '10px 15px',
                border: 'none',
                borderBottom: viewMode === 'bestsellers' ? '3px solid #007bff' : '3px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontWeight: viewMode === 'bestsellers' ? 'bold' : 'normal',
                color: viewMode === 'bestsellers' ? '#007bff' : '#666'
              }}
            >
              ⭐ Bestsellers
            </button>
            <button
              onClick={() => setViewMode('category')}
              style={{
                padding: '10px 15px',
                border: 'none',
                borderBottom: viewMode === 'category' ? '3px solid #007bff' : '3px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontWeight: viewMode === 'category' ? 'bold' : 'normal',
                color: viewMode === 'category' ? '#007bff' : '#666'
              }}
            >
              📂 By Category
            </button>
          </div>

          {/* Category Filter (shown when in category mode) */}
          {viewMode === 'category' && (
            <div style={{ marginBottom: '15px' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Categories</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>
                    📂 {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Products Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            {getDisplayProducts().map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: product.quantity <= 0 ? '#f8d7da' : '#fff',
                  opacity: product.quantity <= 0 ? 0.6 : 1,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (product.quantity > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Bestseller Badge */}
                {viewMode === 'bestsellers' && bestsellers.some(b => b.product_id === product.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    zIndex: 2
                  }}>
                    ⭐ HOT
                  </div>
                )}

                {/* Product Image */}
                <div style={{
                  height: '120px',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {product.image_url ? (
                    <img
                      src={`${API_BASE}${product.image_url}`}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback placeholder */}
                  <div style={{
                    display: product.image_url ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    fontSize: '48px',
                    color: '#ccc'
                  }}>
                    📦
                  </div>
                </div>

                {/* Product Info */}
                <div style={{ padding: '12px' }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '6px',
                    fontSize: '14px',
                    lineHeight: '1.3',
                    minHeight: '36px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {product.name}
                  </div>
                  
                  {product.brand && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#007bff', 
                      fontWeight: '500', 
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🏷️ {product.brand}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#28a745', 
                    marginBottom: '6px' 
                  }}>
                    ₱{product.price.toFixed(2)}
                  </div>
                  
                  <div style={{ 
                    fontSize: '11px', 
                    color: product.quantity <= 5 ? '#dc3545' : '#666',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📦 Stock: {product.quantity}</span>
                    {product.quantity <= 5 && product.quantity > 0 && (
                      <span style={{ 
                        backgroundColor: '#ffc107', 
                        color: '#000', 
                        padding: '1px 4px', 
                        borderRadius: '6px',
                        fontSize: '9px',
                        fontWeight: 'bold'
                      }}>
                        LOW
                      </span>
                    )}
                  </div>
                  
                  {product.category && (
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                      📂 {product.category}
                    </div>
                  )}
                  
                  {product.barcode && (
                    <div style={{ fontSize: '9px', color: '#ccc' }}>
                      🔢 {product.barcode}
                    </div>
                  )}
                </div>
                
                {/* Out of Stock Overlay */}
                {product.quantity <= 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(220, 53, 69, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '12px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '4px' }}>🚫</div>
                      <div>OUT OF STOCK</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* No Results Message */}
          {getDisplayProducts().length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666',
              fontSize: '16px'
            }}>
              {searchTerm ? (
                <>
                  🔍 No products found for "{searchTerm}"
                  <br />
                  <small>Try searching by name, brand, or category</small>
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

      {/* Right Panel - Cart and Checkout */}
      <div style={{ flex: 1, minWidth: '400px', maxWidth: '600px', margin: '0 auto' }}>

        {/* 🛒 Shopping Cart */}
          <div style={{
            border: '2px dashed #ccc',           // Dashed border for receipt feel
            borderRadius: '4px',                 // Slightly sharper corners
            padding: '20px',
            backgroundColor: '#fff',             // White like receipt paper
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)', // Soft shadow for depth
            maxWidth: '400px',                   // Narrower width
            margin: '0 auto 20px',                // Centered with bottom spacing
            textAlign: 'right'
          }}>
        
        <h3>💵 Payment Given</h3>
        <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount given"
              autoFocus
              style={{
                width: '100%',
                padding: '7px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'right'
              }}
          />

          {/* Formatted display */}
          {paymentAmount && (
            <div style={{
            marginTop: '8px',
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'right',
            color: '#28a745'
          }}>
            ₱{parseFloat(paymentAmount).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
          </div>
          )}



        <h3>🛒 Shopping Cart</h3>
        {cart.length === 0 ? (
          <p>Cart is empty</p>
        ) : (
          cart.map(item => (
            <div key={item.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              borderBottom: '1px solid #eee'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  ₱{item.price.toFixed(2)} each
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} style={qtyButton}>-</button>
                <span style={{ minWidth: '30px', textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} style={qtyButton}>+</button>
                <div style={{ minWidth: '80px', textAlign: 'right' }}>
                  ₱{(item.price * item.quantity).toFixed(2)}
                </div>
                <button onClick={() => removeFromCart(item.id)} style={removeButton}>Remove</button>
              </div>
            </div>
          ))
        )}

        {/* Total and Payment Method */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'right', marginBottom: '20px' }}>
            Total: ₱{total.toFixed(2)}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Payment Method:</label>
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
            <button onClick={clearCart} style={clearButton}>Clear Cart</button>
            <button
              onClick={processSale}
              disabled={cart.length === 0 || isProcessing}
              style={{
                ...completeButton,
                backgroundColor: cart.length === 0 || isProcessing ? '#ccc' : '#28a745',
                cursor: cart.length === 0 || isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
          </div>

        

        {/* 💸 Change Due */}
        <div style={{
          textAlign: 'right',
          fontSize: '20px',
          fontWeight: 'bold',
          padding: '10px',
          backgroundColor: '#e2f0d9',
          border: '1px solid #c3e6cb',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
        Change Due: ₱{(paymentAmount - total > 0 ? paymentAmount - total : 0).toFixed(2)}
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

const qtyButton = {
  width: '30px',
  height: '30px',
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  cursor: 'pointer'
};

const removeButton = {
  padding: '5px 10px',
  backgroundColor: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const clearButton = {
  flex: 1,
  padding: '12px',
  backgroundColor: '#6c757d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const completeButton = {
  flex: 2,
  padding: '12px',
  color: 'white',
  border: 'none',
  borderRadius: '4px'
};

export default POSInterface;