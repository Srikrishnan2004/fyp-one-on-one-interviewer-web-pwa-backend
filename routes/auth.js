import express from 'express';
import { User } from '../models/User.js';
import { generateToken, authenticateToken, rateLimit, validateInput } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  first_name: Joi.string().min(1).max(50).optional(),
  last_name: Joi.string().min(1).max(50).optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(1).max(50).optional(),
  last_name: Joi.string().min(1).max(50).optional(),
  email: Joi.string().email().optional()
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required()
});

// Register new user
router.post('/register', rateLimit(5, 15 * 60 * 1000), validateInput(registerSchema), async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body;

    // Check if username already exists
    if (await User.usernameExists(username)) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email already exists
    if (await User.emailExists(email)) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      first_name,
      last_name
    });

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Login user
router.post('/login', rateLimit(10, 15 * 60 * 1000), validateInput(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username or email
    let user = await User.findByUsername(username);
    if (!user) {
      user = await User.findByEmail(username);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Get user statistics
    const stats = await user.getStats();
    const performanceSummary = await user.getPerformanceSummary();

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        stats,
        performance_summary: performanceSummary
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, validateInput(updateProfileSchema), async (req, res) => {
  try {
    const user = req.user;
    const updateData = req.body;

    // Check if email is being updated and if it already exists
    if (updateData.email && updateData.email !== user.email) {
      if (await User.emailExists(updateData.email)) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updatedUser = await user.update(updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.toJSON()
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: error.message
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, validateInput(changePasswordSchema), async (req, res) => {
  try {
    const user = req.user;
    const { current_password, new_password } = req.body;

    // Verify current password
    const isValidPassword = await user.verifyPassword(current_password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.updatePassword(new_password);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: error.message
    });
  }
});

// Deactivate account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    await user.deactivate();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Account deactivation error:', error);
    res.status(500).json({
      success: false,
      message: 'Account deactivation failed',
      error: error.message
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Log the logout event
    // 3. Update user's last activity
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const exists = await User.usernameExists(username);

    res.json({
      success: true,
      data: {
        username,
        available: !exists
      }
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({
      success: false,
      message: 'Username check failed',
      error: error.message
    });
  }
});

// Check email availability
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const exists = await User.emailExists(email);

    res.json({
      success: true,
      data: {
        email,
        available: !exists
      }
    });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({
      success: false,
      message: 'Email check failed',
      error: error.message
    });
  }
});

export default router;
