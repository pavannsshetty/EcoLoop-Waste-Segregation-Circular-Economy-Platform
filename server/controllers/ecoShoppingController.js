const RecycleItem = require('../models/RecycleItem');
const User        = require('../models/User');
const EcoPointHistory = require('../models/EcoPointHistory');
const ProductView = require('../models/ProductView');
const Order       = require('../models/Order');
const Collector   = require('../models/Collector');
const { CATEGORIES } = require('../models/RecycleItem');
const { emitToAll, emitToUser } = require('../socket');
const { deductPoints } = require('./rewardsController');
const { createNotification } = require('./notificationController');
const { findBestCollector } = require('../utils/assignment');

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
    const deliveryAddress = user.homeAddress?.trim()
      ? user.homeAddress.trim()
      : [user.houseNo, user.streetArea, user.landmark].filter(Boolean).join(', ') || user.currentLocation || '';
    const deliveryLatitude = typeof user.latitude === 'number' ? user.latitude : null;
    const deliveryLongitude = typeof user.longitude === 'number' ? user.longitude : null;

    const bestCollector = await findBestCollector(user.village, { city: user.city });
    const assignedCollectorId = bestCollector ? bestCollector._id : null;
    const deliveryStatus = bestCollector ? 'Assigned' : 'Pending';

    const order = await Order.create({
      userId: user._id,
      itemId: item._id,
      productPrice: item.price,
      usedPoints: pointsToUse,
      discountAmount: discount,
      finalAmount: finalCashPrice,
      paymentMethod,
      paymentStatus: 'Completed',
      quantity: 1,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      deliveryStatus,
      assignedCollector: assignedCollectorId,
    });

    if (bestCollector) {
      await createNotification(bestCollector._id, 'New Delivery Assigned', `You have been assigned a new eco shopping delivery order.`, 'assignment', order._id);
      await createNotification(user._id, 'Order Assigned', `Your eco shopping order has been assigned to ${bestCollector.name}.`, 'order', order._id);
      emitToUser(bestCollector._id.toString(), 'new_delivery', order);
      emitToUser(user._id.toString(), 'order_updated', order);
    }

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
    emitToAll('ECO_SHOPPING_ORDER_UPDATED', { orderId: order._id, userId: user._id });
    emitToAll('STORE_ANALYTICS_UPDATED', { action: 'PURCHASE', itemId: item._id, requests: item.requests });
    checkAndAlertStock(item);

    await createNotification(user._id, 'Order Placed', `Your eco shopping order for ${item.itemName} has been placed successfully.`, 'order', order._id);

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

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authorized. Invalid user token.' });
    }

    const orders = await Order.find({ userId })
      .populate('itemId', 'itemName image price category')
      .populate('assignedCollector', 'name collectorId phone email')
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (err) {
    console.error('[getMyOrders Error]:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const formatBuyerAddress = (user) => {
  if (!user) return '';
  if (user.homeAddress && user.homeAddress.trim()) return user.homeAddress.trim();
  const parts = [];
  if (user.houseNo) parts.push(user.houseNo);
  if (user.streetArea) parts.push(user.streetArea);
  if (user.landmark) parts.push(user.landmark);
  if (user.village) parts.push(user.village);
  if (user.city) parts.push(user.city);
  if (user.currentLocation) parts.push(user.currentLocation);
  return parts.filter(Boolean).join(', ');
};

const getOrdersForAdmin = async (req, res) => {
  try {
    const { status, collectorId, search } = req.query;
    const query = {};
    if (status && ['Pending', 'Assigned', 'Out for Delivery', 'Delivered'].includes(status)) {
      query.deliveryStatus = status;
    }
    if (collectorId) {
      query.assignedCollector = collectorId;
    }

    let orders = await Order.find(query)
      .populate('userId', 'name phone email')
      .populate('itemId', 'itemName image price category')
      .populate('assignedCollector', 'name collectorId phone email')
      .sort({ createdAt: -1 })
      .lean();

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      orders = orders.filter((order) => {
        return (
          searchRegex.test(order._id.toString()) ||
          searchRegex.test(order.itemId?.itemName || '') ||
          searchRegex.test(order.userId?.name || '') ||
          searchRegex.test(order.userId?.phone || '')
        );
      });
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getEcoProductBuyers = async (req, res) => {
  try {
    const { status, search, sort } = req.query;
    const query = {};
    if (status && ['Pending', 'Assigned', 'Out for Delivery', 'Delivered'].includes(status)) {
      query.deliveryStatus = status;
    }

    const orders = await Order.find(query)
      .populate('userId', 'name email phone profilePhoto homeAddress houseNo streetArea landmark village city currentLocation')
      .populate('itemId', 'itemName image price category')
      .sort({ createdAt: -1 })
      .lean();

    const buyerMap = new Map();
    orders.forEach((order) => {
      const user = order.userId;
      if (!user?._id) return;
      const userId = user._id.toString();
      const existing = buyerMap.get(userId);
      const latestOrder = existing?.latestOrder || order;
      const buyer = existing || {
        _id: user._id,
        name: user.name || 'Citizen',
        profilePhoto: user.profilePhoto || '',
        email: user.email || '',
        phone: user.phone || '',
        address: formatBuyerAddress(user),
        totalAmount: 0,
        totalOrders: 0,
        latestOrderDate: order.createdAt,
        latestOrderStatus: order.deliveryStatus,
        latestPaymentStatus: order.paymentStatus,
        latestProductName: order.itemId?.itemName || 'Eco product',
        latestQuantity: order.quantity || 1,
        latestDeliveryAddress: order.deliveryAddress || '',
        paymentStatusCounts: {},
      };

      buyer.totalAmount += order.finalAmount || 0;
      buyer.totalOrders += 1;
      if (!existing || order.createdAt > latestOrder.createdAt) {
        buyer.latestOrderDate = order.createdAt;
        buyer.latestOrderStatus = order.deliveryStatus;
        buyer.latestPaymentStatus = order.paymentStatus;
        buyer.latestProductName = order.itemId?.itemName || 'Eco product';
        buyer.latestQuantity = order.quantity || 1;
        buyer.latestDeliveryAddress = order.deliveryAddress || '';
      }
      buyer.paymentStatusCounts[order.paymentStatus] = (buyer.paymentStatusCounts[order.paymentStatus] || 0) + 1;
      buyerMap.set(userId, buyer);
    });

    let buyers = Array.from(buyerMap.values());
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      buyers = buyers.filter((buyer) => {
        return (
          searchRegex.test(buyer.name || '') ||
          searchRegex.test(buyer.email || '') ||
          searchRegex.test(buyer.phone || '') ||
          searchRegex.test(buyer.address || '') ||
          searchRegex.test(buyer.latestProductName || '')
        );
      });
    }

    if (sort === 'amount') {
      buyers.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    } else if (sort === 'orders') {
      buyers.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
    } else if (sort === 'name') {
      buyers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      buyers.sort((a, b) => new Date(b.latestOrderDate) - new Date(a.latestOrderDate));
    }

    res.json(buyers);
  } catch (err) {
    console.error('[getEcoProductBuyers Error]:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getEcoProductBuyerOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('name email phone profilePhoto homeAddress houseNo streetArea landmark village city currentLocation');
    if (!user) return res.status(404).json({ message: 'Buyer not found.' });

    const orders = await Order.find({ userId: user._id })
      .populate('itemId', 'itemName image price category')
      .populate('assignedCollector', 'name collectorId phone email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ user, orders });
  } catch (err) {
    console.error('[getEcoProductBuyerOrders Error]:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const assignOrderCollector = async (req, res) => {
  try {
    const { collectorId } = req.body;
    if (!collectorId) return res.status(400).json({ message: 'collectorId is required.' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const collector = await Collector.findById(collectorId);
    if (!collector) return res.status(404).json({ message: 'Collector not found.' });
    if (collector.status === 'Inactive') return res.status(400).json({ message: 'Collector is inactive.' });

    order.assignedCollector = collector._id;
    order.deliveryStatus = 'Assigned';
    await order.save();

    await createNotification(order.userId, 'Delivery Assigned', `Your eco shopping order has been assigned to ${collector.name}.`, 'order', order._id);
    await createNotification(collector._id, 'New Delivery Assignment', `You have been assigned a new eco shopping delivery order.`, 'assignment', order._id);
    emitToAll('ECO_SHOPPING_ORDER_UPDATED', { orderId: order._id, userId: order.userId });

    res.json({ message: 'Collector assigned successfully.', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

const getActiveCollectors = async (req, res) => {
  try {
    const collectors = await Collector.find({ status: 'Active' })
      .select('name collectorId phone email villages city area vehicleType vehicleNumber')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ collectors });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

// ─── Get categories list ─────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const dbCategories = await RecycleItem.distinct('category');
    const allCategories = Array.from(new Set([...(Array.isArray(dbCategories) ? dbCategories : []), ...CATEGORIES]));
    res.json({ categories: allCategories });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
};

module.exports = {
  addItem,
  updateItem,
  deleteItem,
  getStoreAnalytics,
  getItems,
  getItem,
  viewItem,
  buyItem,
  getMyOrders,
  getOrdersForAdmin,
  getEcoProductBuyers,
  getEcoProductBuyerOrders,
  assignOrderCollector,
  getActiveCollectors,
  getCategories,
};
