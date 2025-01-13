document.addEventListener('DOMContentLoaded', function() {
    // Update countdown timers
    function updateCountdowns() {
        document.querySelectorAll('.offer-timer').forEach(timer => {
            const endDate = new Date(timer.dataset.end);
            const now = new Date();
            const diff = endDate - now;

            if (diff <= 0) {
                timer.innerHTML = 'Offer expired';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            let countdownText = '';
            if (days > 0) countdownText += `${days}d `;
            if (hours > 0) countdownText += `${hours}h `;
            countdownText += `${minutes}m`;

            timer.querySelector('.countdown').textContent = countdownText;
        });
    }

    function showNewOfferNotification(offer) {
        const notification = document.createElement('div');
        notification.className = 'offer-notification animate__animated animate__fadeInRight';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>New Offer Alert! 🎉</h4>
                <p>${offer.categoryName}: ${offer.discountType === 'percentage' ? 
                    `${offer.discountValue}% OFF` : 
                    `₹${offer.discountValue} OFF`}</p>
                ${offer.maxDiscountAmount ? 
                    `<p class="small">Up to ₹${offer.maxDiscountAmount}</p>` : ''}
                <p class="small">Valid till ${new Date(offer.endDate).toLocaleDateString()}</p>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('animate__fadeOutRight');
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }

    let knownOffers = new Set();
    function checkNewOffers() {
        document.querySelectorAll('.offer-banner-item').forEach(offer => {
            const offerId = offer.dataset.offerId;
            if (!knownOffers.has(offerId)) {
                knownOffers.add(offerId);
                if (knownOffers.size > 1) {
                    const offerData = {
                        categoryName: offer.querySelector('.offer-category-name').textContent,
                        discountType: offer.querySelector('.offer-discount').textContent.includes('%') ? 
                            'percentage' : 'fixed',
                        discountValue: parseInt(offer.querySelector('.offer-discount').textContent),
                        maxDiscountAmount: offer.querySelector('.offer-max-discount')?.textContent.match(/\d+/)[0],
                        endDate: offer.querySelector('.offer-timer')?.dataset.end
                    };
                    showNewOfferNotification(offerData);
                }
            }
        });
    }

    updateCountdowns();
    checkNewOffers();
    setInterval(updateCountdowns, 60000);
    setInterval(checkNewOffers, 300000);
});
