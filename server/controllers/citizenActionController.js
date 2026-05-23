const AwarenessPost = require('../models/AwarenessPost');
const Campaign = require('../models/Campaign');
const RecyclingPickup = require('../models/RecyclingPickup');
const GCFeedback = require('../models/GCFeedback');
const User = require('../models/User');

// 1. Get Awareness Posts (in user's village)
exports.getCommunityPosts = async (req, res) => {
    try {
        const posts = await AwarenessPost.find({ village: req.user.village })
            .populate('author', 'name profilePhoto')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching posts', error: err.message });
    }
};

// 2. Get Campaigns (in user's village)
exports.getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({ village: req.user.village, status: 'Upcoming' })
            .populate('organizer', 'name profilePhoto')
            .sort({ date: 1 });
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching campaigns', error: err.message });
    }
};

// 3. Join Campaign
exports.joinCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
        
        if (campaign.volunteers.includes(req.user._id)) {
            return res.status(400).json({ message: 'Already joined this campaign' });
        }

        campaign.volunteers.push(req.user._id);
        await campaign.save();
        
        // Reward citizen for volunteering promise
        await User.findByIdAndUpdate(req.user._id, { $inc: { ecoPoints: 5 } });

        res.json({ message: 'Joined successfully', campaign });
    } catch (err) {
        res.status(500).json({ message: 'Error joining campaign', error: err.message });
    }
};

// 4. Request Recycling Pickup (Home Pickup)
exports.requestRecyclingPickup = async (req, res) => {
    try {
        const { type, quantity, address, notes } = req.body;
        
        // Get user's complete profile for address validation
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if address is provided or use user's home address
        let pickupAddress = address;
        
        if (!pickupAddress) {
            // Check if user has completed their address setup
            if (!user.houseNo && !user.streetArea) {
                return res.status(400).json({ 
                    message: 'Please complete your address setup to request home pickup. Visit your profile to add address details.',
                    addressRequired: true 
                });
            }
            
            // Auto-populate address from user profile
            const addressParts = [
                user.houseNo,
                user.streetArea,
                user.landmark,
                user.village
            ].filter(part => part && part.trim()).join(', ');
            
            pickupAddress = addressParts || address;
        }

        if (!pickupAddress) {
            return res.status(400).json({ message: 'Address is required for pickup request.' });
        }

        const pickup = await RecyclingPickup.create({
            citizen: req.user._id,
            type,
            quantity,
            address: pickupAddress,
            village: user.village || req.user.village,
            notes
        });
        
        res.status(201).json({ 
            message: 'Pickup request created successfully',
            pickup 
        });
    } catch (err) {
        res.status(500).json({ message: 'Error requesting pickup', error: err.message });
    }
};

// 5. Submit Feedback for Green Champion
exports.submitGCFeedback = async (req, res) => {
    try {
        const { championId, rating, comment } = req.body;
        const feedback = await GCFeedback.create({
            citizen: req.user._id,
            champion: championId,
            rating,
            comment
        });
        res.status(201).json(feedback);
    } catch (err) {
        res.status(500).json({ message: 'Error submitting feedback', error: err.message });
    }
};
