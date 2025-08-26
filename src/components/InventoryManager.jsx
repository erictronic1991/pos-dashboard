import { useState, useEffect } from 'react';
import axios from 'axios';

const InventoryManager = () => {
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success', 'error', 'warning'
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'category', 'price', 'stock'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [inventoryStats, setInventoryStats] = useState({
    totalValue: 0,
    cashOnHand: 1000, // Starting cash amount
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashAction, setCashAction] = useState('add'); // 'add' or 'remove'

  const API_BASE = 'http://localhost:8000';

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: '',
    barcode: '',
    category: '',
    description: '',
    min_stock: '5'
  });

  useEffect(() => {
    loadProducts();
    loadLowStockProducts();
  }, []);

  // Calculate inventory statistics whenever products change
  useEffect(() => {
    calculateInventoryStats();
  }, [products]);

  const calculateInventoryStats = () => {
    const stats = products.reduce((acc, product) => {
      const productValue = product.price * product.quantity;
      
      // Debug logging for low stock detection
      if (product.quantity <= product.min_stock) {
        console.log(`Low stock detected: ${product.name} - Quantity: ${product.quantity}, Min Stock: ${product.min_stock}`);
      }
      
      return {
        totalValue: acc.totalValue + productValue,
        totalProducts: acc.totalProducts + 1,
        lowStockCount: acc.lowStockCount + (product.quantity <= product.min_stock ? 1 : 0),
        outOfStockCount: acc.outOfStockCount + (product.quantity === 0 ? 1 : 0)
      };
    }, {
      totalValue: 0,
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    });

    console.log('Calculated inventory stats:', stats);
    setInventoryStats(prev => ({
      ...prev,
      ...stats
    }));
  };

  // Cash management functions
  const handleCashUpdate = () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }

    const newCashAmount = cashAction === 'add' 
      ? inventoryStats.cashOnHand + amount 
      : inventoryStats.cashOnHand - amount;

    if (newCashAmount < 0) {
      setMessage('Cannot remove more cash than available');
      setMessageType('error');
      return;
    }

    setInventoryStats(prev => ({
      ...prev,
      cashOnHand: newCashAmount
    }));

    setMessage(`Cash ${cashAction === 'add' ? 'added' : 'removed'} successfully`);
    setMessageType('success');
    setShowCashModal(false);
    setCashAmount('');
  };

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage('Error loading products');
    }
  };

  const loadLowStockProducts = async () => {
    try {
      console.log('Loading low stock products from:', `${API_BASE}/products/low-stock`);
      const response = await axios.get(`${API_BASE}/products/low-stock`);
      console.log('Low stock products response:', response.data);
      setLowStockProducts(response.data);
    } catch (error) {
      console.error('Error loading low stock products:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setMessage(`Validation Error: ${validationErrors.join(', ')}`);
      setMessageType('error');
      return;
    }
    
    try {
      // Prepare data with proper types
      const submitData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        quantity: formData.quantity ? parseInt(formData.quantity) : 0,
        barcode: formData.barcode.trim() || undefined,
        category: formData.category.trim() || undefined,
        description: formData.description.trim() || undefined,
        min_stock: formData.min_stock ? parseInt(formData.min_stock) : 5
      };

      console.log('Submitting data:', submitData); // Debug log

      if (editingProduct) {
        // Update existing product
        const response = await axios.put(`${API_BASE}/products/${editingProduct.id}`, submitData);
        setMessage('Product updated successfully');
        setMessageType('success');
        console.log('Update response:', response.data);
      } else {
        // Add new product
        const response = await axios.post(`${API_BASE}/products`, submitData);
        setMessage(`Product added successfully. Barcode: ${response.data.barcode}`);
        setMessageType('success');
        console.log('Add response:', response.data);
      }
      
      resetForm();
      loadProducts();
      loadLowStockProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Better error handling
      let errorMessage = 'Error saving product';
      
      if (error.response) {
        // Server responded with error status
        console.error('Server error response:', error.response.data);
        errorMessage = `Server Error: ${error.response.data.error || error.response.statusText}`;
      } else if (error.request) {
        // Request was made but no response received
        console.error('Network error:', error.request);
        errorMessage = 'Network Error: Unable to connect to server';
      } else {
        // Something else happened
        console.error('Error details:', error.message);
        errorMessage = `Error: ${error.message}`;
      }
      
      setMessage(errorMessage);
      setMessageType('error');
    }
  };

  const validateForm = () => {
    const errors = [];
    
    // Required fields
    if (!formData.name || formData.name.trim() === '') {
      errors.push('Product name is required');
    }
    
    if (!formData.price || formData.price === '') {
      errors.push('Price is required');
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        errors.push('Price must be a positive number');
      }
    }
    
    // Optional but validated fields
    if (formData.quantity && formData.quantity !== '') {
      const quantity = parseInt(formData.quantity);
      if (isNaN(quantity) || quantity < 0) {
        errors.push('Quantity must be a non-negative number');
      }
    }
    
    if (formData.min_stock && formData.min_stock !== '') {
      const minStock = parseInt(formData.min_stock);
      if (isNaN(minStock) || minStock < 0) {
        errors.push('Minimum stock must be a non-negative number');
      }
    }
    
    // Barcode validation (if provided)
    if (formData.barcode && formData.barcode.trim() !== '') {
      const barcode = formData.barcode.trim();
      if (barcode.length < 3) {
        errors.push('Barcode must be at least 3 characters long');
      }
      if (!/^[0-9A-Za-z\-_]+$/.test(barcode)) {
        errors.push('Barcode can only contain letters, numbers, hyphens, and underscores');
      }
    }
    
    return errors;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      quantity: '',
      barcode: '',
      category: '',
      description: '',
      min_stock: '5'
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name || '',
      price: product.price || '',
      quantity: product.quantity || '',
      barcode: product.barcode || '',
      category: product.category || '',
      description: product.description || '',
      min_stock: product.min_stock || '5'
    });
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API_BASE}/products/${productId}`);
        setMessage('Product deleted successfully');
        loadProducts();
        loadLowStockProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        setMessage('Error deleting product');
      }
    }
  };

  const handleRestock = async (productId) => {
    const quantity = prompt('Enter quantity to add:');
    if (quantity && !isNaN(quantity) && parseInt(quantity) > 0) {
      try {
        await axios.post(`${API_BASE}/products/${productId}/restock`, {
          quantity: parseInt(quantity),
          notes: 'Manual restock'
        });
        setMessage('Product restocked successfully');
        loadProducts();
        loadLowStockProducts();
      } catch (error) {
        console.error('Error restocking product:', error);
        setMessage('Error restocking product');
      }
    }
  };

  const generateBarcode = async () => {
    try {
      const response = await axios.post(`${API_BASE}/barcode/generate`);
      setFormData(prev => ({ ...prev, barcode: response.data.barcode }));
    } catch (error) {
      console.error('Error generating barcode:', error);
      setMessage('Error generating barcode');
    }
  };

  // Get unique categories for filtering
  const getUniqueCategories = () => {
    const categories = products
      .map(product => product.category)
      .filter(category => category && category.trim() !== '')
      .filter((category, index, arr) => arr.indexOf(category) === index)
      .sort();
    return categories;
  };

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter(product => {
      // Apply stock filters
      if (filter === 'low-stock') {
        return product.quantity <= product.min_stock;
      }
      if (filter === 'out-of-stock') {
        return product.quantity === 0;
      }
      
      // Apply category filter
      if (filter !== 'all' && filter !== 'low-stock' && filter !== 'out-of-stock') {
        return product.category === filter;
      }
      
      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'stock':
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        default:
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const filteredProducts = getFilteredAndSortedProducts();
  const uniqueCategories = getUniqueCategories();

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Inventory Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showAddForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {/* Inventory Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: '#28a745',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>💰 Total Inventory Value</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            ₱{inventoryStats.totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>
            Total cash value of all products
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>📦 Total Products</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {inventoryStats.totalProducts}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>
            Different product types
          </div>
        </div>

        <div 
          style={{
            backgroundColor: '#17a2b8',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onClick={() => setShowCashModal(true)}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>💵 Cash on Hand</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            ₱{inventoryStats.cashOnHand.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>
            Available for sales & change
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '8px', fontStyle: 'italic' }}>
            Click to manage cash
          </div>
        </div>

        <div style={{
          backgroundColor: inventoryStats.lowStockCount > 0 ? '#ffc107' : '#6c757d',
          color: inventoryStats.lowStockCount > 0 ? '#212529' : 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>⚠️ Low Stock Items</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {inventoryStats.lowStockCount}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>
            Products below minimum stock
          </div>
        </div>

        {inventoryStats.outOfStockCount > 0 && (
          <div style={{
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>🚫 Out of Stock</h3>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
              {inventoryStats.outOfStockCount}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>
              Products with zero stock
            </div>
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: '#856404', margin: '0 0 10px 0' }}>
            ⚠️ Low Stock Alert ({lowStockProducts.length} items)
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {lowStockProducts.map(product => (
              <span
                key={product.id}
                style={{
                  backgroundColor: '#ffeaa7',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontSize: '12px',
                  color: '#856404'
                }}
              >
                {product.name} ({product.quantity} left)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Product Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Price (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Barcode</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={generateBarcode}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Generate
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Min Stock Level</label>
                <input
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_stock: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Sort Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Filter by:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minWidth: '150px'
            }}
          >
            <option value="all">All Products ({products.length})</option>
            <option value="low-stock">⚠️ Low Stock ({inventoryStats.lowStockCount})</option>
            <option value="out-of-stock">🚫 Out of Stock ({inventoryStats.outOfStockCount})</option>
            {uniqueCategories.length > 0 && <option disabled>──── Categories ────</option>}
            {uniqueCategories.map(category => (
              <option key={category} value={category}>
                📂 {category} ({products.filter(p => p.category === category).length})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minWidth: '120px'
            }}
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="price">Price</option>
            <option value="stock">Stock Level</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Order:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minWidth: '100px'
            }}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Category</th>
              <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #dee2e6' }}>Price</th>
              <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #dee2e6' }}>Stock</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Barcode</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id} style={{ 
                backgroundColor: product.quantity <= product.min_stock ? '#fff3cd' : 'white'
              }}>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {product.quantity <= product.min_stock && (
                      <span style={{ fontSize: '16px' }} title="Low Stock Warning">⚠️</span>
                    )}
                    {product.quantity === 0 && (
                      <span style={{ fontSize: '16px' }} title="Out of Stock">🚫</span>
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                      {product.description && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{product.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>{product.category || '-'}</span>
                    {product.category === 'Alcoholic Beverages' && (
                      <span style={{ fontSize: '14px' }} title="Alcoholic Beverages">🍺</span>
                    )}
                    {product.category === 'Beverages' && (
                      <span style={{ fontSize: '14px' }} title="Beverages">🥤</span>
                    )}
                    {product.category === 'Snacks' && (
                      <span style={{ fontSize: '14px' }} title="Snacks">🍿</span>
                    )}
                    {product.category === 'Instant Noodles' && (
                      <span style={{ fontSize: '14px' }} title="Instant Noodles">🍜</span>
                    )}
                    {product.category === 'Canned Goods' && (
                      <span style={{ fontSize: '14px' }} title="Canned Goods">🥫</span>
                    )}
                    {product.category === 'Personal Care' && (
                      <span style={{ fontSize: '14px' }} title="Personal Care">🧴</span>
                    )}
                    {product.category === 'Detergent' && (
                      <span style={{ fontSize: '14px' }} title="Detergent">🧽</span>
                    )}
                    {product.category === 'Seasonings' && (
                      <span style={{ fontSize: '14px' }} title="Seasonings">🧂</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right', border: '1px solid #dee2e6' }}>
                  ₱{product.price.toFixed(2)}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'right', 
                  border: '1px solid #dee2e6',
                  color: product.quantity <= 0 ? '#dc3545' : product.quantity <= product.min_stock ? '#856404' : 'inherit'
                }}>
                  {product.quantity}
                  {product.quantity <= product.min_stock && (
                    <span style={{ fontSize: '12px', display: 'block' }}>
                      (Min: {product.min_stock})
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px', border: '1px solid #dee2e6', fontSize: '12px' }}>
                  {product.barcode || '-'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleEdit(product)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRestock(product.id)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Restock
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cash Management Modal */}
      {showCashModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            minWidth: '400px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>💵 Manage Cash on Hand</h3>
            
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Current Cash:</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
                ₱{inventoryStats.cashOnHand.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Action:</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="radio"
                    value="add"
                    checked={cashAction === 'add'}
                    onChange={(e) => setCashAction(e.target.value)}
                  />
                  <span style={{ color: '#28a745' }}>➕ Add Cash</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input
                    type="radio"
                    value="remove"
                    checked={cashAction === 'remove'}
                    onChange={(e) => setCashAction(e.target.value)}
                  />
                  <span style={{ color: '#dc3545' }}>➖ Remove Cash</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Amount (₱):</label>
              <input
                type="number"
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Enter amount"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
                autoFocus
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: 'center',
              marginTop: '25px'
            }}>
              <button
                onClick={handleCashUpdate}
                style={{
                  padding: '10px 20px',
                  backgroundColor: cashAction === 'add' ? '#28a745' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {cashAction === 'add' ? '➕ Add Cash' : '➖ Remove Cash'}
              </button>
              <button
                onClick={() => {
                  setShowCashModal(false);
                  setCashAmount('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>

            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#666'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>💡 Cash Management Tips:</div>
              <div>• Add cash when receiving payments from customers</div>
              <div>• Remove cash when making change or bank deposits</div>
              <div>• Keep track for accurate daily reconciliation</div>
            </div>
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: 
            messageType === 'success' ? '#d4edda' :
            messageType === 'error' ? '#f8d7da' :
            messageType === 'warning' ? '#fff3cd' : '#d4edda',
          border: `1px solid ${
            messageType === 'success' ? '#c3e6cb' :
            messageType === 'error' ? '#f5c6cb' :
            messageType === 'warning' ? '#ffeaa7' : '#c3e6cb'
          }`,
          borderRadius: '4px',
          color: 
            messageType === 'success' ? '#155724' :
            messageType === 'error' ? '#721c24' :
            messageType === 'warning' ? '#856404' : '#155724'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              {messageType === 'success' ? '✅' :
               messageType === 'error' ? '❌' :
               messageType === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span style={{ flex: 1 }}>{message}</span>
            <button
              onClick={() => setMessage('')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                color: 'inherit',
                padding: '0 5px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;