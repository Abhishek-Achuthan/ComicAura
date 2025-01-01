const paypal = require('paypal-rest-sdk');

paypal.configure({
    mode: process.env.PAYPAL_MODE || 'sandbox',
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET
});

class PayPalService {
    async createPayment(amount, orderId) {
        const create_payment_json = {
            intent: "sale",
            payer: {
                payment_method: "paypal"
            },
            redirect_urls: {
                return_url: `${process.env.BASE_URL}/order/success`,
                cancel_url: `${process.env.BASE_URL}/order/cancel`
            },
            transactions: [{
                item_list: {
                    items: [{
                        name: `Order #${orderId}`,
                        sku: orderId,
                        price: amount.toString(),
                        currency: "USD",
                        quantity: 1
                    }]
                },
                amount: {
                    currency: "USD",
                    total: amount.toString()
                },
                description: `Payment for order #${orderId}`
            }]
        };

        return new Promise((resolve, reject) => {
            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    reject(error);
                } else {
                    resolve(payment);
                }
            });
        });
    }

    async executePayment(paymentId, payerId) {
        const execute_payment_json = {
            payer_id: payerId
        };

        return new Promise((resolve, reject) => {
            paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                if (error) {
                    reject(error);
                } else {
                    resolve(payment);
                }
            });
        });
    }
}

module.exports = new PayPalService();
