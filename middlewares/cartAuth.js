const logger = require("../config/logger");

/**
 * Middleware to validate cart ownership and session integrity
 * Ensures that users can only access their own carts and guests have valid sessions
 */
const validateCartAccess = (req, res, next) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    // Must have either user ID (authenticated) or session ID (guest)
    if (!userId && !sessionId) {
      logger.warn('Cart access attempt without authentication', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'مطلوب تسجيل دخول أو جلسة صالحة'
      });
    }

    // For authenticated users, ensure they don't try to access other users' carts
    if (userId && req.params.userId && req.params.userId !== userId) {
      logger.warn('Unauthorized cart access attempt', {
        userId,
        attemptedUserId: req.params.userId,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        message: 'غير مسموح بالوصول لسلة شخص آخر'
      });
    }

    // Validate session ID format for guests
    if (!userId && sessionId) {
      if (typeof sessionId !== 'string' || sessionId.length < 10) {
        logger.warn('Invalid session ID format', {
          sessionId,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          message: 'معرف الجلسة غير صحيح'
        });
      }
    }

    // Add metadata for logging
    req.cartContext = {
      userId,
      sessionId,
      isGuest: !userId,
      accessTime: new Date().toISOString()
    };

    next();
  } catch (error) {
    logger.error('Error in cart access validation', {
      error: error.message,
      userId: req.user?.id,
      sessionId: req.sessionId
    });

    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية الوصول'
    });
  }
};

/**
 * Middleware to sanitize and validate cart input data
 */
const sanitizeCartInput = (req, res, next) => {
  try {
    // Trim and sanitize string inputs
    if (req.body.size) {
      req.body.size = req.body.size.trim().toUpperCase();
    }

    // Ensure quantity is a number
    if (req.body.quantity !== undefined) {
      const qty = parseInt(req.body.quantity, 10);
      if (isNaN(qty)) {
        return res.status(400).json({
          success: false,
          message: 'الكمية يجب أن تكون رقماً صحيحاً'
        });
      }
      req.body.quantity = qty;
    }

    // Validate MongoDB ObjectId format for IDs
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (req.body.product && !objectIdRegex.test(req.body.product)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المنتج غير صحيح'
      });
    }

    if (req.body.variant && !objectIdRegex.test(req.body.variant)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المتغير غير صحيح'
      });
    }

    next();
  } catch (error) {
    logger.error('Error in cart input sanitization', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة البيانات المدخلة'
    });
  }
};

/**
 * Middleware to check if cart operations are allowed
 * Can be extended to check user status, payment requirements, etc.
 */
const checkCartOperationAllowed = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    // If user is authenticated, check if account is active
    if (userId && req.user) {
      // Add any user status checks here
      // For example: check if user is banned, email verified, etc.

      // This is a placeholder for future business logic
      // if (req.user.status !== 'active') {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'حسابك غير نشط'
      //   });
      // }
    }

    // Check if operation is allowed based on cart state
    // This could include checks like:
    // - Cart not locked due to pending order
    // - User not having too many failed payment attempts
    // - Geographic restrictions, etc.

    next();
  } catch (error) {
    logger.error('Error in cart operation validation', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية العملية'
    });
  }
};

module.exports = {
  validateCartAccess,
  sanitizeCartInput,
  checkCartOperationAllowed
};
