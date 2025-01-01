const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

class PaymentService {
    async createRazorpayOrder(amount, orderId) {
        try {
            const options = {
                amount: amount * 100, 
                currency: 'INR',
                receipt: orderId,
                payment_capture: 1
            };

            const order = await razorpay.orders.create(options);
            return order;
        } catch (error) {
            console.error('Razorpay order creation error:', error);
            throw error;
        }
    }

    verifyRazorpayPayment(paymentId, orderId, signature) {
        const text = `${orderId}|${paymentId}`;
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(text)
            .digest('hex');

        return generated_signature === signature;
    }
}

module.exports = new PaymentService();
