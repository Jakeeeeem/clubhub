class StripePaymentService {
    constructor() {
        // Your actual Stripe TEST publishable key
        this.stripePublishableKey = 'pk_test_51RZtoWRthpGbefAacO4lfXR7P1iAU59Wqj61yPurK97M9pcDanYFsOuF3AjwJRGwYF8mCrPm2xSZqtxufDDkpUwh00T5G9GJKj';
        this.stripe = null;
        this.elements = null;
        this.card = null;
        
        this.initializeStripe();
    }
    
    async initializeStripe() {
        try {
            if (typeof Stripe !== 'undefined') {
                this.stripe = Stripe(this.stripePublishableKey);
                console.log('✅ Stripe initialized with your test key');
            } else {
                console.warn('⚠️ Stripe not loaded - ensure script is included');
            }
        } catch (error) {
            console.error('❌ Stripe initialization failed:', error);
        }
    }
    
    createPaymentForm(containerId) {
        if (!this.stripe) {
            console.error('Stripe not initialized');
            return;
        }
        
        this.elements = this.stripe.elements();
        
        const style = {
            base: {
                fontSize: '16px',
                color: '#424770',
                fontFamily: 'Arial, sans-serif',
                '::placeholder': {
                    color: '#aab7c4',
                },
                padding: '12px',
            },
            invalid: {
                color: '#9e2146',
            },
        };
        
        this.card = this.elements.create('card', { 
            style: style,
            hidePostalCode: true
        });
        
        this.card.mount(containerId);
        
        this.card.on('change', ({ error }) => {
            const displayError = document.getElementById('card-errors');
            if (displayError) {
                if (error) {
                    displayError.textContent = error.message;
                    displayError.style.color = '#9e2146';
                } else {
                    displayError.textContent = '';
                }
            }
        });
        
        console.log('💳 Payment form created');
    }
    
    // REAL payment function - processes actual payments
    async processPayment(amount, description, metadata = {}) {
        console.log('💳 Processing REAL payment:', { amount, description });
        
        if (!this.stripe || !this.card) {
            throw new Error('Payment form not initialized');
        }
        
        try {
            // Create payment intent via your backend
            const intentResponse = await apiService.createPaymentIntent({
                amount: amount,
                description: description,
                metadata: metadata
            });
            
            if (!intentResponse.clientSecret) {
                throw new Error('Failed to create payment intent');
            }
            
            console.log('💳 Confirming payment with Stripe...');
            
            // Confirm payment with Stripe
            const { error, paymentIntent } = await this.stripe.confirmCardPayment(
                intentResponse.clientSecret,
                {
                    payment_method: {
                        card: this.card,
                        billing_details: {
                            name: metadata.customerName || 'Customer',
                            email: metadata.customerEmail || '',
                        },
                    }
                }
            );
            
            if (error) {
                console.error('❌ Stripe payment error:', error);
                throw new Error(error.message);
            }
            
            if (paymentIntent.status === 'succeeded') {
                console.log('✅ Payment succeeded:', paymentIntent.id);
                
                return {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    created: paymentIntent.created
                };
            } else {
                throw new Error(`Payment failed with status: ${paymentIntent.status}`);
            }
            
        } catch (error) {
            console.error('❌ Payment processing failed:', error);
            throw error;
        }
    }
    
    // Process payment for specific payment record
    async processPaymentRecord(paymentId, description, metadata = {}) {
        console.log('💳 Processing payment for record:', paymentId);
        
        try {
            // Create payment intent for this specific payment
            const intentResponse = await apiService.createPaymentIntent({
                paymentId: paymentId,
                metadata: {
                    paymentId: paymentId,
                    ...metadata
                }
            });
            
            if (!intentResponse.clientSecret) {
                throw new Error('Failed to create payment intent');
            }
            
            // Confirm payment with Stripe
            const { error, paymentIntent } = await this.stripe.confirmCardPayment(
                intentResponse.clientSecret,
                {
                    payment_method: {
                        card: this.card,
                        billing_details: {
                            name: metadata.customerName || 'Customer',
                            email: metadata.customerEmail || '',
                        },
                    }
                }
            );
            
            if (error) {
                throw new Error(error.message);
            }
            
            if (paymentIntent.status === 'succeeded') {
                // Confirm payment in backend
                await apiService.confirmPayment(paymentIntent.id, paymentId);
                
                return {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    amount: paymentIntent.amount_received,
                    paymentId: paymentId
                };
            } else {
                throw new Error(`Payment failed with status: ${paymentIntent.status}`);
            }
            
        } catch (error) {
            console.error('❌ Payment record processing failed:', error);
            throw error;
        }
    }
    
    // Create payment element for React/modern frameworks
    createElement(type = 'card', options = {}) {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }
        
        if (!this.elements) {
            this.elements = this.stripe.elements();
        }
        
        const defaultOptions = {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: 'antialiased',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
                invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a'
                }
            },
            ...options
        };
        
        return this.elements.create(type, defaultOptions);
    }
    
    // Validate card details
    async validateCard() {
        if (!this.card) {
            throw new Error('Card element not created');
        }
        
        return new Promise((resolve) => {
            this.card.on('change', ({ error, complete }) => {
                resolve({
                    isValid: complete && !error,
                    error: error ? error.message : null
                });
            });
        });
    }
    
    // Get payment methods for customer
    async getPaymentMethods(customerId) {
        try {
            const response = await apiService.request('/payments/payment-methods', {
                method: 'GET',
                headers: {
                    'X-Customer-ID': customerId
                }
            });
            return response.paymentMethods;
        } catch (error) {
            console.error('Failed to get payment methods:', error);
            return [];
        }
    }
    
    // Save payment method for future use
    async savePaymentMethod(paymentMethodId, customerId) {
        try {
            return await apiService.request('/payments/save-payment-method', {
                method: 'POST',
                body: JSON.stringify({
                    paymentMethodId,
                    customerId
                })
            });
        } catch (error) {
            console.error('Failed to save payment method:', error);
            throw error;
        }
    }
    
    // Process refund
    async processRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
        try {
            return await apiService.request('/payments/refund', {
                method: 'POST',
                body: JSON.stringify({
                    paymentIntentId,
                    amount,
                    reason
                })
            });
        } catch (error) {
            console.error('Failed to process refund:', error);
            throw error;
        }
    }
    
    // Create subscription for recurring payments
    async createSubscription(customerId, priceId, metadata = {}) {
        try {
            return await apiService.request('/payments/create-subscription', {
                method: 'POST',
                body: JSON.stringify({
                    customerId,
                    priceId,
                    metadata
                })
            });
        } catch (error) {
            console.error('Failed to create subscription:', error);
            throw error;
        }
    }
    
    // Cancel subscription
    async cancelSubscription(subscriptionId) {
        try {
            return await apiService.request(`/payments/cancel-subscription/${subscriptionId}`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            throw error;
        }
    }
    
    // Handle 3D Secure authentication
    async handle3DSecure(paymentIntent) {
        if (paymentIntent.status === 'requires_action') {
            const { error, paymentIntent: updatedPaymentIntent } = await this.stripe.confirmCardPayment(
                paymentIntent.client_secret
            );
            
            if (error) {
                throw new Error(error.message);
            }
            
            return updatedPaymentIntent;
        }
        
        return paymentIntent;
    }
    
    // Format amount for display
    formatAmount(amount, currency = 'gbp') {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount);
    }
    
    // Validate amount
    validateAmount(amount, currency = 'gbp') {
        const minAmounts = {
            'gbp': 0.30,
            'usd': 0.50,
            'eur': 0.50
        };
        
        const minAmount = minAmounts[currency.toLowerCase()] || 0.50;
        
        if (amount < minAmount) {
            throw new Error(`Minimum amount is ${this.formatAmount(minAmount, currency)}`);
        }
        
        if (amount > 999999.99) {
            throw new Error('Amount too large');
        }
        
        return true;
    }
    
    // Error handling
    handleStripeError(error) {
        console.error('Stripe Error:', error);
        
        switch (error.code) {
            case 'card_declined':
                return 'Your card was declined. Please try a different payment method.';
            case 'expired_card':
                return 'Your card has expired. Please use a different card.';
            case 'incorrect_cvc':
                return 'Your card\'s security code is incorrect. Please try again.';
            case 'processing_error':
                return 'An error occurred while processing your card. Please try again.';
            case 'incorrect_number':
                return 'Your card number is incorrect. Please try again.';
            default:
                return error.message || 'An unexpected error occurred. Please try again.';
        }
    }
    
    // Cleanup resources
    destroy() {
        if (this.card) {
            this.card.destroy();
            this.card = null;
        }
        
        if (this.elements) {
            this.elements = null;
        }
    }
}

// Enhanced payment modal creation function
function createPaymentModal(amount, description, onSuccess, onError = null) {
    // Remove existing modal if present
    const existingModal = document.getElementById('stripePaymentModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'stripePaymentModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>💳 Secure Payment</h2>
                <button class="close" onclick="closeStripeModal()">&times;</button>
            </div>
            
            <div style="padding: 1rem 0;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
                    <h3 style="margin: 0 0 0.5rem 0;">${description}</h3>
                    <p style="margin: 0; font-size: 1.5rem; font-weight: bold;">
                        £${amount.toFixed(2)}
                    </p>
                </div>
                
                <form id="stripe-payment-form">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
                            Card Details
                        </label>
                        <div id="stripe-card-element" style="
                            padding: 12px;
                            border: 2px solid #e9ecef;
                            border-radius: 8px;
                            background: white;
                            transition: border-color 0.3s ease;
                        ">
                            <!-- Stripe Elements will create form elements here -->
                        </div>
                        <div id="card-errors" style="
                            color: #dc3545;
                            margin-top: 0.5rem;
                            font-size: 0.9rem;
                            min-height: 1.2rem;
                        "></div>
                    </div>
                    
                    <div style="background: #e8f5e8; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem;">
                        <p style="margin: 0; color: #155724;"><strong>🔒 Secure Payment</strong></p>
                        <p style="margin: 0.5rem 0 0 0; color: #155724;">Your payment is processed securely by Stripe. We never store your card details.</p>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem;">
                        <p style="margin: 0; color: #856404;"><strong>🧪 Test Mode</strong></p>
                        <p style="margin: 0.5rem 0 0 0; color: #856404;">Use test card: <strong>4242 4242 4242 4242</strong> with any future date and CVC.</p>
                    </div>
                    
                    <button type="submit" id="stripe-submit-payment" class="btn btn-primary" style="
                        width: 100%;
                        padding: 15px;
                        font-size: 1.1rem;
                        background: linear-gradient(135deg, #28a745, #20c997);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                        font-weight: bold;
                        transition: all 0.3s ease;
                    ">
                        <span id="button-text">💳 Pay £${amount.toFixed(2)}</span>
                        <div id="button-spinner" style="
                            display: none;
                            width: 20px;
                            height: 20px;
                            border: 2px solid #ffffff;
                            border-top: 2px solid transparent;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto;
                        "></div>
                    </button>
                </form>
                
                <div style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #666;">
                    <p>Powered by <strong>Stripe</strong> • PCI DSS Compliant</p>
                </div>
            </div>
        </div>
        
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            #stripe-submit-payment:hover:not(:disabled) {
                background: linear-gradient(135deg, #20c997, #17a2b8);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            }
            #stripe-submit-payment:disabled {
                background: #6c757d !important;
                cursor: not-allowed !important;
                transform: none !important;
                box-shadow: none !important;
            }
        </style>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize Stripe form after a short delay
    setTimeout(() => {
        try {
            window.stripeService.createPaymentForm('#stripe-card-element');
        } catch (error) {
            console.error('Failed to create payment form:', error);
            if (onError) {
                onError(error);
            }
        }
    }, 100);
    
    // Handle form submission
    modal.querySelector('#stripe-payment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = document.getElementById('stripe-submit-payment');
        const buttonText = document.getElementById('button-text');
        const buttonSpinner = document.getElementById('button-spinner');
        
        // Disable button and show loading state
        submitButton.disabled = true;
        buttonText.style.display = 'none';
        buttonSpinner.style.display = 'block';
        
        try {
            // Validate amount
            window.stripeService.validateAmount(amount);
            
            // Process payment
            const result = await window.stripeService.processPayment(amount, description, {
                customerName: AppState.currentUser?.first_name + ' ' + AppState.currentUser?.last_name || 'Customer',
                customerEmail: AppState.currentUser?.email || ''
            });
            
            // Payment successful
            modal.remove();
            showNotification(`Payment of £${amount.toFixed(2)} successful!`, 'success');
            
            if (onSuccess) {
                onSuccess(result);
            }
            
        } catch (error) {
            console.error('Payment failed:', error);
            const errorMessage = window.stripeService.handleStripeError(error);
            
            const errorDiv = document.getElementById('card-errors');
            if (errorDiv) {
                errorDiv.textContent = errorMessage;
                errorDiv.style.color = '#dc3545';
            }
            
            if (onError) {
                onError(error);
            }
        } finally {
            // Re-enable button and restore original state
            submitButton.disabled = false;
            buttonText.style.display = 'inline';
            buttonSpinner.style.display = 'none';
        }
    });
    
    return modal;
}

// Enhanced payment modal for specific payment records
function createPaymentRecordModal(payment, onSuccess, onError = null) {
    return createPaymentModal(
        payment.amount,
        payment.description,
        async (result) => {
            try {
                // Confirm the specific payment record
                await apiService.confirmPayment(result.id, payment.id);
                if (onSuccess) {
                    onSuccess({ ...result, paymentId: payment.id });
                }
            } catch (error) {
                if (onError) {
                    onError(error);
                }
            }
        },
        onError
    );
}

// Subscription payment modal
function createSubscriptionModal(subscriptionData, onSuccess, onError = null) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'subscriptionModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>🔄 Set Up Subscription</h2>
                <button class="close" onclick="closeModal('subscriptionModal')">&times;</button>
            </div>
            
            <div style="padding: 1rem 0;">
                <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
                    <h3 style="margin: 0 0 0.5rem 0;">${subscriptionData.name}</h3>
                    <p style="margin: 0; font-size: 1.5rem; font-weight: bold;">
                        £${subscriptionData.amount.toFixed(2)}<span style="font-size: 1rem;">/${subscriptionData.interval}</span>
                    </p>
                </div>
                
                <form id="subscription-form">
                    <div id="subscription-card-element" style="
                        padding: 12px;
                        border: 2px solid #e9ecef;
                        border-radius: 8px;
                        background: white;
                        margin-bottom: 1rem;
                    "></div>
                    <div id="subscription-errors" style="color: #dc3545; margin-bottom: 1rem;"></div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%; padding: 15px;">
                        🔄 Subscribe for £${subscriptionData.amount.toFixed(2)}/${subscriptionData.interval}
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize subscription form
    setTimeout(() => {
        const cardElement = window.stripeService.createElement('card');
        cardElement.mount('#subscription-card-element');
        
        modal.querySelector('#subscription-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const result = await window.stripeService.createSubscription(
                    subscriptionData.customerId,
                    subscriptionData.priceId,
                    subscriptionData.metadata || {}
                );
                
                modal.remove();
                showNotification('Subscription created successfully!', 'success');
                
                if (onSuccess) {
                    onSuccess(result);
                }
                
            } catch (error) {
                const errorDiv = document.getElementById('subscription-errors');
                if (errorDiv) {
                    errorDiv.textContent = window.stripeService.handleStripeError(error);
                }
                
                if (onError) {
                    onError(error);
                }
            }
        });
    }, 100);
    
    return modal;
}

// Helper function to close payment modal
function closeStripeModal() {
    const modal = document.getElementById('stripePaymentModal');
    if (modal) {
        // Clean up Stripe elements
        if (window.stripeService) {
            window.stripeService.destroy();
        }
        modal.remove();
    }
}

// Helper function to close any modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Payment status checker for long-running payments
function checkPaymentStatus(paymentIntentId, onStatusChange) {
    const interval = setInterval(async () => {
        try {
            const status = await apiService.request(`/payments/status/${paymentIntentId}`);
            
            onStatusChange(status);
            
            if (status.status === 'succeeded' || status.status === 'failed') {
                clearInterval(interval);
            }
        } catch (error) {
            console.error('Failed to check payment status:', error);
            clearInterval(interval);
        }
    }, 2000);
    
    return interval;
}

// Create and export global Stripe service instance
const stripeService = new StripePaymentService();

// Make it available globally
window.stripeService = stripeService;
window.createPaymentModal = createPaymentModal;
window.createPaymentRecordModal = createPaymentRecordModal;
window.createSubscriptionModal = createSubscriptionModal;
window.closeStripeModal = closeStripeModal;
window.closeModal = closeModal;
window.checkPaymentStatus = checkPaymentStatus;

console.log('✅ Complete Stripe service loaded with REAL payment processing using your test keys');

export default stripeService;