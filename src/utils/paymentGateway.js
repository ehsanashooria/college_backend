class PaymentGateway {
  constructor() {
    // Simulated merchant ID
    this.merchantId = process.env.PAYMENT_MERCHANT_ID || "TEST_MERCHANT";
    this.baseUrl =
      process.env.PAYMENT_GATEWAY_URL || "https://sandbox.zarinpal.com";

    // Store pending payments in memory (in production, use database)
    this.pendingPayments = new Map();
  }

  /**
   * Step 1: Request payment (get payment URL)
   * @param {Object} params - Payment parameters
   * @returns {Object} - Payment URL and authority code
   */
  async requestPayment({ amount, description, callbackUrl, mobile, email }) {
    try {
      // Validate amount (must be at least 1000 Tomans in real ZarinPal)
      if (amount < 1000) {
        throw new Error("مقدار پرداخت نمی تواند زیر 1000 تومان باشد");
      }

      // SIMULATION: Generate fake authority code
      const authority = this.generateAuthority();

      // SIMULATION: Store payment info
      this.pendingPayments.set(authority, {
        amount,
        description,
        callbackUrl,
        mobile,
        email,
        status: "pending",
        createdAt: new Date(),
      });

      // REAL ZARINPAL CODE WOULD BE:
      /*
      const response = await zarinpal.PaymentRequest({
        Amount: amount,
        CallbackURL: callbackUrl,
        Description: description,
        Email: email,
        Mobile: mobile
      });
      
      if (response.status === 100) {
        return {
          success: true,
          authority: response.authority,
          paymentUrl: `https://www.zarinpal.com/pg/StartPay/${response.authority}`
        };
      }
      */

      // SIMULATION: Return mock payment URL
      return {
        success: true,
        authority,
        // paymentUrl: `${this.baseUrl}/pg/StartPay/${authority}`,
        // For testing: add test payment link
        testPaymentUrl: `${process.env.FRONTEND_URL}/payment/test?authority=${authority}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "درخواست پرداخت ناموفق",
      };
    }
  }

  /**
   * Step 2: Verify payment after callback
   * @param {String} authority - Payment authority code
   * @param {Number} amount - Original payment amount
   * @returns {Object} - Verification result
   */
  async verifyPayment(authority, amount) {
    try {
      // SIMULATION: Check if payment exists
      const payment = this.pendingPayments.get(authority);

      if (!payment) {
        return {
          success: false,
          message: "رکورد پرداخت یافت نشد",
        };
      }

      // SIMULATION: Check amount match
      if (payment.amount !== amount) {
        return {
          success: false,
          message: "مقدار پرداخت نامعتبر است",
        };
      }

      // SIMULATION: Auto-verify (in real scenario, user would pay on ZarinPal)
      // For testing, we'll accept all payments
      const refId = this.generateRefId();

      // Update payment status
      payment.status = "verified";
      payment.refId = refId;
      payment.verifiedAt = new Date();

      // REAL ZARINPAL CODE WOULD BE:
      /*
      const response = await zarinpal.PaymentVerification({
        Amount: amount,
        Authority: authority
      });

      if (response.status === 100 || response.status === 101) {
        return {
          success: true,
          refId: response.RefID,
          cardPan: response.CardPan,
          cardHash: response.CardHash
        };
      }
      */

      return {
        success: true,
        refId,
        message: "پرداخت معتبر است",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "پرداخت نامعتبر است",
      };
    }
  }

  /**
   * Simulate successful payment (for testing only)
   * This allows testing without actual payment
   */
  async simulateSuccessfulPayment(authority) {
    const payment = this.pendingPayments.get(authority);

    if (!payment) {
      return { success: false, message: "رکورد پرداخت یافت نشد" };
    }

    const refId = this.generateRefId();
    payment.status = "paid";
    payment.refId = refId;
    payment.paidAt = new Date();

    return {
      success: true,
      authority,
      refId,
      message: "پرداخت شبیه سازی شده با موفقیت انجام شد",
    };
  }

  // Helper: Generate fake authority code
  generateAuthority() {
    return (
      "A" + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()
    );
  }

  // Helper: Generate fake reference ID
  generateRefId() {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  }

  // Helper: Get payment info
  getPaymentInfo(authority) {
    return this.pendingPayments.get(authority);
  }
}

// Singleton instance
const paymentGateway = new PaymentGateway();

module.exports = paymentGateway;