import { useState, useEffect } from 'react';
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
  const [viewMode, setViewMode] = useState('browse');
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
      const response = await axios.get(`${API_BASE}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage('Error loading products');
    }
  };

  const loadBestsellers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/sales/bestsellers`);
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

  const getFilteredProducts = () => {
    let filtered = products;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name && product.name.toLowerCase().includes(search)) ||
        (product.brand && product.brand.toLowerCase().includes(search)) ||
        (product.category && product.category.toLowerCase().includes(search))
      );
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    return filtered;
  };

  const getDisplayProducts = () => {
    switch (viewMode) {
      case 'bestsellers':
        const bestsellerIds = bestsellers.map(b => b.product_id);
        let bestsellerProducts = products.filter(p => bestsellerIds.includes(p.id));
        if (searchTerm.trim()) {
          const search = searchTerm.toLowerCase();
          bestsellerProducts = bestsellerProducts.filter(product => 
            (product.name && product.name.toLowerCase().includes(search)) ||
            (product.brand && product.brand.toLowerCase().includes(search)) ||
            (product.category && product.category.toLowerCase().includes(search))
          );
        }
        if (selectedCategory !== 'all') {
          bestsellerProducts = bestsellerProducts.filter(product => product.category === selectedCategory);
        }
        return bestsellerProducts.length > 0 ? bestsellerProducts : [];
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
    const saleResponse = await axios.post(`${API_BASE}/sales`, saleData);
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
          // In your processSale function, change this line:
          const updateResponse = await axios.post(`${API_BASE}/cash/update`, updateData);
        // Instead of: `${API_BASE}/cash-register/update`
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
      loadProducts();
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

  const handleSearchInput = async (e) => {
    const input = e.target.value;
    setSearchTerm(input);

    const isBarcode = input.length >= 8 && /^\d+$/.test(input);
    if (e.key === 'Enter' && isBarcode) {
      await handleBarcodeScanned(input);
    }
  };

  return (
    <div className="pos-container">
      <style>{`
        .pos-container {
          display: flex;
          gap: 10px;
          padding: 10px;
          height: calc(100vh - var(--header-height, 80px) - 20px);
          min-height: 0;
          overflow: hidden;
          transition: all 0.3s ease;
          touch-action: none;
        }

        .left-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }

        .browse-products {
          display: flex;
          flex-direction: column;
          min-height: 0;
          flex: 1;
        }

        .products-header {
          flex-shrink: 0;
          padding: 10px;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .products-grid {
          display: grid;
          gap: 12px;
          padding: 10px;
          overflow-y: auto;
          touch-action: pan-y;
        }

        .right-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        
        .checkout-card {
          width: 100%;
          display: flex;
          flex-direction: column;
          height: 98%;
          min-height: 0;
        }

        .cart-container {
          flex: 1;
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 15px;
          background-color: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          overflow-y: auto;
          min-height: 0;
          touch-action: pan-y;
        }

        .summary-section {
          flex-shrink: 0;
          padding: 15px;
          background: #fff;
          border-top: 2px solid #ddd;
          position: sticky;
          bottom: 0;
          z-index: 10;
          height: 30vh; /* Try this and tweak */
        }

        .product-card {
          border: 1px solid #ddd;
          border-radius: 12px;
          cursor: pointer;
          background-color: #fff;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
          aspect-ratio: 2 / 3;
          display: flex;
          flex-direction: column;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }

        .product-card.out-of-stock {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .product-card.out-of-stock:hover {
          transform: none;
          box-shadow: none;
        }

        .product-image-container {
          flex: 0 0 60%;
          background-color: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .product-details {
          flex: 0 0 40%;
          padding: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .payment-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 15px;
        }

        .payment-button {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: clamp(12px, 2.5vw, 14px);
          min-height: 44px;
          min-width: 44px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: background-color 0.2s, border-color 0.2s;
        }

        .payment-button.cash {
          background-color: #e6fcffff;
          border-color: #c3e6cb;
          color: #155724;
        }

        .payment-button.cash.active {
          background-color: #60e4f8ff;
          border-color: #a3d6a9;
          color: #155724;
        }

        .payment-button.credit {
          background-color: #fff3e0;
          border-color: #ffcc80;
          color: #e65100;
        }

        .payment-button.credit.active {
          background-color: #ffcc80;
          border-color: #ffb74d;
          color: #e65100;
        }

        .payment-button.gcash {
          background-color: #e3f2fd;
          border-color: #90caf9;
          color: #1565c0;
        }

        .payment-button.gcash.active {
          background-color: #90caf9;
          border-color: #64b5f6;
          color: #1565c0;
        }

        .payment-button.paymaya {
          background-color: #d4edda;
          border-color: #81c784;
          color: #000000;
        }

        .payment-button.paymaya.active {
          background-color: #81c784;
          border-color: #4caf50;
          color: #000000;
        }

        .payment-button:hover:not(.active) {
          filter: brightness(95%);
        }

        /* Portrait Mode */
        @media (max-width: 767px) and (orientation: portrait) {
          .pos-container {
            flex-direction: column;
            gap: 0;
          }
          .left-panel {
            flex: none;
            height: 60%;
          }
          .right-panel {
            flex: none;
            height: 40%;
          }
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          }
          .checkout-card {
            max-width: none;
          }
          input, select, button {
            font-size: 14px;
            padding: 10px;
          }
          .summary-section {
            min-height: auto;
          }
          .payment-buttons {
            grid-template-columns: repeat(2, 1fr);
          }
          .payment-button {
            font-size: clamp(10px, 2.5vw, 12px);
            padding: 8px;
          }
        }

        /* Landscape Mode */
        @media (max-width: 1023px) and (orientation: landscape) {
          .pos-container {
            flex-direction: row;
          }
          .left-panel {
            flex: 0 0 60%;
          }
          .right-panel {
            flex: 0 0 40%;
          }
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          }
          .checkout-card {
            max-width: none;
          }
          .payment-button {
            font-size: clamp(11px, 2vw, 13px);
          }
        }

        /* Larger Screens */
        @media (min-width: 768px) and (orientation: portrait) {
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          }
        }

        @media (min-width: 1024px) {
          .pos-container {
            flex-direction: row;
          }
          .left-panel {
            flex: 0 0 70%;
          }
          .right-panel {
            flex: 0 0 30%;
          }
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          }
          .payment-buttons {
            grid-template-columns: repeat(4, 1fr);
          }
          .payment-button {
            font-size: clamp(12px, 1.5vw, 14px);
          }
        }

        /* Touch-Friendly Buttons */
        button {
          min-width: 44px;
          min-height: 44px;
          touch-action: manipulation;
        }

        /* Search Input Icon Animation */
        .search-icon {
          transition: transform 0.3s ease;
        }
        .search-icon.barcode-mode {
          transform: rotate(45deg);
        }
      `}</style>

      <div className="left-panel">
        <div className="browse-products">
          <div className="products-header">
            <h3>🛍️ Browse Products</h3>
            <div style={{ marginBottom: '10px', marginTop: '0px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search products or enter barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchInput}
                style={{
                  width: '86%',
                  padding: '10px 40px 10px 30px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <span
                className={`search-icon ${searchTerm.length >= 8 && /^\d+$/.test(searchTerm) ? 'barcode-mode' : ''}`}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: '#666'
                }}
              >
                {searchTerm.length >= 8 && /^\d+$/.test(searchTerm) ? '🔢' : '🔍'}
              </span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', borderBottom: '1px solid #ddd' }}>
              <button
                onClick={() => setViewMode('browse')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: viewMode === 'browse' ? '3px solid #007bff' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontWeight: viewMode === 'browse' ? 'bold' : 'normal',
                  color: viewMode === 'browse' ? '#007bff' : '#666',
                  fontSize: '14px'
                }}
              >
                📋 Browse All
              </button>
              <button
                onClick={() => setViewMode('bestsellers')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderBottom: viewMode === 'bestsellers' ? '3px solid #007bff' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontWeight: viewMode === 'bestsellers' ? 'bold' : 'normal',
                  color: viewMode === 'bestsellers' ? '#007bff' : '#666',
                  fontSize: '14px'
                }}
              >
                ⭐ Bestsellers
              </button>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
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
          </div>
          <div className="products-grid">
            {getDisplayProducts().map(product => (
              <div
                key={product.id}
                onClick={() => product.quantity > 0 && addToCart(product)}
                className={`product-card ${product.quantity <= 0 ? 'out-of-stock' : ''}`}
              >
                {viewMode === 'bestsellers' && bestsellers.some(b => b.product_id === product.id) && (
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    padding: '3px 6px',
                    borderRadius: '10px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    zIndex: 2,
                  }}>
                    ⭐ HOT
                  </div>
                )}
                <div className="product-image-container">
                  {product.image_url ? (
                    <img
                      src={`${API_BASE}${product.image_url}`}
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
                    fontSize: '40px',
                    color: '#ccc'
                  }}>
                    📦
                  </div>
                </div>
                {/* Product Card */}
                <div className="product-details">
                  <div>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '-20px',
                      fontSize: '13px',
                      lineHeight: '1.3',
                      minHeight: '34px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {product.name}
                    </div>
                    <div style={{ 
                        fontWeight: 'bold', 
                        fontSize: '13px', 
                        color: '#000000ff', 
                        fontWeight: '500', 
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                    }}>
                    {product.description}
                    </div>
                    {product.brand && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#007bff', 
                        fontWeight: '500', 
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        🏷️ {product.brand}
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      color: '#28a745', 
                      marginBottom: '4px' 
                    }}>
                      ₱{product.price.toFixed(2)}
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      color: product.quantity <= 5 ? '#dc3545' : '#666',
                      marginBottom: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>📦 Stock: {product.quantity}</span>
                      {product.quantity <= 5 && product.quantity > 0 && (
                        <span style={{ 
                          backgroundColor: '#ffc107', 
                          color: '#000', 
                          padding: '1px 3px', 
                          borderRadius: '5px',
                          fontSize: '8px',
                          fontWeight: 'bold'
                        }}>
                          LOW
                        </span>
                      )}
                    </div>
                    {product.category && (
                      <div style={{ fontSize: '9px', color: '#999', marginBottom: '3px' }}>
                        📂 {product.category}
                      </div>
                    )}
                    {product.barcode && (
                      <div style={{ fontSize: '8px', color: '#ccc' }}>
                        🔢 {product.barcode}
                      </div>
                    )}
                  </div>
                </div>
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
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    zIndex: 3,
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', marginBottom: '3px' }}>🚫</div>
                      <div>OUT OF STOCK</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {getDisplayProducts().length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '30px',
              color: '#666',
              fontSize: '14px'
            }}>
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
          <div className="cart-container">
            <h3 style={{ fontSize: '16px' }}>🛒 Shopping Cart</h3>
            {cart.length === 0 ? (
              <p style={{ fontSize: '14px' }}>Cart is empty</p>
            ) : (
              cart.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid #eee'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      ₱{item.price.toFixed(2)} each
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} style={{ ...qtyButton, fontSize: '14px' }}>-</button>
                    <span style={{ minWidth: '25px', textAlign: 'center', fontSize: '13px' }}>{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} style={{ ...qtyButton, fontSize: '14px' }}>+</button>
                    <div style={{ minWidth: '70px', textAlign: 'right', fontSize: '13px' }}>
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>
                    <button onClick={() => removeFromCart(item.id)} style={{ ...removeButton, padding: '6px 8px', fontSize: '12px' }}>Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="summary-section">
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
              👤 Customer Name:
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Mang Tonyo"
                style={{
                  width: '92%',
                  padding: '8px',
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </label>
            <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'right', marginBottom: '15px' }}>
              Total: ₱{total.toFixed(2)}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Payment Method:</label>
              <div className="payment-buttons">
                <button
                  className={`payment-button cash ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  Cash
                </button>
                <button
                  className={`payment-button credit ${paymentMethod === 'credit' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('credit')}
                >
                  Credit
                </button>
                <button
                  className={`payment-button gcash ${paymentMethod === 'gcash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('gcash')}
                >
                  GCash
                </button>
                <button
                  className={`payment-button paymaya ${paymentMethod === 'paymaya' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('paymaya')}
                >
                  PayMaya
                </button>
              </div>
            </div>
            {paymentMethod === 'cash' && (
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '5px' }}>💵 Payment Given</h3>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount given"
                  autoFocus
                  style={{
                    width: '92%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    textAlign: 'right'
                  }}
                />
                {paymentAmount && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '18px',
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
                <div style={{
                  textAlign: 'right',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  padding: '8px',
                  backgroundColor: '#e2f0d9',
                  border: '1px solid #c3e6cb',
                  borderRadius: '6px',
                  marginTop: '10px'
                }}>
                  Change Due: ₱{(changeAmount > 0 ? changeAmount : 0).toFixed(2)}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={clearCart} style={{ ...clearButton, padding: '10px', fontSize: '14px' }}>Clear Cart</button>
              <button
                onClick={processSale}
                disabled={cart.length === 0 || isProcessing}
                style={{
                  ...completeButton,
                  padding: '10px',
                  fontSize: '14px',
                  backgroundColor: cart.length === 0 || isProcessing ? '#ccc' : '#28a745',
                  cursor: cart.length === 0 || isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
            {message && (
              <div style={{
                marginTop: '15px',
                padding: '8px',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                color: '#155724',
                fontSize: '14px',
                flexShrink: 0
              }}>
                {message}
                <button
                  onClick={() => setMessage('')}
                  style={{
                    float: 'right',
                    background: 'none',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const qtyButton = {
  width: '44px',
  height: '44px',
  border: '1px solid #ddd',
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