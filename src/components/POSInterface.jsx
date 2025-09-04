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
  gap: 8px;
  padding: 8px;
  height: calc(100vh - var(--header-height, 0px) - 16px);
  min-height: 0;
  overflow: hidden;
  background: #f8f9fa;
}

.left-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  max-width: 60%; /* Reduced from 68% to accommodate wider right panel */
}

.right-panel {
  display: flex;
  flex-direction: column;
  width: 40%;
  min-width: 480px;
  max-width: 530px;
  min-height: 0;
  margin-bottom: -30px; /* This will move the entire right panel down */
}

        .browse-products {
          display: flex;
          flex-direction: column;
          min-height: 0;
          flex: 1;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .products-header {
          flex-shrink: 0;
          padding: 12px;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
        }

        .products-header h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .category-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
          max-height: 80px;
          overflow-y: auto;
          padding: 2px 0;
          scrollbar-width: thin;
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

        .category-tab {
          padding: 6px 10px;
          border: 1px solid #e9ecef;
          border-radius: 16px;
          cursor: pointer;
          background: #fff;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: fit-content;
          flex-shrink: 0;
          height: 28px;
        }

        .category-tab:hover {
          background: #f8f9fa;
          border-color: #dee2e6;
        }

        .category-tab.active {
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          border-color: #0056b3;
        }

        .category-count {
          background: rgba(255,255,255,0.9);
          color: #007bff;
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 9px;
          font-weight: 600;
          min-width: 16px;
          text-align: center;
        }

        .category-tab.active .category-count {
          background: rgba(255,255,255,0.25);
          color: white;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 8px;
          padding: 12px;
          overflow-y: auto;
          flex: 1;
          background: #f8f9fa;
        }

        @media (max-width: 1366px) {
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 6px;
            padding: 8px;
          }
        }

        .checkout-card {
          width: 100%;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .cart-header {
          flex-shrink: 0;
          padding: 12px;
          background: #fff;
          border-bottom: 1px solid #e9ecef;
        }

        .cart-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
        }

        .cart-container {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
          min-height: 0;
          background: #fff;
          /* Add padding bottom to prevent content from hiding behind fixed summary */
          padding-bottom: 20px;
        }

        /* Find this CSS rule in your code and update the bottom property */
.summary-section {
  flex: 1;
  padding: 16px;
  background: #fff;
  max-height: none;
  overflow: visible;
  position: sticky;
  bottom: 8px; /* Add this line to move it down by ~30px */
  border-top: 2px solid #e9ecef;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.05);
}
        .product-card {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          cursor: pointer;
          background-color: #fff;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 180px;
          height: auto;
        }

        @media (max-width: 1366px) {
          .product-card {
            min-height: 160px;
          }
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #007bff;
        }

        .product-card.out-of-stock {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .product-card.out-of-stock:hover {
          transform: none;
          box-shadow: none;
          border-color: #e9ecef;
        }

        .product-image-container {
          flex: 0 0 90px;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 1366px) {
          .product-image-container {
            flex: 0 0 80px;
          }
        }

        .product-details {
          flex: 1;
          padding: 10px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 90px;
        }

        @media (max-width: 1366px) {
          .product-details {
            min-height: 80px;
            padding: 8px;
          }
        }

        .product-name {
          font-weight: 600;
          font-size: 12px;
          line-height: 1.3;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 32px;
        }

        @media (max-width: 1366px) {
          .product-name {
            font-size: 11px;
            min-height: 28px;
          }
        }

        .product-description {
          font-size: 10px;
          color: #6c757d;
          margin-bottom: 6px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-brand {
          font-size: 9px;
          color: #007bff;
          font-weight: 500;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .product-price {
          font-size: 14px;
          font-weight: bold;
          color: #28a745;
          margin-bottom: 6px;
        }

        @media (max-width: 1366px) {
          .product-price {
            font-size: 13px;
          }
        }

        .product-stock {
          font-size: 9px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .payment-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  /* Change this line */
  gap: 4px;
  margin-bottom: 10px;
}

        .payment-button {
  padding: 6px 2px; /* Reduced horizontal padding from 4px to 2px */
  border: 1px solid #e9ecef;
  border-radius: 4px;
  cursor: pointer;
  font-size: 8px; /* Reduced from 9px to 8px for better fit */
  min-height: 28px;
  text-align: center;
  transition: all 0.2s ease;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
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
        }

        .stock-badge {
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 8px;
          font-weight: bold;
          white-space: nowrap;
        }

        .bestseller-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: linear-gradient(135deg, #ffc107, #ffb300);
          color: #000;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 8px;
          font-weight: bold;
          z-index: 2;
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
          font-size: 10px;
          font-weight: bold;
          border-radius: 8px;
          z-index: 3;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #f0f0f0;
          font-size: 11px;
        }

        .cart-item-info {
          flex: 1;
          min-width: 0;
        }

        .cart-item-name {
          font-weight: 600;
          font-size: 11px;
          line-height: 1.2;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cart-item-price {
          font-size: 10px;
          color: #6c757d;
        }

        .cart-controls {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .qty-button {
          width: 24px;
          height: 24px;
          border: 1px solid #dee2e6;
          background: #fff;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .qty-button:hover {
          background: #f8f9fa;
        }

        .remove-button {
          padding: 4px 8px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 9px;
          font-weight: 500;
        }

        .remove-button:hover {
          background: #c82333;
        }

        input, select {
          font-size: 12px;
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          width: 100%;
        }

        button {
          min-width: 36px;
          min-height: 36px;
          touch-action: manipulation;
        }

        .search-container {
          position: relative;
          margin-bottom: 8px;
        }

        .search-input {
          width: 100%;
          padding: 8px 30px 8px 28px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          font-size: 12px;
          outline: none;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }

        .search-icon {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: #6c757d;
          transition: transform 0.3s ease;
        }

        .search-icon.barcode-mode {
          transform: translateY(-50%) rotate(45deg);
        }

        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
          color: #6c757d;
          padding: 2px;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .total-display {
          font-size: 2px;
          font-weight: bold;
          text-align: right;
          margin-bottom: 10px;
          color: #28a745;
        }

        @media (max-width: 1366px) {
          .total-display {
            font-size: 18px;
          }
          
          .cart-item-name {
            font-size: 10px;
          }
          
          .cart-item-price {
            font-size: 9px;
          }
        }

        .action-buttons {
          display: flex;
          gap: 6px;
          margin-top: 10px;
        }

        .clear-cart-btn {
          flex: 1;
          padding: 8px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
        }

        .complete-sale-btn {
          flex: 2;
          padding: 8px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
        }

        .complete-sale-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .message-alert {
          margin-top: 8px;
          padding: 8px;
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
          color: #155724;
          font-size: 11px;
          position: relative;
        }

        .message-close {
          position: absolute;
          right: 8px;
          top: 8px;
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
          color: #155724;
          padding: 0;
          width: 16px;
          height: 16px;
        }

        .change-display {
          text-align: right;
          font-size: 14px;
          font-weight: bold;
          padding: 6px 8px;
          background: #e2f0d9;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
          margin-top: 8px;
          color: #155724;
        }

        @media (max-width: 1366px) {
          .change-display {
            font-size: 12px;
          }
        }

        .empty-cart-message {
          text-align: center;
          color: #6c757d;
          font-size: 12px;
          padding: 20px;
        }

        .empty-products-message {
          text-align: center;
          padding: 20px;
          color: #6c757d;
          font-size: 12px;
        }
      `}</style>

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
                  <div className="bestseller-badge">
                    ⭐ HOT
                  </div>
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
                    fontSize: '32px',
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
                  </div>
                </div>
                
                {product.quantity <= 0 && (
                  <div className="out-of-stock-overlay">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', marginBottom: '2px' }}>🚫</div>
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
  <style>{`
    .checkout-card {
      width: 100%;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      overflow: hidden;
    }

    .cart-header {
      flex-shrink: 0;
      padding: 12px;
      background: #fff;
      border-bottom: 1px solid #e9ecef;
    }

    .cart-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }

    .cart-container {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      min-height: 150px;
      max-height: 28vh;
      background: #fff;
      border-bottom: 1px solid #e9ecef;
    }

    .summary-section {
      flex: 1;
      padding: 16px;
      background: #fff;
      max-height: none;
      overflow: visible;
      position: sticky;
      bottom: 0;
      border-top: 2px solid #e9ecef;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.05);
    }

    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 11px;
    }

    .cart-item:last-child {
      border-bottom: none;
    }

    .cart-item-info {
      flex: 1;
      min-width: 0;
      margin-right: 8px;
    }

    .cart-item-name {
      font-weight: 600;
      font-size: 11px;
      line-height: 1.3;
      margin-bottom: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cart-item-price {
      font-size: 10px;
      color: #6c757d;
    }

    .cart-controls {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .qty-button {
      width: 24px;
      height: 24px;
      border: 1px solid #dee2e6;
      background: #fff;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }

    .qty-button:hover {
      background: #f8f9fa;
    }

    .remove-button {
      padding: 4px 6px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 8px;
      font-weight: 500;
      white-space: nowrap;
    }

    .remove-button:hover {
      background: #c82333;
    }

    .payment-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  /* Change this line */
  gap: 4px;
  margin-bottom: 10px;
}

    .payment-button {
      padding: 6px 4px;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      cursor: pointer;
      font-size: 9px;
      min-height: 28px;
      text-align: center;
      transition: all 0.2s ease;
      font-weight: 500;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
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
    }

    .total-display {
      font-size: 20px;
      font-weight: bold;
      text-align: right;
      margin-bottom: 10px;
      color: #28a745;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 6px;
      border: 2px solid #e9ecef;
    }

    @media (max-width: 1366px) {
      .total-display {
        font-size: 18px;
      }
      
      .cart-item-name {
        font-size: 10px;
      }
      
      .cart-item-price {
        font-size: 9px;
      }
    }

    .action-buttons {
      display: flex;
      gap: 6px;
      margin-top: 10px;
    }

    .clear-cart-btn {
      flex: 1;
      padding: 8px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
    }

    .complete-sale-btn {
      flex: 2;
      padding: 8px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
    }

    .complete-sale-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .message-alert {
      margin-top: 8px;
      padding: 8px;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      color: #155724;
      font-size: 11px;
      position: relative;
    }

    .message-close {
      position: absolute;
      right: 8px;
      top: 8px;
      background: none;
      border: none;
      font-size: 14px;
      cursor: pointer;
      color: #155724;
      padding: 0;
      width: 16px;
      height: 16px;
    }

    .change-display {
      text-align: right;
      font-size: 14px;
      font-weight: bold;
      padding: 6px 8px;
      background: #e2f0d9;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      margin-top: 8px;
      color: #155724;
    }

    @media (max-width: 1366px) {
      .change-display {
        font-size: 12px;
      }
    }

    .empty-cart-message {
      text-align: center;
      color: #6c757d;
      font-size: 12px;
      padding: 20px;
    }

    input, select {
      font-size: 12px;
      padding: 6px 8px;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      width: 100%;
    }

    button {
      min-width: 36px;
      min-height: 36px;
      touch-action: manipulation;
    }

    /* Custom scrollbar for cart container */
    .cart-container::-webkit-scrollbar {
      width: 6px;
    }

    .cart-container::-webkit-scrollbar-track {
      background: #f8f9fa;
      border-radius: 3px;
    }

    .cart-container::-webkit-scrollbar-thumb {
      background: #dee2e6;
      border-radius: 3px;
    }

    .cart-container::-webkit-scrollbar-thumb:hover {
      background: #adb5bd;
    }

    .cart-scroll-indicator {
      text-align: center;
      font-size: 10px;
      color: #6c757d;
      padding: 4px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      display: none;
    }

    .cart-container.has-scroll + .cart-scroll-indicator {
      display: block;
    }
  `}</style>

  <div className="checkout-card">
    <div className="cart-header">
      <h3>Shopping Cart {cart.length > 0 && `(${cart.length})`}</h3>
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
                minWidth: '20px', 
                textAlign: 'center', 
                fontSize: '11px',
                fontWeight: '600',
                padding: '0 4px'
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
                minWidth: '55px', 
                textAlign: 'right', 
                fontSize: '11px', 
                fontWeight: '600',
                margin: '0 6px'
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
    
    <div className="cart-scroll-indicator">
      Scroll to see more items
    </div>
    
    <div className="summary-section">
      
      <div className="total-display">
        Total: ₱{total.toFixed(2)}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
          Payment Method:
        </label>
        <div className="payment-buttons">
          <button
            className={`payment-button cash ${paymentMethod === 'cash' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('cash')}
          >
            💵 Cash
          </button>
          <button
            className={`payment-button credit ${paymentMethod === 'credit' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('credit')}
          >
            📝 Credit
          </button>
          <button
            className={`payment-button gcash ${paymentMethod === 'gcash' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('gcash')}
          >
            📱 GCash
          </button>
          <button
            className={`payment-button paymaya ${paymentMethod === 'paymaya' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('paymaya')}
          >
            💳 PayMaya
          </button>
        </div>
      </div>
      
      {paymentMethod === 'cash' && (
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>
        👤 Customer Name:
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Mang Tonyo"
          style={{
            marginTop: '4px',
            fontSize: '11px'
          }}
        />
      </label>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
            💵 Payment Given:
          </label>
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Enter amount given"
            autoFocus
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              textAlign: 'right'
            }}
          />
          {paymentAmount && (
            <div style={{
              marginTop: '6px',
              fontSize: '14px',
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
          <div className="change-display">
            Change Due: ₱{(changeAmount > 0 ? changeAmount : 0).toFixed(2)}
          </div>
        </div>
      )}
      
      <div className="action-buttons">
        <button onClick={clearCart} className="clear-cart-btn">
          Clear Cart
        </button>
        <button
          onClick={processSale}
          disabled={cart.length === 0 || isProcessing}
          className="complete-sale-btn"
        >
          {isProcessing ? 'Processing...' : 'Checkout'}
        </button>
      </div>
      
      {message && (
        <div className="message-alert">
          {message}
          <button
            className="message-close"
            onClick={() => setMessage('')}
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