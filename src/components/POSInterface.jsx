import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import api from "../api";
import { API_BASE_URL } from '../api'; // Adjust pa

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
      const saleResponse = await api.get('/sales', saleData);
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
            const updateResponse = await api.get(`/cash/update`, updateData);
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
          padding: 15px;
          background: #fff;
          border-bottom: 2px solid #e5e7eb;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .category-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 15px;
          max-height: 120px;
          overflow-y: auto;
          padding: 5px 0;
          scrollbar-width: thin;
          scrollbar-color: #ddd transparent;
          align-content: flex-start;
        }

        .category-tabs::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }

        .category-tabs::-webkit-scrollbar-track {
          background: #f8f9fa;
          border-radius: 4px;
        }

        .category-tabs::-webkit-scrollbar-thumb {
          background: #dee2e6;
          border-radius: 4px;
        }

        .category-tabs::-webkit-scrollbar-thumb:hover {
          background: #adb5bd;
        }

        .category-tab {
          padding: 8px 14px;
          border: 2px solid #e9ecef;
          border-radius: 25px;
          cursor: pointer;
          background: #fff;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: fit-content;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          flex-shrink: 0;
        }

        .category-tab:hover {
          background: #f8f9fa;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #dee2e6;
        }

        .category-tab.active {
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          border-color: #0056b3;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,123,255,0.3);
        }

        .category-tab.active:hover {
          background: linear-gradient(135deg, #0056b3, #003d82);
          box-shadow: 0 8px 25px rgba(0,123,255,0.4);
        }

        .category-count {
          background: rgba(255,255,255,0.9);
          color: #007bff;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          min-width: 20px;
          text-align: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .category-tab.active .category-count {
          background: rgba(255,255,255,0.25);
          color: white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        .products-grid {
          display: grid;
          gap: 12px;
          padding: 15px;
          overflow-y: auto;
          touch-action: pan-y;
          grid-auto-rows: max-content;
          background: #f8f9fa;
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
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .cart-container {
          flex: 1;
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          margin: 15px;
          margin-bottom: 0;
          padding: 15px;
          background-color: #fff;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
          overflow-y: auto;
          min-height: 0;
          touch-action: pan-y;
        }

        .summary-section {
          flex-shrink: 0;
          padding: 15px;
          background: #fff;
          border-top: 2px solid #e9ecef;
          position: sticky;
          bottom: 0;
          z-index: 10;
          height: 30vh;
        }

        .product-card {
          border: 2px solid #e9ecef;
          border-radius: 16px;
          cursor: pointer;
          background-color: #fff;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 280px;
          height: auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          border-color: #007bff;
        }

        .product-card.out-of-stock {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .product-card.out-of-stock:hover {
          transform: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border-color: #e9ecef;
        }

        .product-image-container {
          flex: 0 0 150px;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .product-details {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 130px;
        }

        .product-name {
          font-weight: bold;
          font-size: 14px;
          line-height: 1.3;
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 36px;
          word-wrap: break-word;
        }

        .product-description {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 4px;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-brand {
          font-size: 11px;
          color: #007bff;
          font-weight: 600;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .product-price {
          font-size: 16px;
          font-weight: bold;
          color: #28a745;
          margin-bottom: 6px;
        }

        .product-stock {
          font-size: 10px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .product-category {
          font-size: 9px;
          color: #adb5bd;
          margin-bottom: 3px;
        }

        .product-barcode {
          font-size: 8px;
          color: #ced4da;
          word-break: break-all;
        }

        .payment-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 15px;
        }

        .payment-button {
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          cursor: pointer;
          font-size: clamp(12px, 2.5vw, 14px);
          min-height: 50px;
          min-width: 50px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 600;
        }

        .payment-button.cash {
          background: linear-gradient(135deg, #e3f2fd, #bbdefb);
          border-color: #90caf9;
          color: #1565c0;
        }

        .payment-button.cash.active {
          background: linear-gradient(135deg, #2196f3, #1976d2);
          border-color: #1565c0;
          color: white;
          box-shadow: 0 4px 12px rgba(33,150,243,0.3);
        }

        .payment-button.credit {
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border-color: #ffcc80;
          color: #f57c00;
        }

        .payment-button.credit.active {
          background: linear-gradient(135deg, #ff9800, #f57c00);
          border-color: #ef6c00;
          color: white;
          box-shadow: 0 4px 12px rgba(255,152,0,0.3);
        }

        .payment-button.gcash {
          background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
          border-color: #81c784;
          color: #2e7d32;
        }

        .payment-button.gcash.active {
          background: linear-gradient(135deg, #4caf50, #388e3c);
          border-color: #2e7d32;
          color: white;
          box-shadow: 0 4px 12px rgba(76,175,80,0.3);
        }

        .payment-button.paymaya {
          background: linear-gradient(135deg, #fce4ec, #f8bbd9);
          border-color: #f48fb1;
          color: #ad1457;
        }

        .payment-button.paymaya.active {
          background: linear-gradient(135deg, #e91e63, #c2185b);
          border-color: #ad1457;
          color: white;
          box-shadow: 0 4px 12px rgba(233,30,99,0.3);
        }

        .payment-button:hover:not(.active) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .stock-badge {
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 9px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .bestseller-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: linear-gradient(135deg, #ffc107, #ffb300);
          color: #000;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 9px;
          font-weight: bold;
          z-index: 2;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        .out-of-stock-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(220, 53, 69, 0.9), rgba(183, 28, 28, 0.9));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
          border-radius: 16px;
          z-index: 3;
          backdrop-filter: blur(2px);
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
          .product-card {
            min-height: 260px;
          }
          .product-image-container {
            flex: 0 0 130px;
          }
          .product-details {
            min-height: 120px;
          }
          .checkout-card {
            max-width: none;
            border-radius: 12px 12px 0 0;
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
          .category-tabs {
            gap: 6px;
            max-height: 100px;
          }
          .category-tab {
            font-size: 12px;
            padding: 6px 12px;
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
          .product-card {
            min-height: 240px;
          }
          .product-image-container {
            flex: 0 0 120px;
          }
          .checkout-card {
            max-width: none;
          }
          .payment-button {
            font-size: clamp(11px, 2vw, 13px);
          }
          .category-tabs {
            max-height: 80px;
          }
        }

        /* Larger Screens */
        @media (min-width: 768px) and (orientation: portrait) {
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          }
          .product-card {
            min-height: 270px;
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
          .product-card {
            min-height: 300px;
          }
          .product-image-container {
            flex: 0 0 160px;
          }
          .product-details {
            min-height: 130px;
          }
          .payment-buttons {
            grid-template-columns: repeat(4, 1fr);
          }
          .payment-button {
            font-size: clamp(12px, 1.5vw, 14px);
          }
          .category-tabs {
            max-height: 150px;
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

        /* Better scrollbar styling for category tabs */
        .category-tabs {
          scrollbar-width: thin;
          scrollbar-color: #dee2e6 #f8f9fa;
        }

        .category-tabs::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }

        .category-tabs::-webkit-scrollbar-track {
          background: #f8f9fa;
          border-radius: 2px;
        }

        .category-tabs::-webkit-scrollbar-thumb {
          background: #dee2e6;
          border-radius: 2px;
        }

        .category-tabs::-webkit-scrollbar-thumb:hover {
          background: #adb5bd;
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
                  padding: '12px 40px 12px 30px',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#007bff';
                  e.target.style.boxShadow = '0 4px 12px rgba(0,123,255,0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
              <span
                className={`search-icon ${searchTerm.length >= 8 && /^\d+$/.test(searchTerm) ? 'barcode-mode' : ''}`}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: '#6c757d'
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
                    fontSize: '16px',
                    cursor: 'pointer',
                    color: '#6c757d',
                    padding: '2px',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              )}
            </div>
            
            {/* Category Tabs */}
            <div className="category-tabs">
              <div
                onClick={() => setSelectedCategory('all')}
                className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
              >
                <span>🏪</span>
                <span>All Products</span>
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
                  <div className="bestseller-badge">
                    ⭐ HOT
                  </div>
                )}
                
                <div className="product-image-container">
                  {product.image_url ? (
                    <>
                  
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
                    </>
                  ) : null}
                  <div style={{
                    display: product.image_url ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    fontSize: '40px',
                    color: '#dee2e6'
                  }}>
                    📦
                  </div>
                </div>
                
                <div className="product-details">
                  <div>
                    <div className="product-name">
                      {product.name}
                    </div>
                    
                    {product.description && (
                      <div className="product-description">
                        {product.description}
                      </div>
                    )}
                    
                    {product.brand && (
                      <div className="product-brand">
                        🏷️ {product.brand}
                      </div>
                    )}
                    
                    <div className="product-price">
                      ₱{product.price.toFixed(2)}
                    </div>
                    
                    <div className="product-stock" style={{ 
                      color: product.quantity <= 5 ? '#dc3545' : '#6c757d'
                    }}>
                      <span>📦 Stock: {product.quantity}</span>
                      {product.quantity <= 5 && product.quantity > 0 && (
                        <span className="stock-badge">
                          LOW
                        </span>
                      )}
                    </div>
                    
                    {product.category && (
                      <div className="product-category">
                        📂 {product.category}
                      </div>
                    )}
                    
                    {product.barcode && (
                      <div className="product-barcode">
                        🔢 {product.barcode}
                      </div>
                    )}
                  </div>
                </div>
                
                {product.quantity <= 0 && (
                  <div className="out-of-stock-overlay">
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
              color: '#6c757d',
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
                  borderBottom: '1px solid #e9ecef'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
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
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </label>
            <div style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'right', marginBottom: '15px', color: '#28a745', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
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
                    border: '1px solid #dee2e6',
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