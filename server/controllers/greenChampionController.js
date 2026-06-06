const GreenChampionRequest = require('../models/GreenChampionRequest');
const User = require('../models/User');
const Collector = require('../models/Collector');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getCanonicalVillageName } = require('../data/kundapuraVillages');

// Generate unique Request ID
const generateRequestId = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const lastRequest = await GreenChampionRequest.findOne({ requestId: new RegExp(`GCREQ${year}`, 'i') }).sort({ createdAt: -1 });
    
    let nextNum = 1;
    if (lastRequest) {
        const lastId = lastRequest.requestId;
        const numPart = lastId.substring(9);
        nextNum = parseInt(numPart, 10) + 1;
    }
    
    return `GCREQ${year}${String(nextNum).padStart(3, '0')}`;
};

// PUBLIC: Submit Green Champion Request
const submitRequest = async (req, res) => {
    try {
        const { fullName, email, mobile, village, reason, otherReason, idProofType, otherIdProofType, gender } = req.body;

        // Basic validations
        if (!fullName || !email || !mobile || !village || !idProofType) {
            return res.status(400).json({ message: 'All required fields must be filled.' });
        }

        const searchEmail = email.toLowerCase().trim();
        const searchMobile = mobile.trim();
        const canonicalVillage = getCanonicalVillageName(village);
        if (!canonicalVillage) {
            return res.status(400).json({ message: 'Select a valid Kundapura Taluk village.' });
        }

        // Email validation (gmail only)
        if (!searchEmail.endsWith('@gmail.com')) {
            return res.status(400).json({ message: 'Only gmail.com addresses are allowed.' });
        }

        // Mobile validation
        if (!/^[6-9]\d{9}$/.test(searchMobile)) {
            return res.status(400).json({ message: 'Invalid mobile number. Must be 10 digits and start with 6-9.' });
        }

        // 1. Check for duplicates in Green Champion Requests with detailed status info
        const existingReq = await GreenChampionRequest.findOne({ 
            $or: [{ email: searchEmail }, { mobile: searchMobile }],
        }).sort({ createdAt: -1 });

        if (existingReq) {
            if (existingReq.status === 'PENDING') {
                return res.status(409).json({ 
                    message: 'A Green Champion application is already under review for this email.',
                    requestId: existingReq.requestId,
                    status: existingReq.status,
                    field: 'email'
                });
            } else if (existingReq.status === 'APPROVED') {
                return res.status(409).json({ message: 'A Green Champion account already exists with this email.' });
            } else if (existingReq.status === 'SUSPENDED') {
                return res.status(403).json({ message: 'This Green Champion account has been suspended. Please contact the administrator.' });
            }
        }

        // Check by mobile separately for PENDING only
        const existingReqMobile = await GreenChampionRequest.findOne({ 
            mobile: searchMobile,
            status: { $in: ['PENDING', 'APPROVED', 'SUSPENDED'] }
        });
        if (existingReqMobile && existingReqMobile.email !== searchEmail) {
            if (existingReqMobile.status === 'PENDING') {
                return res.status(409).json({ 
                    message: 'A Green Champion application is already under review for this mobile number.',
                    requestId: existingReqMobile.requestId,
                    status: existingReqMobile.status,
                    field: 'mobile'
                });
            } else if (existingReqMobile.status === 'APPROVED') {
                return res.status(409).json({ message: 'A Green Champion account already exists with this mobile number.' });
            } else if (existingReqMobile.status === 'SUSPENDED') {
                return res.status(403).json({ message: 'This Green Champion account has been suspended. Please contact the administrator.' });
            }
        }

        // 2. Check for duplicates in Users (Citizens, Green Champions, Admin)
        const existingUser = await User.findOne({ $or: [{ email: searchEmail }, { phone: searchMobile }] });
        if (existingUser) {
            const msgs = {
                'green_champion': 'A Green Champion account already exists with this email.',
                'admin': 'This email or mobile number is already associated with an administrator account.',
                'citizen': 'You are already registered as a Citizen.',
            };
            const msg = msgs[existingUser.role] || 'This email or mobile number is already registered.';
            return res.status(409).json({ message: msg });
        }

        // 3. Check for duplicates in Collectors
        const existingColl = await Collector.findOne({ $or: [{ email: searchEmail }, { mobile: searchMobile }] });
        if (existingColl) {
            return res.status(409).json({ message: 'You are already registered as a Collector.' });
        }

        // Check files
        if (!req.files || !req.files.profilePhoto || !req.files.idProof) {
            return res.status(400).json({ message: 'Profile photo and ID proof are required.' });
        }

        const requestId = await generateRequestId();

        const newRequest = await GreenChampionRequest.create({
            requestId,
            fullName,
            gender: gender || '',
            email: searchEmail,
            mobile: searchMobile,
            village: canonicalVillage,
            reason,
            otherReason: reason === 'Other' ? otherReason : '',
            idProofType,
            otherIdProofType: idProofType === 'Other' ? otherIdProofType : '',
            profilePhoto: req.files.profilePhoto[0].path,
            idProof: req.files.idProof[0].path,
        });

        res.status(201).json({
            message: 'Request submitted successfully.',
            requestId: newRequest.requestId,
            status: newRequest.status
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// PUBLIC: Check Request Status
const checkRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const request = await GreenChampionRequest.findOne({ requestId: requestId.trim().toUpperCase() });
        
        if (!request) {
            return res.status(404).json({ message: 'Request ID not found.' });
        }

        res.json({
            requestId: request.requestId,
            fullName: request.fullName,
            village: request.village,
            submittedAt: request.createdAt,
            status: request.status,
            greenChampionId: request.greenChampionId || null,
            rejectionReason: request.rejectionReason || null,
            suspensionReason: request.suspensionReason || null,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// PUBLIC: Forgot Request ID
const forgotRequestId = async (req, res) => {
    try {
        const { identifier } = req.body; // email or mobile
        if (!identifier) return res.status(400).json({ message: 'Email or mobile is required.' });

        const request = await GreenChampionRequest.findOne({
            $or: [{ email: identifier.toLowerCase().trim() }, { mobile: identifier.trim() }]
        }).sort({ createdAt: -1 });

        if (!request) {
            return res.status(404).json({ message: 'No request found for this email or mobile.' });
        }

        res.json({
            requestId: request.requestId,
            status: request.status
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// ADMIN: Get All Requests
const getAllRequests = async (req, res) => {
    try {
        const { status, village } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (village) filter.village = village;

        const requests = await GreenChampionRequest.find(filter).sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        console.error('[GreenChampionController] getAllRequests Error:', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// ADMIN: Review Request (Update status/checklist)
const reviewRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { checklist, status, reason } = req.body;

        const request = await GreenChampionRequest.findById(id);
        if (!request) return res.status(404).json({ message: 'Request not found.' });

        if (checklist) request.verificationChecklist = checklist;
        
        if (status) {
            if (status === 'APPROVED') {
                if (request.status === 'APPROVED') {
                    return res.status(400).json({ message: 'This request has already been approved.' });
                }

                // Check if all checklist items are true
                const allChecked = Object.values(request.verificationChecklist).every(v => v === true);
                if (!allChecked) {
                    return res.status(400).json({ message: 'Cannot approve request. All verification steps must be completed.' });
                }


                // Generate Green Champion ID
                const date = new Date();
                const year = date.getFullYear();
                const lastGC = await User.findOne({ greenChampionId: new RegExp(`GC${year}`, 'i') }).sort({ createdAt: -1 });
                let nextNum = 1;
                if (lastGC && lastGC.greenChampionId) {
                    const lastId = lastGC.greenChampionId;
                    const numPart = lastId.substring(6);
                    nextNum = parseInt(numPart, 10) + 1;
                }
                const gcId = `GC${year}${String(nextNum).padStart(3, '0')}`;

                // Check if user already exists (e.g. registered as Citizen after applying)
                let user = await User.findOne({ $or: [{ email: request.email }, { phone: request.mobile }] });

                if (user) {
                    // Update existing user to Green Champion
                    user.role = 'green_champion';
                    user.greenChampionId = gcId;
                    user.village = request.village;
                    user.isVerified = true;
                    user.isFirstLogin = true;
                    if (request.profilePhoto) user.profilePhoto = request.profilePhoto;
                    await user.save();
                } else {
                    // Create NEW User account
                    user = await User.create({
                        name: request.fullName,
                        email: request.email,
                        phone: request.mobile,
                        password: request.mobile, // Initial password = mobile
                        role: 'green_champion',
                        village: request.village,
                        greenChampionId: gcId,
                        isFirstLogin: true,
                        profilePhoto: request.profilePhoto,
                        isVerified: true
                    });
                }

                request.status = 'APPROVED';
                request.greenChampionId = gcId;
                request.approvedAt = new Date();
                request.reviewedBy = req.admin.username; // From adminProtect middleware
            } else if (status === 'REJECTED') {
                request.status = 'REJECTED';
                request.rejectionReason = reason;
                request.rejectedAt = new Date();
            } else if (status === 'SUSPENDED') {
                request.status = 'SUSPENDED';
                request.suspensionReason = reason;
                request.suspendedAt = new Date();
                
                // If they were already approved, deactivate the user account
                if (request.greenChampionId) {
                    await User.findOneAndUpdate({ greenChampionId: request.greenChampionId }, { accountStatus: 'Inactive' });
                }
            }
        }

        await request.save();
        res.json({ message: 'Request updated successfully.', request });

    } catch (err) {
        console.error('[GreenChampionController] reviewRequest Error:', err);
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

// PUBLIC: Check duplicate email or phone in real-time
const checkDuplicateField = async (req, res) => {
    try {
        const { field, value } = req.body;
        if (!field || !value) return res.status(400).json({ message: 'Field and value required.' });
        if (!['email', 'mobile'].includes(field)) return res.status(400).json({ message: 'Invalid field.' });

        const searchValue = field === 'email' ? value.toLowerCase().trim() : value.trim();
        const query = field === 'email' 
            ? { email: searchValue } 
            : { mobile: searchValue };

        // Check Green Champion Requests
        const existingReq = await GreenChampionRequest.findOne({
            ...query,
            status: { $in: ['PENDING', 'APPROVED', 'SUSPENDED'] }
        });
        if (existingReq) {
            return res.json({
                available: false,
                type: 'green_champion_request',
                status: existingReq.status,
                requestId: existingReq.requestId,
                message: existingReq.status === 'PENDING'
                    ? `A Green Champion application is already under review for this ${field}.`
                    : existingReq.status === 'APPROVED'
                        ? `A Green Champion account already exists with this ${field}.`
                        : 'This Green Champion account has been suspended.'
            });
        }

        // Check Users
        const userQuery = field === 'email' ? { email: searchValue } : { phone: searchValue };
        const existingUser = await User.findOne(userQuery);
        if (existingUser) {
            const msgs = {
                'green_champion': `A Green Champion account already exists with this ${field}.`,
                'admin': 'This email or mobile number is already associated with an administrator account.',
                'citizen': 'You are already registered as a Citizen.',
            };
            return res.json({
                available: false,
                type: `user_${existingUser.role}`,
                message: msgs[existingUser.role] || 'This email or mobile number is already registered.'
            });
        }

        // Check Collectors
        const collectorQuery = field === 'email' ? { email: searchValue } : { mobile: searchValue };
        const existingColl = await Collector.findOne(collectorQuery);
        if (existingColl) {
            return res.json({
                available: false,
                type: 'collector',
                message: 'You are already registered as a Collector.'
            });
        }

        res.json({ available: true });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
};

module.exports = {
    submitRequest,
    checkRequestStatus,
    forgotRequestId,
    getAllRequests,
    reviewRequest,
    checkDuplicateField
};
