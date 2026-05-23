const RecycleItem = require('../models/RecycleItem');
const User        = require('../models/User');
const EcoPointHistory = require('../models/EcoPointHistory');
const ProductView = require('../models/ProductView');
const Order       = require('../models/Order');
const { CATEGORIES } = require('../models/RecycleItem');
const { emitToAll } = require('../socket');
const { deductPoints } = require('./rewardsController');

// Helper for stock alerts
const checkAndAlertStock = (item) => {
  if (item.stock === 0) {
    emitToAll('ADMIN_STOCK_ALERT', {
      itemId: item._id,
      itemName: item.itemName,
      message: `${item.itemName} is out of stock`
    });
  }
};

// ─── Admin: Add Item ─────────────────────────────────────────────────────────
const addItem = async (req, res) => {
  try {
    const { itemName, category, description, price, stock, stockType, itemsPerSet, status } = req.body;

    if (!itemName || !category || price === undefined || stock === undefined) {
      return res.status(400).json({ message: 'itemName, category, price and stock are required.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: `Invalid category. Valid: ${CATEGORIES.join(', ')}` });
    }

    const stockNum = parseInt(stock, 10);
    const itemStatus = stockNum === 0 ? 'Out of Stock' : (status || 'Available');

    const item = await RecycleItem.create({
      itemName: itemName.trim(),
      category,
      description: description || '',
      price: parseFloat(price),
      stock: stockNum,
      stockType: stockType || 'Single Quantity',
      itemsPerSet: stockType === 'Set' ? parseInt(itemsPerSet, 10) : 0,
      image: req.file ? req.file.path : '',
      status: itemStatus,
    });

    emitToAll('RECYCLE_ITEM_UPDATED', { action: 'ADD', item });
    checkAndAlertStock(item);
    res.status(201).json({ message: 'Item added successfully.', item });
  } catch (err) {
    console.error('[addItem Error]:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Admin: Update Item ──────────────────────────────────────────────────────
const updateItem = async (req, res) => {
  try {
    const item = await RecycleItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    const { itemName, category, description, price, stock, stockType, itemsPerSet, status } = req.body;
    
    if (itemName !== undefined)    item.itemName    = itemName.trim();
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) return res.status(400).json({ message: 'Invalid category.' });
      item.category = category;
    }
    if (description !== undefined) item.description = description;
    if (price !== undefined)       item.price       = parseFloat(price);
    
    if (stock !== undefined) {
      const oldStock = item.stock;
      const stockNum = parseInt(stock, 10);
      item.stock = stockNum;
      
      // Automatic Availability Logic
      if (stockNum === 0) {
        item.status = 'Out of Stock';
      } else if (oldStock === 0 && stockNum > 0) {
        item.status = 'Available';
      }
    }
    
    if (stockType !== undefined)   item.stockType   = stockType;
    if (itemsPerSet !== undefined) item.itemsPerSet = stockType === 'Set' ? parseInt(itemsPerSet, 10) : 0;
    if (status !== undefined) {
      // Prevent "Available" if stock is 0
      if (status === 'Available' && item.stock === 0) {
        item.status = 'Out of Stock';
      } else {
        item.status = status;
      }
    }
    
    if (req.file) item.image = req.file.path;

    await item.save();
    emitToAll('RECYCLE_ITEM_UPDATED', { action: 'UPDATE', item });
    checkAndAlertStock(item);
    res.json({ message: 'Item updated successfully.', item });
  } catch (err) {
    console.error('[updateItem Error]:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Admin: Delete Item ──────────────────────────────────────────────────────
const deleteItem = async (req, res) => {
  try {
    const item = await RecycleItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    emitToAll('RECYCLE_ITEM_UPDATED', { action: 'DELETE', itemId: req.params.id });
    res.json({ message: 'Item deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Admin: Analytics ────────────────────────────────────────────────────────
const getStoreAnalytics = async (req, res) => {
  try {
    const totalItems    = await RecycleItem.countDocuments();
    const outOfStock    = await RecycleItem.countDocuments({ stock: 0 });
    const totalRequests = await RecycleItem.aggregate([{ $group: { _id: null, total: { $sum: '$requests' } } }]);
    const totalViews    = await RecycleItem.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);

    // Most viewed category
    const categoryViews = await RecycleItem.aggregate([
      { $group: { _id: '$category', views: { $sum: '$views' }, count: { $sum: 1 } } },
      { $sort: { views: -1 } },
    ]);

    res.json({
      totalItems,
      outOfStock,
      totalRequests: totalRequests[0]?.total || 0,
      totalViews:    totalViews[0]?.total || 0,
      categoryStats: categoryViews,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Public/Citizen: Get Items ───────────────────────────────────────────────
const getItems = async (req, res) => {
  try {
    const { category, status, search, sort, page = 1, limit = 20 } = req.query;
    const query = {};
    if (category && category !== 'all') query.category = category;
    if (status)   query.status = status;
    if (search) query.itemName = { $regex: search, $options: 'i' };

    let sortQuery = { createdAt: -1 };
    if (sort === 'price-low') sortQuery = { price: 1 };
    else if (sort === 'price-high') sortQuery = { price: -1 };
    else if (sort === 'newest') sortQuery = { createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      RecycleItem.find(query).sort(sortQuery).skip(skip).limit(parseInt(limit)),
      RecycleItem.countDocuments(query),
    ]);

    res.json({ items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Public/Citizen: Get Single Item ────────────────────────────────────────
const getItem = async (req, res) => {
  try {
    const item = await RecycleItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    // Note: View counting is now handled separately via POST /:id/view
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Citizen: View Item (Unique Tracking) ────────────────────────────────────
const viewItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    const item = await RecycleItem.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    // Check if the user has already viewed this item
    const existingView = await ProductView.findOne({ userId, itemId });
    if (!existingView) {
      await ProductView.create({ userId, itemId });
      item.views += 1;
      await item.save();

      // Emit real-time update
      emitToAll('RECYCLE_ITEM_UPDATED', { action: 'VIEW', item });
      // Notify analytics if necessary (optional)
      emitToAll('STORE_ANALYTICS_UPDATED', { itemId, views: item.views });
    }

    res.json({ message: 'View recorded.', views: item.views });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error from MongoDB, ignore
      return res.json({ message: 'Already viewed.' });
    }
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Citizen: Buy Item ───────────────────────────────────────────────────────
const buyItem = async (req, res) => {
  try {
    const item = await RecycleItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (item.status === 'Out of Stock' || item.stock <= 0) {
      return res.status(400).json({ message: 'Item is out of stock.' });
    }
    if (item.status !== 'Available') {
      return res.status(400).json({ message: 'Item is not available at the moment.' });
    }

    const { pointsToUse = 0 } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Validation
    if (pointsToUse > user.rewards.points) {
      return res.status(400).json({ message: 'Insufficient Eco Points.' });
    }

    // New points conversion: 2 Eco Points = ₹1
    const maxDiscountAllowed = item.price;
    const maxPointsAllowed = maxDiscountAllowed * 2;
    
    if (pointsToUse > maxPointsAllowed) {
      return res.status(400).json({ message: `You cannot redeem more than ${maxPointsAllowed} points for this item.` });
    }

    const discount = pointsToUse / 2;
    const finalCashPrice = Math.max(0, item.price - discount);

    let paymentMethod = 'Cash on Delivery';
    if (pointsToUse > 0) {
      paymentMethod = finalCashPrice === 0 ? 'Points' : 'Mixed';
    }

    // Create Order
    const order = await Order.create({
      userId: user._id,
      itemId: item._id,
      productPrice: item.price,
      usedPoints: pointsToUse,
      discountAmount: discount,
      finalAmount: finalCashPrice,
      paymentMethod,
      paymentStatus: 'Completed'
    });

    // Update Item
    item.stock -= 1;
    item.requests += 1; 
    if (item.stock === 0) item.status = 'Out of Stock';
    await item.save();

    // Deduct User Points
    if (pointsToUse > 0) {
      await deductPoints(user._id, pointsToUse, `Purchased ${item.itemName} using points`, item._id);
    }

    emitToAll('RECYCLE_ITEM_UPDATED', { action: 'BUY', item });
    emitToAll('STORE_ANALYTICS_UPDATED', { action: 'PURCHASE', itemId: item._id, requests: item.requests });
    checkAndAlertStock(item);

    res.json({ 
      message: finalCashPrice === 0 
        ? 'Item purchased completely using Eco Points! 🎁' 
        : `Item purchased! ₹${finalCashPrice} remaining payable via cash on delivery.`, 
      item,
      order,
      pointsUsed: pointsToUse,
      cashPayable: finalCashPrice
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Get categories list ─────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  res.json({ categories: CATEGORIES });
};

module.exports = { addItem, updateItem, deleteItem, getStoreAnalytics, getItems, getItem, viewItem, buyItem, getCategories };
