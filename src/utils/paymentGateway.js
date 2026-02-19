// src/utils/paymentGateway.js
const ZarinpalCheckout = require('zarinpal-checkout');

class PaymentGateway {
  constructor() {
    // Sandbox mode: pass true as second parameter
    // Production mode: pass false
    const isSandbox = process.env.NODE_ENV !== 'production';
    
    this.zarinpal = ZarinpalCheckout.create(
      process.env.ZARINPAL_MERCHANT_ID,
      isSandbox
    );
  }

  async requestPayment({ amount, description, callbackUrl, mobile = '09150039045', email }) {
    try {
      // Amount must be in Rials (Toman * 10)
      const amountInRials = amount * 10;
      
      const response = await this.zarinpal.PaymentRequest({
        Amount: amountInRials,
        CallbackURL: callbackUrl,
        Description: description,
        Email: String(email) || '',
        Mobile:'09150039045',
      });

      
      if (response.status === 100) {
        return {
          success: true,
          authority: response.authority,
          paymentUrl: response.url
        };
      } else {
        return {
          success: false,
          message: `ZarinPal error: ${response.status}`
        };
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message || 'Payment request failed'
      };
    }
  }

  async verifyPayment(authority, amount) {
    try {
      // Amount must be in Rials
      const amountInRials = amount * 10;

      const response = await this.zarinpal.PaymentVerification({
        Amount: amountInRials,
        Authority: authority
      });

      if (response.status === 100 || response.status === 101) {
        return {
          success: true,
          refId: response.refId || response.RefID || null,
          cardPan: response.CardPan || null,
          cardHash: response.CardHash || null
        };
      } else {
        return {
          success: false,
          message: `Verification failed: ${response.status}`
        };
      }
    } catch (error) {
      
      return {
        success: false,
        message: error.message || 'Payment verification failed'
      };
    }
  }
}

// Singleton instance
const paymentGateway = new PaymentGateway();

module.exports = paymentGateway;