import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import User from '../models/User.js';
import Membership, { UserRole } from '../models/Membership.js';
import Society from '../models/Society.js';
import { generateSocietyCode } from '../utils/generateCode.js';
import { sendSuccess, sendError } from '../utils/responseWrapper.js';

export const register = async (req: Request, res: Response) => {
  const { name, phone, pin, societyId, flatNumber } = req.body;

  try {
    // 1. Check if user already exists
    let user = await User.findOne({ where: { phone } });
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    if (!user) {
      // 2. Create the Identity
      user = await User.create({ name, phone, pin: hashedPin });
    } else {
      // Gracefully claim the placeholder user record by updating details
      user.name = name;
      user.pin = hashedPin;
      await user.save();
    }

    // 3. Check if a pending_activation membership exists in this society for this user
    let membership = await Membership.findOne({
      where: {
        userId: user.id,
        societyId,
        status: "pending_activation"
      }
    });

    if (membership) {
      // Claim the existing pre-seeded membership and activate it
      membership.status = "active";
      if (flatNumber) {
        membership.flatNumber = flatNumber;
      }
      await membership.save();
      return sendSuccess(res, 201, "Registration and activation successful.", { userId: user.id });
    } else {
      // 4. Create the Membership (Initially 'pending' until Admin approves)
      membership = await Membership.create({
        userId: user.id,
        societyId,
        flatNumber,
        role: UserRole.TENANT, // Default role for new signups
        status: 'pending'
      });
      return sendSuccess(res, 201, "Registration successful. Awaiting admin approval.", { userId: user.id });
    }
  } catch (error) {
    return sendError(res, 500, "Registration failed", "REGISTRATION_ERROR", error);
  }
};

export const login = async (req: Request, res: Response) => {
  const { phone, pin } = req.body;

  try {
    // 1. Find the User
    const user = await User.findOne({
      where: { phone },
      include: [{ model: Membership, include: [Society] }] // This pulls their roles and buildings
    });

    if (!user) return sendError(res, 404, "User not found", "USER_NOT_FOUND");

    if (user.status === 'suspended') {
      return sendError(res, 403, "Access Denied. Your account has been suspended.", "ACCOUNT_SUSPENDED");
    }

    if (!user.pin) {
      return sendError(res, 400, "This account has not been activated yet. Please verify your phone and set a PIN.", "ACCOUNT_NOT_ACTIVE");
    }

    // 2. Verify PIN
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) return sendError(res, 400, "Invalid PIN", "INVALID_PIN");

    // Activate all pending_activation memberships for this user
    await Membership.update(
      { status: 'active' },
      { where: { userId: user.id, status: 'pending_activation' } }
    );

    // Reload user with updated memberships
    const refreshedUser = await User.findOne({
      where: { id: user.id },
      include: [{ model: Membership, include: [Society] }]
    });

    if (!refreshedUser) return sendError(res, 404, "User not found", "USER_NOT_FOUND");

    // 3. Create a JWT Token
    const token = jwt.sign(
      { userId: refreshedUser.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    // 4. Return user info and their memberships
    return sendSuccess(res, 200, "Login successful", {
      token,
      user: {
        id: refreshedUser.id,
        name: refreshedUser.name,
        phone: refreshedUser.phone,
        memberships: (refreshedUser as any).memberships || []
      }
    });
  } catch (error) {
    return sendError(res, 500, "Login failed", "LOGIN_ERROR", error);
  }
};

export const createSocietyAndAdmin = async (req: Request, res: Response) => {
  const { name, phone, pin, societyName, address, govtRegistrationNo, structureType } = req.body;

  try {
    // 1. Check if Govt Reg No is unique (The "Double Registration" Lock)
    const existing = await Society.findOne({ where: { govtRegistrationNo } });
    if (existing) {
      return sendError(res, 400, "This society is already registered on Societly.", "DUPLICATE_SOCIETY");
    }

    // 2. Hash PIN and Create/Find User
    const hashedPin = await bcrypt.hash(pin, 10);
    let user = await User.findOne({ where: { phone } });
    if (!user) {
      user = await User.create({ name, phone, pin: hashedPin, status: 'active' });
    } else {
      user.name = name;
      user.pin = hashedPin;
      user.status = 'active';
      await user.save();
    }

    // 3. Generate the Custom Code (NMC-1234 style)
    const registrationCode = generateSocietyCode(societyName);

    // 4. Create Society
    const society = await Society.create({
      name: societyName,
      address,
      govtRegistrationNo,
      registrationCode,
      structureType: structureType || 'single_building'
    });

    // 5. Create Admin Membership
    await Membership.create({
      userId: user.id,
      societyId: society.id,
      role: UserRole.ADMIN,
      designation: 'Secretary',
      status: 'active'
    });

    return sendSuccess(res, 201, "Society registered successfully!", {
      registrationCode: registrationCode
    });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, "Error during registration", "REGISTRATION_ERROR", error);
  }
};

export const joinSociety = async (req: Request, res: Response) => {
  const { name, phone, pin, societyId, flatNumber, role } = req.body;

  try {
    // 1. Create or Find User
    let user = await User.findOne({ where: { phone } });

    if (!user) {
      const hashedPin = await bcrypt.hash(pin, 10);
      user = await User.create({ name, phone, pin: hashedPin, status: 'active' });
    }

    // 2. Check if already a member
    const existingMember = await Membership.findOne({
      where: { userId: user.id, societyId }
    });

    if (existingMember) {
      return sendError(res, 400, "You have already requested to join this society.", "DUPLICATE_REQUEST");
    }

    // 3. Create Pending Membership
    await Membership.create({
      userId: user.id,
      societyId,
      flatNumber,
      role: (role as UserRole) || UserRole.TENANT, // Default to tenant if not specified
      status: 'pending' // Must be approved by Admin
    });

    return sendSuccess(res, 201, "Request sent! Please wait for Admin approval.");
  } catch (error) {
    return sendError(res, 500, "Failed to join society", "JOIN_SOCIETY_ERROR", error);
  }
};

export const checkPhone = async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    return sendError(res, 400, "Phone number is required.", "MISSING_PHONE");
  }

  // Sanitize phone number (strip whitespace or any non-numeric except optional leading +)
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  try {
    const user = await User.findOne({
      where: {
        phone: cleanPhone
      }
    });

    if (!user) {
      return sendError(res, 404, "Phone number not indexed on Societly.", "NUMBER_NOT_INDEXED");
    }

    if (user.status === 'suspended') {
      return sendError(res, 403, "Access Denied. Your account has been suspended.", "ACCOUNT_SUSPENDED");
    }

    return sendSuccess(res, 200, "Phone status verified", {
      status: user.status, // 'invited' | 'active'
    });
  } catch (error) {
    console.error("Error checking phone number:", error);
    return sendError(res, 500, "Failed to verify phone number.", "CHECK_PHONE_ERROR", error);
  }
};

export const activateUser = async (req: Request, res: Response) => {
  const { phone, firebaseToken, name, pin } = req.body;

  if (!phone || !firebaseToken || !name || !pin) {
    return sendError(res, 400, "Missing required parameters (phone, firebaseToken, name, pin).", "MISSING_PARAMETERS");
  }

  try {
    // 1. Verify the Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const tokenPhone = decodedToken.phone_number;

    // Ensure phone number matches token
    if (!tokenPhone || !tokenPhone.endsWith(phone.replace(/[^\d]/g, ''))) {
      return sendError(res, 400, "Phone number verification failed. Token does match matching numbers.", "VERIFICATION_FAILED");
    }

    // 2. Find the User
    const user = await User.findOne({
      where: { phone },
      include: [{ model: Membership, include: [Society] }]
    });

    if (!user) {
      return sendError(res, 404, "User not found.", "USER_NOT_FOUND");
    }

    if (user.status !== 'invited') {
      return sendError(res, 400, "This account is already active or suspended.", "INVALID_STATUS");
    }

    // 3. Update PIN and status to active
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    user.name = name;
    user.pin = hashedPin;
    user.status = 'active';
    await user.save();

    // Activate all pending_activation memberships for this user
    await Membership.update(
      { status: 'active' },
      { where: { userId: user.id, status: 'pending_activation' } }
    );

    // 4. Generate JWT Token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    // Refresh user memberships to ensure we return updated info
    const updatedUser = await User.findOne({
      where: { id: user.id },
      include: [{ model: Membership, include: [Society] }]
    });

    if (!updatedUser) {
      return sendError(res, 404, "User not found after activation.", "USER_NOT_FOUND");
    }

    return sendSuccess(res, 200, "Activation successful", {
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        memberships: (updatedUser as any).memberships || []
      }
    });
  } catch (error) {
    console.error("User activation failed:", error);
    return sendError(res, 500, "Verification or activation process failed.", "ACTIVATION_FAILED", error);
  }
};

export const resetPin = async (req: Request, res: Response) => {
  const { phone, firebaseToken, pin } = req.body;

  if (!phone || !firebaseToken || !pin) {
    return sendError(res, 400, "Missing required parameters (phone, firebaseToken, pin).", "MISSING_PARAMETERS");
  }

  if (pin.length !== 4) {
    return sendError(res, 400, "PIN must be exactly 4 digits.", "INVALID_PIN");
  }

  try {
    // 1. Verify the Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const tokenPhone = decodedToken.phone_number;

    // Ensure phone number matches token
    if (!tokenPhone || !tokenPhone.endsWith(phone.replace(/[^\d]/g, ''))) {
      return sendError(res, 400, "Phone number verification failed.", "VERIFICATION_FAILED");
    }

    // 2. Find the User
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return sendError(res, 404, "User not found.", "USER_NOT_FOUND");
    }

    if (user.status === 'suspended') {
      return sendError(res, 403, "Access Denied. Your account has been suspended.", "ACCOUNT_SUSPENDED");
    }

    // 3. Update PIN
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    user.pin = hashedPin;
    if (user.status === 'invited') {
      user.status = 'active';
    }
    await user.save();

    return sendSuccess(res, 200, "PIN reset successfully.", { success: true });
  } catch (error) {
    console.error("PIN reset failed:", error);
    return sendError(res, 500, "Verification or PIN reset process failed.", "RESET_PIN_FAILED", error);
  }
};