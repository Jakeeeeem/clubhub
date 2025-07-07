class StripePaymentService {
    constructor() {
        // Use demo key for now - replace with your real key later
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
                console.log('✅ Stripe initialized');
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
    
    // Demo payment function - simulates real payment
    async processPayment(amount, description) {
        console.log('💳 Processing payment:', { amount, description });
        
        if (!this.stripe || !this.card) {
            throw new Error('Payment form not initialized');
        }
        
        try {
            // Simulate payment processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // For demo purposes, always return success
            // In real implementation, this would call your backend
            const paymentResult = {
                id: 'pi_demo_' + Date.now(),
                status: 'succeeded',
                amount: amount * 100,
                currency: 'gbp',
                created: Math.floor(Date.now() / 1000)
            };
            
            console.log('✅ Payment processed successfully');
            return paymentResult;
            
        } catch (error) {
            console.error('❌ Payment failed:', error);
            throw error;
        }
    }
}

// Create global instance
window.stripeService = new StripePaymentService();

// Payment modal creation function
function createPaymentModal(amount, description, onSuccess) {
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
                <h2>💳 Make Payment</h2>
                <button class="close" onclick="closeStripeModal()">&times;</button>
            </div>
            
            <div style="padding: 1rem 0;">
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <h3 style="margin: 0 0 0.5rem 0; color: #333;">${description}</h3>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: bold; color: #28a745;">
                        Amount: £${amount.toFixed(2)}
                    </p>
                </div>
                
                <form id="stripe-payment-form">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
                            Card Details
                        </label>
                        <div id="stripe-card-element" style="
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            background: white;
                        ">
                            <!-- Stripe Elements will create form elements here -->
                        </div>
                        <div id="card-errors" style="
                            color: #9e2146;
                            margin-top: 0.5rem;
                            font-size: 0.9rem;
                        "></div>
                    </div>
                    
                    <div style="margin-bottom: 1rem; font-size: 0.9rem; color: #666;">
                        <p>💡 <strong>Demo Mode:</strong> Use test card 4242 4242 4242 4242</p>
                        <p>Any future date and any 3-digit CVC will work.</p>
                    </div>
                    
                    <button type="submit" id="stripe-submit-payment" class="btn btn-primary" style="
                        width: 100%;
                        padding: 12px;
                        font-size: 1rem;
                        background: #28a745;
                        border: none;
                        border-radius: 4px;
                        color: white;
                        cursor: pointer;
                    ">
                        💳 Pay £${amount.toFixed(2)}
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize Stripe form
    setTimeout(() => {
        window.stripeService.createPaymentForm('#stripe-card-element');
    }, 100);
    
    // Handle form submission
    modal.querySelector('#stripe-payment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = document.getElementById('stripe-submit-payment');
        const originalText = submitButton.textContent;
        
        submitButton.disabled = true;
        submitButton.textContent = '⏳ Processing...';
        submitButton.style.background = '#6c757d';
        
        try {
            const result = await window.stripeService.processPayment(amount, description);
            
            // Payment successful
            modal.remove();
            showNotification(`Payment of £${amount.toFixed(2)} successful!`, 'success');
            
            if (onSuccess) {
                onSuccess(result);
            }
            
        } catch (error) {
            console.error('Payment failed:', error);
            showNotification('Payment failed: ' + error.message, 'error');
            
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            submitButton.style.background = '#28a745';
        }
    });
    
    return modal;
}

// Helper function to close payment modal
function closeStripeModal() {
    const modal = document.getElementById('stripePaymentModal');
    if (modal) {
        modal.remove();
    }
}

// Export functions for global use
window.createPaymentModal = createPaymentModal;
window.closeStripeModal = closeStripeModal;

console.log('✅ Stripe service loaded');