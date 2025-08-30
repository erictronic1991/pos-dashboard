import { useState, useEffect } from 'react';
import axios from 'axios';
import CameraCapture from './CameraCapture';

const InventoryManager = () => {
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [nearExpirationProducts, setNearExpirationProducts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [inventoryStats, setInventoryStats] = useState({
    totalValue: 0,
    cashOnHand: 1000,
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashAction, setCashAction] = useState('add');
  const [showCamera, setShowCamera] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(null);
  const [showPullModal, setShowPullModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToPull, setQuantityToPull] = useState('');

  const API_BASE = 'http://localhost:8000';

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    quantity: '',
    barcode: '',
    category: '',
    brand: '',
    description: '',
    min_stock: '5',
    image_url: '',
    expiration_date: ''
  });

  const [restockData, setRestockData] = useState({
    quantity: '',
    notes: '',
    expiration_date: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      await loadProducts();
      await loadLowStockProducts();
      await loadNearExpirationProducts();
      await loadCashBalance();
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      console.log('DEBUG - Calculating inventory stats with products:', products);
      calculateInventoryStats();
    } else {
      console.log('DEBUG - Skipping stats calculation: No products loaded');
    }
  }, [products]);

  const calculateInventoryStats = () => {
    console.log('DEBUG - Starting calculateInventoryStats');
    const stats = products.reduce((acc, product) => {
      const productValue = (product.price || 0) * (product.quantity || 0);
      
      console.log(`DEBUG - Product: ${product.name}, Value: ${productValue}, Quantity: ${product.quantity}, Min Stock: ${product.min_stock}`);
      
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

    console.log('DEBUG - Calculated inventory stats:', stats);
    setInventoryStats(prev => ({
      ...prev,
      ...stats
    }));
  };

  const loadCashBalance = async () => {
    try {
      const response = await axios.get(`${API_BASE}/cash/balance`);
      setInventoryStats(prev => ({
        ...prev,
        cashOnHand: response.data.cashOnHand || 0
      }));
    } catch (error) {
      console.error('Error loading cash balance:', error);
      setMessage('Error loading cash balance');
      setMessageType('error');
    }
  };

  const loadProducts = async () => {
    try {
      console.log('DEBUG - Loading products from:', `${API_BASE}/products`);
      const response = await axios.get(`${API_BASE}/products`);
      console.log('DEBUG - Products response:', response.data);
      if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        console.error('DEBUG - Invalid products response: Not an array', response.data);
        setMessage('Invalid product data received from server');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage(error.response?.data?.error || 'Error loading products');
      setMessageType('error');
      if (!products.length) {
        setProducts([]);
      }
    }
  };

  const loadLowStockProducts = async () => {
    try {
      console.log('DEBUG - Loading low stock products from:', `${API_BASE}/products/low-stock`);
      const response = await axios.get(`${API_BASE}/products/low-stock`);
      console.log('DEBUG - Low stock products response:', response.data);
      if (Array.isArray(response.data)) {
        setLowStockProducts(response.data);
      } else {
        console.error('DEBUG - Invalid low stock products response: Not an array', response.data);
      }
    } catch (error) {
      console.error('Error loading low stock products:', error);
      setMessage('Error loading low stock products');
      setMessageType('error');
    }
  };

  const loadNearExpirationProducts = async () => {
  try {
    console.log('DEBUG - Loading near expiration products from:', `${API_BASE}/products/near-expiration`);
    const response = await axios.get(`${API_BASE}/products/near-expiration`);
    console.log('DEBUG - Raw API response for near-expiration:', response.data);
    if (Array.isArray(response.data)) {
      setNearExpirationProducts(response.data);
      console.log('DEBUG - Updated nearExpirationProducts:', response.data);
    } else {
      console.error('DEBUG - Invalid near expiration products response: Not an array', response.data);
      setNearExpirationProducts([]);
      setMessage('Invalid near-expiration data received from server');
      setMessageType('error');
    }
  } catch (error) {
    console.error('Error loading near expiration products:', error);
    setMessage('Error loading near expiration products');
    setMessageType('error');
    setNearExpirationProducts([]);
  }
};

  const handleCashUpdate = async () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/cash/update`, {
        amount,
        transaction_type: cashAction,
        description: `${cashAction === 'add' ? 'Added' : 'Removed'} cash via Inventory Manager`
      });

      setInventoryStats(prev => ({
        ...prev,
        cashOnHand: response.data.cashOnHand
      }));

      setMessage(response.data.message || `Cash ${cashAction === 'add' ? 'added' : 'removed'} successfully`);
      setMessageType('success');
      setShowCashModal(false);
      setCashAmount('');
    } catch (error) {
      console.error('Error updating cash:', error);
      setMessage(error.response?.data?.error || 'Error updating cash');
      setMessageType('error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setMessage(`Validation Error: ${validationErrors.join(', ')}`);
      setMessageType('error');
      return;
    }
    
    try {
      const submitData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        quantity: formData.quantity ? parseInt(formData.quantity) : 0,
        barcode: formData.barcode.trim() || undefined,
        category: formData.category.trim() || undefined,
        brand: formData.brand.trim() || undefined,
        description: formData.description.trim() || undefined,
        min_stock: formData.min_stock ? parseInt(formData.min_stock) : 5,
        image_url: formData.image_url || undefined,
        expiration_date: formData.expiration_date || undefined
      };

      console.log('DEBUG - Submitting data:', submitData);

      if (editingProduct) {
        await axios.put(`${API_BASE}/products/${editingProduct.id}`, submitData);
        setMessage('Product updated successfully');
      } else {
        const response = await axios.post(`${API_BASE}/products`, submitData);
        setMessage(`Product added successfully. Barcode: ${response.data.barcode}`);
      }
      
      setMessageType('success');
      resetForm();
      await loadProducts();
      await loadLowStockProducts();
      await loadNearExpirationProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      setMessage(error.response?.data?.error || 'Error saving product');
      setMessageType('error');
    }
  };

  const handleRestockSubmit = async (productId) => {
    const quantity = parseInt(restockData.quantity);
    if (!quantity || quantity <= 0) {
      setMessage('Please enter a valid quantity');
      setMessageType('error');
      return;
    }

    if (restockData.expiration_date) {
      const date = new Date(restockData.expiration_date);
      if (isNaN(date.getTime()) || date < new Date()) {
        setMessage('Expiration date must be a valid future date');
        setMessageType('error');
        return;
      }
    }

    try {
      await axios.post(`${API_BASE}/products/${productId}/restock`, {
        quantity,
        notes: restockData.notes || 'Manual restock',
        expiration_date: restockData.expiration_date || undefined
      });
      setMessage('Product restocked successfully');
      setMessageType('success');
      setShowRestockModal(null);
      setRestockData({ quantity: '', notes: '', expiration_date: '' });
      await loadProducts();
      await loadLowStockProducts();
      await loadNearExpirationProducts();
    } catch (error) {
      console.error('Error restocking product:', error);
      setMessage(error.response?.data?.error || 'Error restocking product');
      setMessageType('error');
    }
  };

  const handleExpirationAction = async (productId, expirationDate, action, quantity = null) => {
  console.log('DEBUG - handleExpirationAction called:', { productId, expirationDate, action, quantityToPull: quantity });
  console.log('DEBUG - Current nearExpirationProducts:', nearExpirationProducts);

  try {
    // Optimistic update for 'clear' action
    if (action === 'clear') {
      setNearExpirationProducts(prev => {
        const updated = prev.filter(product => 
          !(product.id === productId && product.expiration_date === expirationDate)
        );
        console.log('DEBUG - After optimistic update, nearExpirationProducts:', updated);
        return updated;
      });
    }

    const payload = { productId, expirationDate, action };
    if (action === 'pull' && quantity !== null) {
      payload.quantityToPull = parseInt(quantity);
    }
    console.log('DEBUG - Sending payload to API:', payload);
    const response = await axios.post(`${API_BASE}/products/expiration-notification`, payload);
    console.log('DEBUG - API response:', response.data);

    setMessage(response.data.message || (action === 'clear' ? 'Expiration notification cleared' : `Pulled ${quantity || 'all'} items from inventory`));
    setMessageType('success');

    // For 'pull' action, reload products and near-expiration list to reflect quantity changes
    if (action === 'pull') {
      await Promise.all([
        loadProducts(),
        loadNearExpirationProducts()
      ]);
    }
  } catch (error) {
    console.error('DEBUG - Error handling expiration action:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    const errorMessage = error.response?.data?.error || `Error handling expiration action: ${error.message}`;
    setMessage(errorMessage);
    setMessageType('error');
    // Revert optimistic update on error for 'clear' action
    if (action === 'clear') {
      console.log('DEBUG - Reverting optimistic update due to error');
      await loadNearExpirationProducts();
    }
  } finally {
    // Only reset modal-related states
    setShowPullModal(false);
    setSelectedProduct(null);
    setQuantityToPull('');
    // Always reload products to ensure consistency, but avoid reloading nearExpirationProducts for 'clear'
    await loadProducts();
    console.log('DEBUG - Final nearExpirationProducts after action:', nearExpirationProducts);
  }
};

  const openPullModal = (product) => {
    setSelectedProduct(product);
    setQuantityToPull('');
    setShowPullModal(true);
  };

  const handlePullSubmit = () => {
    if (!selectedProduct) return;
    const quantity = parseInt(quantityToPull);
    if (isNaN(quantity) || quantity <= 0 || quantity > selectedProduct.quantity) {
      setMessage(`Please enter a valid quantity (1 to ${selectedProduct.quantity})`);
      setMessageType('error');
      return;
    }
    handleExpirationAction(selectedProduct.id, selectedProduct.expiration_date, 'pull', quantity);
  };

  const validateForm = () => {
    const errors = [];
    
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
    
    if (formData.barcode && formData.barcode.trim() !== '') {
      const barcode = formData.barcode.trim();
      if (barcode.length < 3) {
        errors.push('Barcode must be at least 3 characters long');
      }
      if (!/^[0-9A-Za-z\-_]+$/.test(barcode)) {
        errors.push('Barcode can only contain letters, numbers, hyphens, and underscores');
      }
    }
    
    if (formData.expiration_date) {
      const date = new Date(formData.expiration_date);
      if (isNaN(date.getTime())) {
        errors.push('Expiration date must be a valid date');
      } else if (date < new Date()) {
        errors.push('Expiration date cannot be in the past');
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
      brand: '',
      description: '',
      min_stock: '5',
      image_url: '',
      expiration_date: ''
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const handleImageCaptured = (imageUrl) => {
    setFormData(prev => ({ ...prev, image_url: imageUrl }));
    setMessage('Product image added successfully!');
    setMessageType('success');
    setShowCamera(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setMessage('Please upload a PNG, JPG, or JPEG image');
      setMessageType('error');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setMessage('Image size must be less than 5MB');
      setMessageType('error');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_BASE}/products/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image_url: response.data.image_url }));
      setMessage('Image uploaded successfully!');
      setMessageType('success');
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage(error.response?.data?.error || 'Error uploading image');
      setMessageType('error');
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    setMessage('Image removed successfully');
    setMessageType('success');
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name || '',
      price: product.price || '',
      quantity: product.quantity || '',
      barcode: product.barcode || '',
      category: product.category || '',
      brand: product.brand || '',
      description: product.description || '',
      min_stock: product.min_stock || '5',
      image_url: product.image_url || '',
      expiration_date: product.expiration_date || ''
    });
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleRestock = (product) => {
    setShowRestockModal(product);
    setRestockData({ quantity: '', notes: '', expiration_date: '' });
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API_BASE}/products/${productId}`);
        setMessage('Product deleted successfully');
        setMessageType('success');
        await loadProducts();
        await loadLowStockProducts();
        await loadNearExpirationProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        setMessage('Error deleting product');
        setMessageType('error');
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
      setMessageType('error');
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

  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter(product => {
      if (filter === 'low-stock') {
        return product.quantity <= product.min_stock;
      }
      if (filter === 'out-of-stock') {
        return product.quantity === 0;
      }
      if (filter !== 'all' && filter !== 'low-stock' && filter !== 'out-of-stock') {
        return product.category === filter;
      }
      return true;
    });

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

      {/* Near Expiration Alert */}
      {nearExpirationProducts.length > 0 && (
        <div style={{
          backgroundColor: '#ffebee',
          border: '1px solid #ef9a9a',
          borderRadius: '4px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: '#c62828', margin: '0 0 10px 0' }}>
            🕒 Near Expiration Alert ({nearExpirationProducts.length} items)
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {nearExpirationProducts.map(product => (
              <div key={`${product.id}-${product.expiration_date}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    backgroundColor: '#ef9a9a',
                    padding: '5px 10px',
                    borderRadius: '15px',
                    fontSize: '12px',
                    color: '#c62828'
                  }}
                >
                  {product.name} (Expires: {product.expiration_date}) - {product.quantity} units
                </span>
                <button
                  onClick={() => handleExpirationAction(product.id, product.expiration_date, 'clear')}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  No Action Needed
                </button>
                <button
                  onClick={() => openPullModal(product)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Pull from Inventory
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pull from Inventory Modal */}
      {showPullModal && selectedProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '5px',
            width: '300px',
            textAlign: 'center'
          }}>
            <h3>Pull Items from Inventory</h3>
            <p>
              {selectedProduct.name} (ID: {selectedProduct.id})<br />
              Current quantity: {selectedProduct.quantity}<br />
              Expires on: {selectedProduct.expiration_date}
            </p>
            <input
              type="number"
              min="1"
              max={selectedProduct.quantity}
              value={quantityToPull}
              onChange={(e) => setQuantityToPull(e.target.value)}
              placeholder="Quantity to pull"
              style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
            />
            <div>
              <button
                onClick={handlePullSubmit}
                style={{ marginRight: '10px', padding: '5px 10px' }}
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowPullModal(false);
                  setSelectedProduct(null);
                  setQuantityToPull('');
                }}
                style={{ padding: '5px 10px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                <label style={{ display: 'block', marginBottom: '5px' }}>Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
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
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Expiration Date</label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiration_date: e.target.value }))}
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

            {/* Product Image Section */}
            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                📸 Product Image
              </label>
              
              {formData.image_url ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '15px',
                  padding: '15px',
                  border: '2px dashed #28a745',
                  borderRadius: '8px',
                  backgroundColor: '#f8fff9'
                }}>
                  <img
                    src={`${API_BASE}${formData.image_url}`}
                    alt="Product preview"
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #28a745'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#28a745', fontWeight: 'bold', marginBottom: '5px' }}>
                      ✅ Image added successfully!
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Image will be displayed in POS and inventory
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '20px',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  textAlign: 'center',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
                  <div style={{ marginBottom: '15px', color: '#666' }}>
                    Add a product image to help with identification
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      📸 Take Photo
                    </button>
                    <label
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      📤 Upload Image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#999', 
                    marginTop: '10px',
                    fontStyle: 'italic'
                  }}>
                    Optional: Images help staff identify products quickly
                  </div>
                </div>
              )}
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

      {/* Restock Modal */}
      {showRestockModal && (
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
            <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>
              📦 Restock {showRestockModal.name}
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Quantity *
              </label>
              <input
                type="number"
                value={restockData.quantity}
                onChange={(e) => setRestockData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity to add"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Notes
              </label>
              <textarea
                value={restockData.notes}
                onChange={(e) => setRestockData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional restock notes"
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Expiration Date
              </label>
              <input
                type="date"
                value={restockData.expiration_date}
                onChange={(e) => setRestockData(prev => ({ ...prev, expiration_date: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => handleRestockSubmit(showRestockModal.id)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Restock
              </button>
              <button
                onClick={() => setShowRestockModal(null)}
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
          </div>
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
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>Image</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Brand</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Category</th>
              <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #dee2e6' }}>Price</th>
              <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #dee2e6' }}>Stock</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Barcode</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Expiration</th>
              <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id} style={{ 
                backgroundColor: product.quantity <= product.min_stock ? '#fff3cd' : 'white'
              }}>
                <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                  {product.image_url ? (
                    <img
                      src={`${API_BASE}${product.image_url}`}
                      alt={product.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid #ccc'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '12px', color: '#999' }}>No image</span>
                  )}
                </td>
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
                  <span>{product.brand || '-'}</span>
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
                <td style={{ padding: '12px', border: '1px solid #dee2e6', fontSize: '12px' }}>
                  {product.expiration_date || '-'}
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
                      onClick={() => handleRestock(product)}
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

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onImageCaptured={handleImageCaptured}
          onClose={() => setShowCamera(false)}
        />
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