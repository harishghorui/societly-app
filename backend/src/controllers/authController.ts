import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Society from '../models/Society.js';
import { generateSocietyCode } from '../utils/generateCode.js';
import { sendSuccess, sendError } from '../utils/responseWrapper.js';

export const register = async (req: Request, res: Response) => {
  const { name, phone, pin, societyId, flatNumber } = req.body;

  try {
    // 1. Check if user already exists
    let user = await User.findOne({ where: { phone } });

    if (!user) {
      // 2. Hash the PIN for security
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(pin, salt);

      // 3. Create the Identity
      user = await User.create({ name, phone, pin: hashedPin });
    }

    // 4. Create the Membership (Initially 'pending' until Admin approves)
    const membership = await Membership.create({
      userId: user.id,
      societyId,
      flatNumber,
      role: 'tenant', // Default role for new signups
      status: 'pending'
    });

    return sendSuccess(res, 201, "Registration successful. Awaiting admin approval.", { userId: user.id });
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

    // 2. Verify PIN
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) return sendError(res, 400, "Invalid PIN", "INVALID_PIN");

    // 3. Create a JWT Token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    // 4. Return user info and their memberships
    return sendSuccess(res, 200, "Login successful", {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        memberships: (user as any).memberships || []
      }
    });
  } catch (error) {
    return sendError(res, 500, "Login failed", "LOGIN_ERROR", error);
  }
};

export const createSocietyAndAdmin = async (req: Request, res: Response) => {
  const { name, phone, pin, societyName, address, govtRegistrationNo } = req.body;

  try {
    // 1. Check if Govt Reg No is unique (The "Double Registration" Lock)
    const existing = await Society.findOne({ where: { govtRegistrationNo } });
    if (existing) {
      return sendError(res, 400, "This society is already registered on Societly.", "DUPLICATE_SOCIETY");
    }

    // 2. Hash PIN and Create/Find User
    const hashedPin = await bcrypt.hash(pin, 10);
    const [user] = await User.findOrCreate({
      where: { phone },
      defaults: { name, phone, pin: hashedPin }
    });

    // 3. Generate the Custom Code (NMC-1234 style)
    const registrationCode = generateSocietyCode(societyName);

    // 4. Create Society
    const society = await Society.create({
      name: societyName,
      address,
      govtRegistrationNo,
      registrationCode
    });

    // 5. Create Admin Membership
    await Membership.create({
      userId: user.id,
      societyId: society.id,
      role: 'admin',
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
      user = await User.create({ name, phone, pin: hashedPin });
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
      role: role || 'tenant', // Default to tenant if not specified
      status: 'pending' // Must be approved by Admin
    });

    return sendSuccess(res, 201, "Request sent! Please wait for Admin approval.");
  } catch (error) {
    return sendError(res, 500, "Failed to join society", "JOIN_SOCIETY_ERROR", error);
  }
};